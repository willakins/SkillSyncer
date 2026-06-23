#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "json"
require "optparse"
require "pathname"
require "socket"

class StartRailsServer
  BIND_HOST = "127.0.0.1"
  DEFAULT_PORT = 3000
  BOOT_TIMEOUT_SECONDS = 30

  def initialize(argv)
    @options = { port: nil, hostname: nil }
    parse_options(argv)
    @root = Pathname.pwd.realpath
    @url_hostname = @options[:hostname] || ENV["CODEX_RAILS_URL_HOST"] || default_url_hostname
    @bin_rails = @root.join("bin/rails")
    @tmp_dir = @root.join("tmp/codex")
    @state_file = @tmp_dir.join("start-rails-server.json")
    @server_log = @tmp_dir.join("start-rails-server.log")
    @build_log = @tmp_dir.join("tailwindcss-build.log")
    @pidfile = @root.join("tmp/pids/codex-rails-server.pid")
  end

  def run
    validate_root!
    FileUtils.mkdir_p(@tmp_dir)
    FileUtils.mkdir_p(@pidfile.dirname)

    if (existing_url = running_server_url)
      puts existing_url
      return
    end

    ensure_pidfile_is_usable!
    port = @options[:port] || next_free_port

    build_tailwind!

    pid = start_server(port:)
    wait_for_server!(pid:, port:)
    write_state(pid:, port:)

    puts url_for(port)
  end

  private

  def parse_options(argv)
    OptionParser.new do |parser|
      parser.on("--port PORT", Integer, "Use a specific port instead of auto-selecting one.") do |port|
        @options[:port] = port
      end
      parser.on("--hostname HOSTNAME", "Use a specific browser URL hostname instead of <worktree>.localhost.") do |hostname|
        @options[:hostname] = hostname
      end
    end.parse!(argv)
  end

  def validate_root!
    fail_with!("Run this from a Rails app root with bin/rails present.") unless @bin_rails.exist?
  end

  def running_server_url
    state = read_state
    return unless state

    pid = integer_value(state["pid"])
    port = integer_value(state["port"])

    if state["worktree"] == @root.to_s && pid && port && process_alive?(pid) && listening?(port)
      return url_for(port)
    end

    cleanup_state!
    nil
  end

  def read_state
    return unless @state_file.exist?

    JSON.parse(@state_file.read)
  rescue JSON::ParserError
    cleanup_state!
    nil
  end

  def ensure_pidfile_is_usable!
    return unless @pidfile.exist?

    pid = integer_value(@pidfile.read)
    return @pidfile.delete if pid.nil? || !process_alive?(pid)

    fail_with!("Found a live codex Rails pidfile at #{@pidfile}. Remove it or stop that process before starting another server.")
  rescue Errno::ENOENT
    nil
  end

  def next_free_port
    port = DEFAULT_PORT
    port += 1 while listening?(port)
    port
  end

  def build_tailwind!
    success = File.open(@build_log, "w") do |log|
      system(
        env,
        @bin_rails.to_s,
        "tailwindcss:build",
        chdir: @root.to_s,
        out: log,
        err: log
      )
    end

    fail_with!("Tailwind build failed. See #{@build_log}.") unless success
  end

  def start_server(port:)
    log = File.open(@server_log, "w")
    log.sync = true

    pid = Process.spawn(
      env.merge("PIDFILE" => @pidfile.to_s),
      @bin_rails.to_s,
      "server",
      "-b",
      BIND_HOST,
      "-p",
      port.to_s,
      chdir: @root.to_s,
      out: log,
      err: log,
      pgroup: true
    )

    Process.detach(pid)
    pid
  ensure
    log&.close
  end

  def wait_for_server!(pid:, port:)
    deadline = Time.now + BOOT_TIMEOUT_SECONDS

    loop do
      return if listening?(port)

      fail_with!("Rails exited before accepting connections. See #{@server_log}.") unless process_alive?(pid)

      if Time.now >= deadline
        terminate(pid)
        fail_with!("Timed out waiting for Rails on #{url_for(port)}. See #{@server_log}.")
      end

      sleep 0.25
    end
  end

  def write_state(pid:, port:)
    File.write(
      @state_file,
      JSON.pretty_generate(
        {
          pid:,
          port:,
          hostname: @url_hostname,
          worktree: @root.to_s,
          url: url_for(port),
          build_log: @build_log.to_s,
          server_log: @server_log.to_s
        }
      ) + "\n"
    )
  end

  def cleanup_state!
    @state_file.delete if @state_file.exist?
  end

  def env
    { "RAILS_ENV" => "development" }
  end

  def listening?(port)
    Socket.tcp(BIND_HOST, port, connect_timeout: 0.2) do |socket|
      socket.close
      return true
    end
  rescue StandardError
    false
  end

  def process_alive?(pid)
    Process.kill(0, pid)
    true
  rescue Errno::ESRCH
    false
  rescue Errno::EPERM
    true
  end

  def terminate(pid)
    Process.kill("TERM", pid)
  rescue StandardError
    nil
  end

  def url_for(port)
    "http://#{@url_hostname}:#{port}"
  end

  def default_url_hostname
    "#{dns_label(@root.basename.to_s)}.localhost"
  end

  def dns_label(value)
    label = value.downcase.gsub(/[^a-z0-9-]+/, "-").gsub(/\A-+|-+\z/, "")
    label.empty? ? "rails" : label
  end

  def integer_value(value)
    Integer(value, exception: false)
  end

  def fail_with!(message)
    warn message
    exit 1
  end
end

StartRailsServer.new(ARGV).run
