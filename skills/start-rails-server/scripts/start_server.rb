#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "open3"
require "pathname"
require "rbconfig"

class StartRailsServer
  WRAPPER_HELP_TEXT = "Usage: parallel rails s"

  def initialize(argv)
    @argv = argv.dup
    @root = Pathname.pwd.realpath
    @bin_rails = @root.join("bin/rails")
    @skill_dir = Pathname.new(__dir__).parent.realpath
    @parallel_installer = @skill_dir.parent.join(
      "setup-parallel-rails-command",
      "scripts",
      "install_parallel_rails_command.rb"
    )
    @install_dir = Pathname.new(
      ENV["PARALLEL_RAILS_INSTALL_DIR"].to_s.empty? ? "#{Dir.home}/.local/bin" : ENV.fetch("PARALLEL_RAILS_INSTALL_DIR")
    ).expand_path
    @wrapper = @install_dir.join("parallel")
    show_help_and_exit! if @argv == ["-h"] || @argv == ["--help"]
  end

  def run
    validate_root!
    ensure_zellij!
    parallel = ensure_parallel_wrapper!

    exec parallel, "rails", "s", *@argv
  end

  private

  def show_help_and_exit!
    puts "Usage: start_server.rb [status|stop] [PORT] [--port PORT] [--hostname HOST] [--session NAME]"
    puts
    puts "Bootstraps zellij and the global `parallel rails s` wrapper, then delegates to it."
    exit
  end

  def validate_root!
    fail_with!("Run this from a Rails app root with bin/rails present.") unless @bin_rails.exist?
  end

  def ensure_zellij!
    return if command_available?("zellij")

    if macos? && command_available?("brew")
      puts "Installing zellij with Homebrew..."
      return if system("brew", "install", "zellij")

      fail_with!("Homebrew could not install zellij.")
    end

    fail_with!("zellij is required. Install it with Homebrew, apt, pacman, or your system package manager, then rerun this command.")
  end

  def ensure_parallel_wrapper!
    return "parallel" if parallel_wrapper_valid?("parallel")

    fail_with!("Missing installer at #{@parallel_installer}.") unless @parallel_installer.exist?

    FileUtils.mkdir_p(@install_dir)
    puts "Installing parallel rails wrapper in #{@install_dir}..."

    success = system(
      { "PARALLEL_RAILS_INSTALL_DIR" => @install_dir.to_s },
      RbConfig.ruby,
      @parallel_installer.to_s,
      "--install-dir",
      @install_dir.to_s,
      "--ensure-path"
    )
    fail_with!("Could not install the parallel rails wrapper.") unless success

    ENV["PATH"] = [@install_dir.to_s, ENV.fetch("PATH", "")].reject(&:empty?).join(File::PATH_SEPARATOR)

    return @wrapper.to_s if parallel_wrapper_valid?(@wrapper.to_s)

    fail_with!("Installed #{@wrapper}, but `parallel rails s --help` did not verify.")
  end

  def parallel_wrapper_valid?(command)
    output, status = Open3.capture2e(command, "rails", "s", "--help")
    status.success? && output.include?(WRAPPER_HELP_TEXT)
  rescue Errno::ENOENT
    false
  end

  def command_available?(command)
    ENV.fetch("PATH", "").split(File::PATH_SEPARATOR).any? do |dir|
      path = File.join(dir, command)
      File.file?(path) && File.executable?(path)
    end
  end

  def macos?
    RUBY_PLATFORM.include?("darwin")
  end

  def fail_with!(message)
    warn message
    exit 1
  end
end

StartRailsServer.new(ARGV).run
