#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "optparse"
require "pathname"
require "shellwords"
require "time"

class ParallelRailsInstaller
  COMMAND_NAME = "parallel"
  MANAGED_MARKER = "PARALLEL_RAILS_COMMAND_VERSION=1"

  def initialize(argv)
    @options = {
      install_dir: ENV["PARALLEL_RAILS_INSTALL_DIR"],
      dry_run: false,
      ensure_path: false,
      force: false
    }
    parse_options(argv)
  end

  def run
    install_dir = Pathname.new(@options[:install_dir] || default_install_dir).expand_path
    target = install_dir.join(COMMAND_NAME)

    validate_existing_target!(target)

    if @options[:dry_run]
      puts "Would install #{target}"
      puts "Install directory is #{path_contains?(install_dir) ? "" : "not "}on PATH."
      return
    end

    FileUtils.mkdir_p(install_dir)
    backup_existing_target(target)
    File.write(target, command_source)
    FileUtils.chmod(0o755, target)

    puts "Installed #{target}"

    if path_contains?(install_dir)
      puts "#{install_dir} is already on PATH."
    elsif @options[:ensure_path]
      ensure_shell_path!(install_dir)
    else
      puts "#{install_dir} is not on PATH. Add it before using `parallel rails s`."
    end
  end

  private

  def parse_options(argv)
    OptionParser.new do |parser|
      parser.banner = "Usage: install_parallel_rails_command.rb [options]"
      parser.on("--install-dir DIR", "Install the `parallel` wrapper in DIR.") { |dir| @options[:install_dir] = dir }
      parser.on("--ensure-path", "Append the install directory to the current shell rc file when needed.") { @options[:ensure_path] = true }
      parser.on("--force", "Replace an unrelated existing target after backing it up.") { @options[:force] = true }
      parser.on("--dry-run", "Print the chosen install path without writing files.") { @options[:dry_run] = true }
      parser.on("-h", "--help", "Show this help.") do
        puts parser
        exit
      end
    end.parse!(argv)
  end

  def validate_existing_target!(target)
    return unless target.exist?
    return if target.read.include?(MANAGED_MARKER)
    return if @options[:force]

    abort <<~MESSAGE
      Refusing to overwrite unrelated executable at #{target}.
      Choose an earlier user bin directory with --install-dir, or rerun with --force after inspecting that file.
    MESSAGE
  end

  def backup_existing_target(target)
    return unless target.exist?
    return if target.read.include?(MANAGED_MARKER)

    backup = target.sub_ext(".before-parallel-rails-#{Time.now.utc.strftime("%Y%m%d%H%M%S")}")
    FileUtils.mv(target, backup)
    puts "Backed up existing #{target} to #{backup}"
  end

  def default_install_dir
    home = Pathname.new(ENV.fetch("HOME"))
    path_dirs = path_entries

    path_dirs.each do |entry|
      path = Pathname.new(entry).expand_path
      next unless path.to_s.start_with?(home.to_s)
      next if path.to_s.match?(%r{/(?:\.rbenv|\.asdf|\.mise)/shims\z})
      next if path.to_s.include?("/.codex/tmp/")
      return path if path.directory? && path.writable?
    end

    [home.join(".local/bin"), home.join("bin"), Pathname.new("/usr/local/bin")].each do |candidate|
      return candidate if path_dirs.include?(candidate.to_s) && (!candidate.exist? || candidate.writable?)
    end

    home.join(".local/bin")
  end

  def path_contains?(dir)
    path_entries.map { |entry| Pathname.new(entry).expand_path.to_s }.include?(dir.expand_path.to_s)
  end

  def path_entries
    ENV.fetch("PATH", "").split(File::PATH_SEPARATOR).reject(&:empty?)
  end

  def ensure_shell_path!(install_dir)
    rc_file = shell_rc_file

    unless rc_file
      puts "Could not identify a shell rc file. Add this manually:"
      puts path_export_line(install_dir)
      return
    end

    FileUtils.mkdir_p(rc_file.dirname)
    existing = rc_file.exist? ? rc_file.read : ""

    if existing.include?(install_dir.to_s)
      puts "#{rc_file} already references #{install_dir}."
      return
    end

    File.open(rc_file, "a") do |file|
      file.puts
      file.puts "# parallel rails command"
      file.puts path_export_line(install_dir)
    end

    puts "Added #{install_dir} to PATH in #{rc_file}. Restart your shell or source that file."
  end

  def shell_rc_file
    home = Pathname.new(ENV.fetch("HOME"))

    case File.basename(ENV.fetch("SHELL", ""))
    when "zsh"
      home.join(".zshrc")
    when "bash"
      home.join(".bashrc")
    else
      nil
    end
  end

  def path_export_line(install_dir)
    display_path = install_dir.to_s.sub(/\A#{Regexp.escape(ENV.fetch("HOME"))}/, "$HOME")
    %(export PATH="#{display_path}:$PATH")
  end

  def command_source
    <<~'RUBY'
      #!/usr/bin/env ruby
      # frozen_string_literal: true
      # PARALLEL_RAILS_COMMAND_VERSION=1

      require "digest/sha1"
      require "fileutils"
      require "json"
      require "open3"
      require "optparse"
      require "pathname"
      require "shellwords"
      require "socket"

      class ParallelRailsCommand
        BIND_HOST = "127.0.0.1"
        DEFAULT_PORT = 3000
        STATE_DIR = "tmp/codex"
        STATE_FILE = "parallel-rails.json"

        def self.dispatch(argv)
          if argv[0] == "rails" && %w[s server].include?(argv[1])
            new(argv.drop(2)).run
            return
          end

          if (fallback = fallback_parallel)
            exec fallback, *argv
          end

          warn "Unsupported command. This wrapper handles `parallel rails s`; no fallback `parallel` executable was found."
          exit 64
        end

        def self.fallback_parallel
          current = File.realpath($PROGRAM_NAME)

          ENV.fetch("PATH", "").split(File::PATH_SEPARATOR).each do |dir|
            candidate = File.join(dir, "parallel")
            next unless File.file?(candidate) && File.executable?(candidate)

            real_candidate = File.realpath(candidate)
            return candidate unless real_candidate == current
          rescue Errno::ENOENT
            next
          end

          nil
        rescue Errno::ENOENT
          nil
        end

        def initialize(argv)
          @argv = argv.dup
          @action = :start
          @options = {
            hostname: nil,
            layout_only: false,
            port: nil,
            session: nil
          }
          parse_options!

          @root = Pathname.pwd.realpath
          @bin_rails = @root.join("bin/rails")
          @state_dir = @root.join(STATE_DIR)
          @state_file = @state_dir.join(STATE_FILE)
        end

        def run
          prepare_zellij_socket_dir!
          validate_root!

          case @action
          when :start
            start
          when :status
            status
          when :stop
            stop
          end
        end

        private

        def parse_options!
          @action = @argv.shift.to_sym if %w[status stop].include?(@argv.first)

          parser = OptionParser.new do |parser|
            parser.banner = "Usage: parallel rails s [status|stop] [PORT] [--port PORT] [--hostname HOST] [--session NAME]"
            parser.on("--port PORT", Integer, "Use a specific Rails port.") { |port| @options[:port] = port }
            parser.on("--hostname HOST", "Use a specific browser URL hostname.") { |hostname| @options[:hostname] = hostname }
            parser.on("--session NAME", "Use a specific Zellij session name.") { |session| @options[:session] = session }
            parser.on("--layout-only", "Write the generated Zellij layout and print its path without starting Zellij.") { @options[:layout_only] = true }
            parser.on("-h", "--help", "Show this help.") do
              puts parser
              exit
            end
          end

          parser.parse!(@argv)
          parse_bare_port!
        end

        def parse_bare_port!
          @argv.each do |arg|
            if arg.match?(/\A\d+\z/)
              @options[:port] = Integer(arg)
            else
              fail_with!("Unknown argument: #{arg}")
            end
          end
        end

        def validate_root!
          fail_with!("Run this from a Rails app root with bin/rails present.") unless @bin_rails.exist?
        end

        def start
          require_zellij!
          FileUtils.mkdir_p(@state_dir)

          state = read_state
          hostname = @options[:hostname] || state["hostname"] || default_hostname
          port = @options[:port] || integer_value(state["port"]) || next_free_port
          session = @options[:session] || state["session"] || default_session
          url = url_for(hostname, port)

          layout_file = @state_dir.join("parallel-rails.kdl")
          File.write(layout_file, render_layout(hostname: hostname, port: port, session: session))

          return puts layout_file if @options[:layout_only]

          if session_running?(session)
            puts url
            exec "zellij", "attach", "--force-run-commands", session
          end

          delete_saved_session(session)
          write_state(session: session, hostname: hostname, port: port, url: url, layout_file: layout_file)

          puts url
          exec "zellij", "--session", session, "--new-session-with-layout", layout_file.to_s
        end

        def status
          state = read_state

          if state.empty?
            puts "No tracked parallel Rails session for #{@root}."
            return
          end

          session = state.fetch("session", nil)
          running = session && zellij_available? && session_running?(session)
          puts "#{running ? "running" : "stopped"} #{session || "(unknown-session)"} #{state.fetch("url", "(unknown-url)")}"
        end

        def stop
          state = read_state
          session = @options[:session] || state["session"] || default_session

          if zellij_available? && session_running?(session)
            kill_session(session)
            puts "Stopped #{session}."
          else
            delete_saved_session(session) if zellij_available?
            puts "No running Zellij session named #{session}."
          end

          @state_file.delete if @state_file.exist?
        end

        def require_zellij!
          return if zellij_available?

          fail_with!("zellij is required. Install it with Homebrew, apt, pacman, or your system package manager.")
        end

        def zellij_available?
          system("zellij", "--version", out: File::NULL, err: File::NULL)
        end

        def session_running?(session)
          output, status = Open3.capture2e("zellij", "list-sessions")
          return false unless status.success?

          output.lines.any? do |line|
            clean_line = strip_ansi(line).strip
            next false if clean_line.include?("(EXITED")

            fields = clean_line.split(/\s+/)
            fields.first == session
          end
        end

        def strip_ansi(value)
          value.gsub(/\e\[[0-9;]*m/, "")
        end

        def kill_session(session)
          system("zellij", "delete-session", "--force", session, out: File::NULL, err: File::NULL) ||
            system("zellij", "kill-session", session) ||
            system("zellij", "kill-sessions", session)
        end

        def delete_saved_session(session)
          system("zellij", "delete-session", session, out: File::NULL, err: File::NULL)
        end

        def prepare_zellij_socket_dir!
          return if ENV["ZELLIJ_SOCKET_DIR"].to_s != ""

          socket_dir = Pathname.new("/tmp/zellij")
          FileUtils.mkdir_p(socket_dir)
          ENV["ZELLIJ_SOCKET_DIR"] = socket_dir.to_s
        end

        def read_state
          return {} unless @state_file.exist?

          JSON.parse(@state_file.read)
        rescue JSON::ParserError
          {}
        end

        def write_state(session:, hostname:, port:, url:, layout_file:)
          File.write(
            @state_file,
            JSON.pretty_generate(
              {
                "root" => @root.to_s,
                "session" => session,
                "hostname" => hostname,
                "port" => port,
                "url" => url,
                "layout_file" => layout_file.to_s
              }
            ) + "\n"
          )
        end

        def next_free_port
          port = DEFAULT_PORT
          port += 1 while listening?(port)
          port
        end

        def listening?(port)
          Socket.tcp(BIND_HOST, port, connect_timeout: 0.2) do |socket|
            socket.close
            return true
          end
        rescue StandardError
          false
        end

        def render_layout(hostname:, port:, session:)
          url = url_for(hostname, port)

          <<~KDL
            session_name #{kdl(session)}
            attach_to_session true

            layout {
                default_tab_template {
                    pane size=1 borderless=true {
                        plugin location="zellij:tab-bar"
                    }
                    children
                    pane size=2 borderless=true {
                        plugin location="zellij:status-bar"
                    }
                }

                tab name=#{kdl("Rails")} cwd=#{kdl(@root.to_s)} {
                    pane split_direction="vertical" {
                        #{shell_pane(name: "Shell", command: rails_shell_command(url, port), size: "62%", focus: true)}
                        pane stacked=true size="38%" {
                            #{service_pane("Sidekiq", "bundle exec sidekiq")}
                            #{service_pane("Tailwind watch", "bin/rails tailwindcss:watch")}
                            #{service_pane("Rails console", "bin/rails console", expanded: true)}
                        }
                    }
                }
            }
          KDL
        end

        def rails_shell_command(url, port)
          [
            "rails_url=#{Shellwords.escape(url)}",
            "rails_pidfile=#{Shellwords.escape(rails_pidfile(port).to_s)}",
            "rails_log=#{Shellwords.escape(rails_logfile(port).to_s)}",
            %(if [ -f "$rails_pidfile" ] && ! kill -0 "$(cat "$rails_pidfile")" 2>/dev/null; then rm -f "$rails_pidfile"; fi),
            %(: > "$rails_log"),
            %(PIDFILE="$rails_pidfile" bin/rails server -b #{BIND_HOST} -p #{port} > "$rails_log" 2>&1 &),
            "rails_pid=$!",
            %(trap 'kill "$rails_pid" 2>/dev/null; wait "$rails_pid" 2>/dev/null; rm -f "$rails_pidfile"' EXIT HUP INT TERM),
            %(export PARALLEL_RAILS_URL="$rails_url"),
            %(export PARALLEL_RAILS_PID="$rails_pid"),
            %(export PARALLEL_RAILS_LOG="$rails_log"),
            %(printf 'Rails: %s\\n' "$rails_url"),
            %(printf 'Stop stack: parallel rails s stop\\n'),
            %(printf 'Rails logs: tail -f %s\\n\\n' "$rails_log"),
            "#{Shellwords.escape(shell)} -l"
          ].join("\n")
        end

        def rails_pidfile(port)
          @state_dir.join("parallel-rails-server-#{port}.pid")
        end

        def rails_logfile(port)
          @state_dir.join("parallel-rails-server-#{port}.log")
        end

        def service_pane(name, command, size: nil, focus: false, expanded: false)
          wrapped = [
            command,
            "status=$?",
            "printf %s\\\\n #{Shellwords.escape("#{name} exited. Press Enter to open a shell.")}",
            "read _",
            "exec #{Shellwords.escape(shell)} -l"
          ].join("; ")

          shell_pane(name: name, command: wrapped, size: size, focus: focus, expanded: expanded)
        end

        def shell_pane(name:, command:, size: nil, focus: false, expanded: false)
          attrs = [
            "name=#{kdl(name)}",
            "command=#{kdl(shell)}",
            "start_suspended=false"
          ]
          attrs << "size=#{kdl(size)}" if size
          attrs << "focus=true" if focus
          attrs << "expanded=true" if expanded

          <<~KDL.chomp
            pane #{attrs.join(" ")} {
                args "-lc" #{kdl(command)}
            }
          KDL
        end

        def shell
          @shell ||= begin
            configured = ENV.fetch("SHELL", "")
            File.executable?(configured) ? configured : "/bin/zsh"
          end
        end

        def url_for(hostname, port)
          "http://#{hostname}:#{port}"
        end

        def default_hostname
          "#{dns_label(@root.basename.to_s)}.localhost"
        end

        def default_session
          "parallel-rails-#{dns_label(@root.basename.to_s)}-#{Digest::SHA1.hexdigest(@root.to_s)[0, 8]}"
        end

        def dns_label(value)
          label = value.downcase.gsub(/[^a-z0-9-]+/, "-").gsub(/\A-+|-+\z/, "")
          label.empty? ? "rails" : label
        end

        def kdl(value)
          JSON.generate(value.to_s)
        end

        def integer_value(value)
          Integer(value, exception: false)
        end

        def fail_with!(message)
          warn message
          exit 1
        end
      end

      ParallelRailsCommand.dispatch(ARGV)
    RUBY
  end
end

ParallelRailsInstaller.new(ARGV).run
