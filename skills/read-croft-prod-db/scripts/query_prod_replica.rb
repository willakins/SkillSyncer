#!/usr/bin/env ruby

require 'open3'
require 'optparse'
require 'net/http'
require 'socket'
require 'uri'

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
DEFAULT_CONNECT_TIMEOUT_SECONDS = 8
DOCUMENTED_REPLICA_SERVICE = 'db-ro-postgresql-nyc3-18224'
READ_ONLY_SERVICE_PATTERN = /(?:\A|\b|[-_])(?:ro|read[-_]?only|replica)(?:\z|\b|[-_])/i
PUBLIC_IP_ENDPOINTS = [
  'https://api.ipify.org',
  'https://icanhazip.com',
  'https://ifconfig.me/ip'
].freeze


def strip_sql_comments(sql)
  sql
    .gsub(%r{/\*.*?\*/}m, ' ')
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

def connection_target(options)
  if ENV['CROFT_REPLICA_DATABASE_CONNECTION_POOL_URL'].to_s != ''
    [ENV.fetch('CROFT_REPLICA_DATABASE_CONNECTION_POOL_URL'), 'env:CROFT_REPLICA_DATABASE_CONNECTION_POOL_URL']
  elsif options[:service].to_s != ''
    ["service=#{options.fetch(:service)}", 'flag:--service']
  elsif ENV['CROFT_READ_ONLY_PGSERVICE'].to_s != ''
    ["service=#{ENV.fetch('CROFT_READ_ONLY_PGSERVICE')}", 'env:CROFT_READ_ONLY_PGSERVICE']
  elsif ENV['PGSERVICE'].to_s != ''
    ["service=#{ENV.fetch('PGSERVICE')}", 'env:PGSERVICE']
  else
    raise ArgumentError,
          'Missing connection config. Set CROFT_REPLICA_DATABASE_CONNECTION_POOL_URL, '\
          'pass --service, set CROFT_READ_ONLY_PGSERVICE, or set PGSERVICE.'
  end
end

def service_config(service_name)
  service_file = ENV.fetch('PGSERVICEFILE', File.join(Dir.home, '.pg_service.conf'))
  return {} unless File.file?(service_file)

  current_service = nil
  config = {}

  File.readlines(service_file).each do |line|
    stripped = line.strip
    next if stripped.empty? || stripped.start_with?('#')

    if stripped.match?(/\A\[.+\]\z/)
      current_service = stripped.delete_prefix('[').delete_suffix(']')
      next
    end

    next unless current_service == service_name
    next unless stripped.include?('=')

    key, value = stripped.split('=', 2)
    config[key.strip] = value.strip
  end

  config
end

def connection_details(connection)
  if connection.start_with?('service=')
    service_name = connection.delete_prefix('service=')
    config = service_config(service_name)

    return {
      service: service_name,
      host: config['host'],
      port: Integer(config.fetch('port', 5432)),
      dbname: config['dbname'],
      user: config['user']
    }
  end

  uri = URI(connection)
  {
    host: uri.host,
    port: uri.port || 5432,
    dbname: uri.path&.delete_prefix('/'),
    user: uri.user
  }
rescue ArgumentError, URI::InvalidURIError
  {}
end

def validate_read_only_target!(connection:, connection_source:)
  details = connection_details(connection)

  if details[:service]
    service_name = details.fetch(:service)
    return if service_name == DOCUMENTED_REPLICA_SERVICE || service_name.match?(READ_ONLY_SERVICE_PATTERN)

    raise ArgumentError,
          "Refusing service #{service_name.inspect}; use the documented read-only replica "\
          "service #{DOCUMENTED_REPLICA_SERVICE.inspect} or a service name that clearly indicates read-only access."
  end

  host = details[:host].to_s
  return if host.empty?
  return if host.include?(DOCUMENTED_REPLICA_SERVICE) || host.match?(READ_ONLY_SERVICE_PATTERN)

  warn "Warning: #{connection_source} host #{host.inspect} is not clearly identifiable as the documented read-only replica; relying on default_transaction_read_only=on."
end

def tcp_reachable?(host:, port:, timeout_seconds:)
  Socket.tcp(host, port, connect_timeout: timeout_seconds) { true }
rescue IOError, SocketError, SystemCallError
  false
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

def diagnose_connection(connection:, connection_source:, timeout_seconds:, verbose: true, output: $stdout)
  details = connection_details(connection)

  if verbose
    output.puts "connection_source=#{connection_source}"
    output.puts "service=#{details[:service]}" if details[:service]
    output.puts "host=#{details[:host] || 'unknown'}"
    output.puts "port=#{details[:port] || 'unknown'}"
    output.puts "dbname=#{details[:dbname] || 'unknown'}"
    output.puts "user=#{details[:user] || 'unknown'}"
    output.puts "connect_timeout_seconds=#{timeout_seconds}"
    output.puts "public_ip=#{current_public_ip(timeout_seconds:) || 'unknown'}"
  end

  unless details[:host] && details[:port]
    output.puts 'tcp_reachable=unknown'
    output.puts 'diagnosis=Could not determine host/port from the selected connection config.'
    return false
  end

  reachable = tcp_reachable?(host: details.fetch(:host), port: details.fetch(:port), timeout_seconds:)
  output.puts "tcp_reachable=#{reachable}" if verbose || !reachable

  unless reachable
    ip = current_public_ip(timeout_seconds:) || 'unknown'
    output.puts "your ip: #{ip} is not trusted by the database. Please add it as a trusted source"
    output.puts 'diagnosis=TCP connection failed before authentication. Check VPN/network access, DigitalOcean trusted sources/firewall rules, or whether the configured replica host is stale.'
  end

  reachable
end

def psql_args(connection:, format:)
  args = ['psql', connection, '-v', 'ON_ERROR_STOP=1', '-X', '-P', 'pager=off']

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

options = {
  format: 'aligned',
  statement_timeout_ms: 15_000,
  connect_timeout_seconds: DEFAULT_CONNECT_TIMEOUT_SECONDS,
  service: nil,
  sql: nil,
  file: nil,
  dry_run: false,
  diagnose: false
}

begin
  OptionParser.new do |parser|
    parser.banner = 'Usage: query_prod_replica.rb [options]'

    parser.on('--sql SQL', 'SQL query to run') { |value| options[:sql] = value }
    parser.on('--file PATH', 'Read SQL from file') { |value| options[:file] = value }
    parser.on('--service NAME', 'Replica service name to use when URL env var is absent') { |value| options[:service] = value }
    parser.on('--format FORMAT', 'aligned, csv, or tsv') { |value| options[:format] = value }
    parser.on('--statement-timeout-ms N', Integer, 'Statement timeout in milliseconds') do |value|
      options[:statement_timeout_ms] = value
    end
    parser.on('--connect-timeout-seconds N', Integer, 'Connection timeout in seconds') do |value|
      options[:connect_timeout_seconds] = value
    end
    parser.on('--dry-run', 'Validate query and connection selection without executing') { options[:dry_run] = true }
    parser.on('--diagnose', 'Check selected connection config and TCP reachability without running SQL') do
      options[:diagnose] = true
    end
  end.parse!

  if options[:diagnose]
    raise ArgumentError, 'Do not pass --sql or --file with --diagnose.' if options.values_at(:sql, :file).compact.any?
  elsif options.values_at(:sql, :file).compact.size != 1
    raise ArgumentError, 'Pass exactly one of --sql or --file.'
  end

  connection, connection_source = connection_target(options)
  validate_read_only_target!(connection:, connection_source:)

  if options[:diagnose]
    exit(diagnose_connection(
      connection:,
      connection_source:,
      timeout_seconds: options.fetch(:connect_timeout_seconds),
      verbose: true,
      output: $stdout
    ) ? 0 : 2)
  end

  sql = if options[:file]
          File.read(options.fetch(:file))
        else
          options.fetch(:sql)
        end

  normalized_sql = validate_sql!(sql)

  if options[:dry_run]
    puts "validated=true"
    puts "connection_source=#{connection_source}"
    puts "format=#{options[:format]}"
    puts "statement_timeout_ms=#{options[:statement_timeout_ms]}"
    puts "sql=#{normalized_sql}"
    exit 0
  end

  env = {
    'PGAPPNAME' => 'codex-read-croft-prod-db',
    'PGCONNECT_TIMEOUT' => ENV.fetch('PGCONNECT_TIMEOUT', options.fetch(:connect_timeout_seconds).to_s),
    'PGOPTIONS' => "-c default_transaction_read_only=on -c statement_timeout=#{options[:statement_timeout_ms]}"
  }

  reachable = diagnose_connection(
    connection:,
    connection_source:,
    timeout_seconds: options.fetch(:connect_timeout_seconds),
    verbose: false,
    output: $stderr
  )
  exit 2 unless reachable

  stdout, stderr, status = Open3.capture3(
    env,
    *psql_args(connection:, format: options.fetch(:format)),
    '-c',
    normalized_sql
  )

  $stdout.print(stdout)

  exit 0 if status.success?

  warn stderr
  exit status.exitstatus || 1
rescue StandardError => e
  warn "Error: #{e.message}"
  exit 1
end
