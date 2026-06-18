#!/usr/bin/env ruby
# frozen_string_literal: true

require 'net/http'
require 'open3'
require 'optparse'
require 'socket'
require 'uri'

DEFAULT_HOST = 'db-postgresql-nyc3-99914-do-user-13471786-0.b.db.ondigitalocean.com'
DEFAULT_PORT = 25_060
DEFAULT_DATABASE = 'defaultdb'
DEFAULT_USER = 'doadmin'
DEFAULT_SSLMODE = 'require'
DEFAULT_CONNECT_TIMEOUT_SECONDS = 8
DEFAULT_STATEMENT_TIMEOUT_MS = 15_000
ENV_FILES = [
  File.join(Dir.home, '.config/croft/staging-db.env'),
  '/tmp/croft-staging-db.env'
].freeze
PUBLIC_IP_ENDPOINTS = [
  'https://api.ipify.org',
  'https://icanhazip.com',
  'https://ifconfig.me/ip'
].freeze
FORBIDDEN_SQL = /
  \b(
    insert|update|delete|merge|upsert|
    create|alter|drop|truncate|
    grant|revoke|comment|
    copy|call|do|
    vacuum|analyze|reindex|refresh|
    lock|discard|listen|notify|unlisten|
    set\s+role|set\s+session|reset
  )\b
/ix
ALLOWED_START = /\A(?:select|with|show|explain)\b/i

def load_env_files
  ENV_FILES.each do |path|
    next unless File.file?(path)

    File.readlines(path).each do |line|
      stripped = line.strip
      next if stripped.empty? || stripped.start_with?('#') || !stripped.include?('=')

      key, value = stripped.sub(/\Aexport\s+/, '').split('=', 2)
      next if key.to_s.strip.empty?

      ENV[key.strip] ||= value.to_s.strip.gsub(/\A['"]|['"]\z/, '')
    end
  end
end

def strip_sql_comments(sql)
  sql.gsub(%r{/\*.*?\*/}m, ' ')
     .lines
     .map { |line| line.sub(/--.*$/, '') }
     .join("\n")
end

def normalize_sql(sql)
  strip_sql_comments(sql).strip.sub(/;\s*\z/, '').strip
end

def validate_sql!(sql)
  normalized_sql = normalize_sql(sql)
  raise ArgumentError, 'SQL is empty.' if normalized_sql.empty?
  raise ArgumentError, 'Only a single statement is allowed.' if normalized_sql.include?(';')
  raise ArgumentError, 'Only SELECT, WITH, SHOW, or EXPLAIN queries are allowed.' unless normalized_sql.match?(ALLOWED_START)
  raise ArgumentError, 'Unsafe SQL detected. This helper is read-only.' if normalized_sql.match?(FORBIDDEN_SQL)

  normalized_sql
end

def parse_database_url(url)
  uri = URI(url)
  params = URI.decode_www_form(uri.query.to_s).to_h
  {
    host: uri.host,
    port: uri.port || DEFAULT_PORT,
    dbname: uri.path.to_s.delete_prefix('/'),
    user: URI.decode_www_form_component(uri.user.to_s),
    password: URI.decode_www_form_component(uri.password.to_s),
    sslmode: params.fetch('sslmode', DEFAULT_SSLMODE),
    source: 'database-url-env'
  }
end

def connection_config
  url = first_present_env('CROFT_STAGING_READONLY_DATABASE_URL', 'CROFT_STAGING_DATABASE_URL')
  return parse_database_url(url) if url

  password = ENV['CROFT_STAGING_DB_PASSWORD'].to_s
  raise ArgumentError, 'Missing staging DB credentials. Set CROFT_STAGING_READONLY_DATABASE_URL, CROFT_STAGING_DATABASE_URL, or CROFT_STAGING_DB_PASSWORD.' if password.empty?

  {
    host: ENV.fetch('CROFT_STAGING_DB_HOST', DEFAULT_HOST),
    port: Integer(ENV.fetch('CROFT_STAGING_DB_PORT', DEFAULT_PORT)),
    dbname: ENV.fetch('CROFT_STAGING_DB_NAME', DEFAULT_DATABASE),
    user: ENV.fetch('CROFT_STAGING_DB_USER', DEFAULT_USER),
    password:,
    sslmode: ENV.fetch('CROFT_STAGING_DB_SSLMODE', DEFAULT_SSLMODE),
    source: 'component-env'
  }
end

def first_present_env(*keys)
  keys.each do |key|
    value = ENV[key].to_s
    return value unless value.empty?
  end

  nil
end

def ip_address_like?(value)
  value.match?(/\A(?:\d{1,3}\.){3}\d{1,3}\z/) || value.match?(/\A[0-9a-f:]+\z/i)
end

def current_public_ip(timeout_seconds:)
  PUBLIC_IP_ENDPOINTS.each do |endpoint|
    uri = URI(endpoint)
    response = Net::HTTP.start(
      uri.host,
      uri.port,
      use_ssl: uri.scheme == 'https',
      open_timeout: timeout_seconds,
      read_timeout: timeout_seconds
    ) { |http| http.get(uri.request_uri) }
    ip = response.body.to_s.strip
    return ip if response.is_a?(Net::HTTPSuccess) && ip_address_like?(ip)
  rescue IOError, SocketError, SystemCallError, Timeout::Error
    next
  end

  nil
end

def tcp_reachable?(host:, port:, timeout_seconds:)
  Socket.tcp(host, port, connect_timeout: timeout_seconds) { true }
rescue IOError, SocketError, SystemCallError
  false
end

def diagnose_connection(config:, timeout_seconds:)
  puts "connection_source=#{config.fetch(:source)}"
  puts "host=#{config.fetch(:host)}"
  puts "port=#{config.fetch(:port)}"
  puts "dbname=#{config.fetch(:dbname)}"
  puts "user=#{config.fetch(:user)}"
  puts "sslmode=#{config.fetch(:sslmode)}"
  puts "connect_timeout_seconds=#{timeout_seconds}"
  puts "public_ip=#{current_public_ip(timeout_seconds:) || 'unknown'}"

  reachable = tcp_reachable?(host: config.fetch(:host), port: config.fetch(:port), timeout_seconds:)
  puts "tcp_reachable=#{reachable}"

  unless reachable
    ip = current_public_ip(timeout_seconds:) || 'unknown'
    puts "your ip: #{ip} is not trusted by the database. Please add it as a trusted source"
  end

  reachable
end

def psql_args(config:, format:)
  args = [
    'psql',
    '-h', config.fetch(:host),
    '-p', config.fetch(:port).to_s,
    '-U', config.fetch(:user),
    '-d', config.fetch(:dbname),
    '-v', 'ON_ERROR_STOP=1',
    '-X',
    '-P', 'pager=off'
  ]

  case format
  when 'aligned'
    args
  when 'csv'
    args << '--csv'
  when 'tsv'
    args.concat(['-A', '-F', "\t"])
  else
    raise ArgumentError, "Unsupported format: #{format.inspect}"
  end
end

def wrapped_sql(sql, statement_timeout_ms:)
  <<~SQL
    begin read only;
    set local statement_timeout = #{Integer(statement_timeout_ms)};
    set local default_transaction_read_only = on;
    #{sql};
    commit;
  SQL
end

options = {
  sql: nil,
  file: nil,
  format: 'aligned',
  statement_timeout_ms: DEFAULT_STATEMENT_TIMEOUT_MS,
  connect_timeout_seconds: DEFAULT_CONNECT_TIMEOUT_SECONDS,
  dry_run: false,
  diagnose: false
}

begin
  OptionParser.new do |parser|
    parser.banner = 'Usage: query_staging_db.rb [options]'
    parser.on('--sql SQL', 'SQL query to run') { |value| options[:sql] = value }
    parser.on('--file PATH', 'Read SQL from file') { |value| options[:file] = value }
    parser.on('--format FORMAT', 'aligned, csv, or tsv') { |value| options[:format] = value }
    parser.on('--statement-timeout-ms N', Integer, 'Statement timeout in milliseconds') { |value| options[:statement_timeout_ms] = value }
    parser.on('--connect-timeout-seconds N', Integer, 'Connection timeout in seconds') { |value| options[:connect_timeout_seconds] = value }
    parser.on('--dry-run', 'Validate query and connection selection without executing') { options[:dry_run] = true }
    parser.on('--diagnose', 'Check selected connection config and TCP reachability without running SQL') { options[:diagnose] = true }
  end.parse!

  load_env_files
  config = connection_config
  warn 'Warning: using doadmin for read-only inspection. Rotate/reset this password after the incident.' if config.fetch(:user) == 'doadmin'

  if options[:diagnose]
    raise ArgumentError, 'Do not pass --sql or --file with --diagnose.' if options.values_at(:sql, :file).compact.any?

    exit(diagnose_connection(config:, timeout_seconds: options.fetch(:connect_timeout_seconds)) ? 0 : 2)
  end

  raise ArgumentError, 'Pass exactly one of --sql or --file.' unless options.values_at(:sql, :file).compact.size == 1

  sql = validate_sql!(options[:sql] || File.read(options.fetch(:file)))
  puts "sql=#{sql}" if options[:dry_run]
  puts "connection_source=#{config.fetch(:source)}" if options[:dry_run]
  puts "target=#{config.fetch(:user)}@#{config.fetch(:host)}:#{config.fetch(:port)}/#{config.fetch(:dbname)}" if options[:dry_run]
  exit 0 if options[:dry_run]

  unless tcp_reachable?(host: config.fetch(:host), port: config.fetch(:port), timeout_seconds: options.fetch(:connect_timeout_seconds))
    ip = current_public_ip(timeout_seconds: options.fetch(:connect_timeout_seconds)) || 'unknown'
    warn "your ip: #{ip} is not trusted by the database. Please add it as a trusted source"
    exit 2
  end

  env = {
    'PGPASSWORD' => config.fetch(:password),
    'PGSSLMODE' => config.fetch(:sslmode)
  }
  args = psql_args(config:, format: options.fetch(:format))
  stdout, stderr, status = Open3.capture3(env, *args, stdin_data: wrapped_sql(sql, statement_timeout_ms: options.fetch(:statement_timeout_ms)))
  warn stderr unless stderr.empty?
  print stdout
  exit status.exitstatus
rescue Errno::ENOENT
  warn 'psql is not installed or not on PATH.'
  exit 127
rescue ArgumentError, KeyError, URI::InvalidURIError => e
  warn "error=#{e.message}"
  exit 1
end
