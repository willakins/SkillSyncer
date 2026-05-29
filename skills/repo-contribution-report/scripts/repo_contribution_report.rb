#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "json"
require "open3"
require "optparse"
require "set"
require "time"
require "yaml"
require "date"

class CommandError < StandardError; end

class Reporter
  DEFAULT_MONTHS = 6
  PR_PAGE_SIZE = 25
  REVIEW_PAGE_SIZE = 50

  PULL_REQUESTS_QUERY = <<~GRAPHQL
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          name
        }
        pullRequests(first: #{PR_PAGE_SIZE}, after: $cursor, orderBy: { field: CREATED_AT, direction: DESC }) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            number
            createdAt
            mergedAt
            author {
              __typename
              login
              ... on User {
                name
              }
            }
            reviews(first: #{REVIEW_PAGE_SIZE}) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                state
                createdAt
                author {
                  __typename
                  login
                  ... on User {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  GRAPHQL

  PULL_REQUEST_REVIEWS_QUERY = <<~GRAPHQL
    query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviews(first: #{REVIEW_PAGE_SIZE}, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              state
              createdAt
              author {
                __typename
                login
                ... on User {
                  name
                }
              }
            }
          }
        }
      }
    }
  GRAPHQL

  def initialize(argv)
    @options = parse_options(argv)
    @cutoff_time = recent_cutoff(@options[:months])
    @repo = @options[:repo] || detect_repo
    @owner, @repo_name = @repo.split("/", 2)
    raise ArgumentError, "Repo must be in owner/name form" unless @owner && @repo_name
  end

  def run
    default_branch = fetch_default_branch
    fetch_default_branch_ref(default_branch) if @options[:fetch]
    git_ref = resolve_git_ref(default_branch)
    git_stats = collect_git_stats(git_ref)
    github_stats = collect_github_stats
    rows = build_rows(git_stats, github_stats)

    output = case @options[:format]
    when "csv"
      render_csv(rows)
    when "json"
      render_json(rows, git_ref)
    else
      render_table(rows, git_ref)
    end

    puts output
  end

  private

  def parse_options(argv)
    options = {
      format: "table",
      months: DEFAULT_MONTHS,
      include_bots: false,
      show_aliases: false,
      sort: "recent",
      fetch: false
    }

    parser = OptionParser.new do |opts|
      opts.banner = "Usage: #{File.basename($PROGRAM_NAME)} [options]"

      opts.on("--repo OWNER/NAME", "GitHub repo to inspect. Defaults to origin remote.") do |value|
        options[:repo] = value
      end

      opts.on("--months N", Integer, "Recent window length in months. Default: #{DEFAULT_MONTHS}.") do |value|
        options[:months] = value
      end

      opts.on("--format FORMAT", %w[table csv json], "Output format: table, csv, or json.") do |value|
        options[:format] = value
      end

      opts.on("--sort SORT", %w[recent all name], "Sort rows by recent activity, all-time activity, or name.") do |value|
        options[:sort] = value
      end

      opts.on("--include-bots", "Include bot-authored PR and approval metrics.") do
        options[:include_bots] = true
      end

      opts.on("--show-aliases", "Include git author and GitHub login aliases in table/csv output.") do
        options[:show_aliases] = true
      end

      opts.on("--identity-map PATH", "YAML file mapping git authors and GitHub logins to a shared user.") do |value|
        options[:identity_map] = value
      end

      opts.on("--fetch", "Fetch origin/<default-branch> before collecting git line stats.") do
        options[:fetch] = true
      end

      opts.on("-h", "--help", "Show help.") do
        puts opts
        exit 0
      end
    end

    parser.parse!(argv)
    options
  end

  def recent_cutoff(months)
    date = Date.today << months
    Time.utc(date.year, date.month, date.day)
  end

  def detect_repo
    remote = capture!("git", "remote", "get-url", "origin").strip
    match = remote.match(%r{\A(?:git@github\.com:|https://github\.com/)([^/]+)/(.+?)(?:\.git)?\z})
    raise ArgumentError, "Could not infer GitHub repo from origin remote: #{remote}" unless match

    "#{match[1]}/#{match[2]}"
  end

  def fetch_default_branch
    response = graphql(PULL_REQUESTS_QUERY, owner: @owner, name: @repo_name)
    @pull_request_pages = [response]
    response.fetch("data").fetch("repository").fetch("defaultBranchRef").fetch("name")
  end

  def resolve_git_ref(default_branch)
    remote_ref = "refs/remotes/origin/#{default_branch}"
    remote_exists = system("git", "rev-parse", "--verify", "--quiet", remote_ref, out: File::NULL, err: File::NULL)
    remote_exists ? "origin/#{default_branch}" : default_branch
  end

  def fetch_default_branch_ref(default_branch)
    capture!("git", "fetch", "origin", default_branch)
  end

  def collect_git_stats(git_ref)
    stats = Hash.new { |hash, key| hash[key] = empty_stat_record }

    Open3.popen3("git", "log", git_ref, "--use-mailmap", "--format=commit\t%aN <%aE>\t%cI", "--numstat", "--no-renames") do |stdin, stdout, stderr, wait_thr|
      stdin.close
      current_author = nil
      current_time = nil

      stdout.each_line do |line|
        if line.start_with?("commit\t")
          _, current_author, timestamp = line.chomp.split("\t", 3)
          current_time = Time.iso8601(timestamp)
          next
        end

        next if current_author.nil?

        match = line.match(/\A(\d+|-)\t(\d+|-)\t/)
        next unless match

        added = match[1] == "-" ? 0 : match[1].to_i
        deleted = match[2] == "-" ? 0 : match[2].to_i

        stats[current_author][:git_authors] << current_author
        stats[current_author][:added_all] += added
        stats[current_author][:deleted_all] += deleted

        next unless current_time >= @cutoff_time

        stats[current_author][:added_recent] += added
        stats[current_author][:deleted_recent] += deleted
      end

      stderr_output = stderr.read
      next if wait_thr.value.success?

      raise CommandError, "git log failed: #{stderr_output}"
    end

    stats
  end

  def collect_github_stats
    stats = Hash.new { |hash, key| hash[key] = empty_stat_record }
    page = 0
    total_prs = nil
    cursor = nil

    loop do
      response = if page.zero?
        @pull_request_pages.shift || graphql(PULL_REQUESTS_QUERY, owner: @owner, name: @repo_name)
      else
        graphql(PULL_REQUESTS_QUERY, owner: @owner, name: @repo_name, cursor: cursor)
      end

      pull_requests = response.fetch("data").fetch("repository").fetch("pullRequests")
      total_prs ||= pull_requests.fetch("totalCount")
      page += 1

      pull_requests.fetch("nodes").each_with_index do |pull_request, index|
        process_pull_request(stats, pull_request)
        processed = ((page - 1) * PR_PAGE_SIZE) + index + 1
        warn("Processed #{processed}/#{total_prs} pull requests...") if (processed % 100).zero?
      end

      break unless pull_requests.dig("pageInfo", "hasNextPage")

      cursor = pull_requests.dig("pageInfo", "endCursor")
    end

    stats
  end

  def process_pull_request(stats, pull_request)
    author = actor_identity(pull_request["author"])
    if author && include_actor?(pull_request["author"])
      stats[author[:login]][:github_logins] << author[:login]
      stats[author[:login]][:display_name] ||= author[:name] || author[:login]

      merged_at = pull_request["mergedAt"] && Time.iso8601(pull_request["mergedAt"])
      if merged_at
        stats[author[:login]][:merged_prs_all] += 1
        stats[author[:login]][:merged_prs_recent] += 1 if merged_at >= @cutoff_time
      end
    end

    each_review(pull_request["number"], pull_request.fetch("reviews")) do |review|
      next unless review["state"] == "APPROVED"

      reviewer = actor_identity(review["author"])
      next unless reviewer
      next unless include_actor?(review["author"])

      stats[reviewer[:login]][:github_logins] << reviewer[:login]
      stats[reviewer[:login]][:display_name] ||= reviewer[:name] || reviewer[:login]
      stats[reviewer[:login]][:approved_prs_all_set] << pull_request["number"]

      review_time = Time.iso8601(review["createdAt"])
      next unless review_time >= @cutoff_time

      stats[reviewer[:login]][:approved_prs_recent_set] << pull_request["number"]
    end
  end

  def each_review(pull_request_number, initial_connection)
    initial_connection.fetch("nodes").each { |review| yield review }

    cursor = initial_connection.dig("pageInfo", "endCursor")
    has_next_page = initial_connection.dig("pageInfo", "hasNextPage")

    while has_next_page
      response = graphql(
        PULL_REQUEST_REVIEWS_QUERY,
        owner: @owner,
        name: @repo_name,
        number: pull_request_number,
        cursor: cursor
      )

      reviews = response.fetch("data").fetch("repository").fetch("pullRequest").fetch("reviews")
      reviews.fetch("nodes").each { |review| yield review }
      cursor = reviews.dig("pageInfo", "endCursor")
      has_next_page = reviews.dig("pageInfo", "hasNextPage")
    end
  end

  def build_rows(git_stats, github_stats)
    manual_map = load_identity_map
    github_profiles = github_stats.each_with_object({}) do |(login, stat), memo|
      memo[login] = {
        key: manual_key_for_login(manual_map, login) || login,
        display_name: stat[:display_name] || login,
        aliases: alias_keys_for_login(login, stat[:display_name])
      }
    end

    alias_index = build_alias_index(github_profiles)
    people = Hash.new { |hash, key| hash[key] = empty_person_record(key) }

    github_stats.each do |login, stat|
      key = github_profiles.fetch(login).fetch(:key)
      person = people[key]
      person[:display_name] ||= github_profiles.fetch(login).fetch(:display_name)
      person[:github_logins] << login
      person[:merged_prs_all] += stat[:merged_prs_all]
      person[:merged_prs_recent] += stat[:merged_prs_recent]
      person[:approved_prs_all_set].merge(stat[:approved_prs_all_set])
      person[:approved_prs_recent_set].merge(stat[:approved_prs_recent_set])
    end

    git_stats.each do |git_author, stat|
      matched_key = git_aliases(git_author).lazy.map { |alias_key| alias_index[alias_key] }.find(&:itself)
      fallback_key = "git:#{git_aliases(git_author).first || normalized_alias(git_author) || git_author}"
      key = manual_key_for_git_author(manual_map, git_author) || matched_key || fallback_key
      person = people[key]
      person[:display_name] ||= git_author.sub(/\s*<.+>\z/, "")
      person[:git_authors] << git_author
      person[:added_all] += stat[:added_all]
      person[:deleted_all] += stat[:deleted_all]
      person[:added_recent] += stat[:added_recent]
      person[:deleted_recent] += stat[:deleted_recent]
    end

    rows = people.values.map do |person|
      {
        user: person[:display_name] || person[:key],
        git_authors: person[:git_authors].to_a.sort.join("; "),
        github_logins: person[:github_logins].to_a.sort.join(","),
        added_all: person[:added_all],
        deleted_all: person[:deleted_all],
        added_recent: person[:added_recent],
        deleted_recent: person[:deleted_recent],
        merged_prs_all: person[:merged_prs_all],
        merged_prs_recent: person[:merged_prs_recent],
        approved_prs_all: person[:approved_prs_all_set].size,
        approved_prs_recent: person[:approved_prs_recent_set].size
      }
    end

    sort_rows(rows)
  end

  def load_identity_map
    return {} unless @options[:identity_map]

    raw = YAML.safe_load_file(@options[:identity_map], permitted_classes: [], aliases: false) || {}
    raw.fetch("users", {})
  end

  def manual_key_for_login(manual_map, login)
    manual_map.each do |key, config|
      return key if Array(config["github_logins"]).include?(login)
    end

    nil
  end

  def manual_key_for_git_author(manual_map, git_author)
    manual_map.each do |key, config|
      return key if Array(config["git_authors"]).include?(git_author)
    end

    nil
  end

  def build_alias_index(github_profiles)
    alias_index = {}

    github_profiles.each_value do |profile|
      profile[:aliases].each do |alias_key|
        next if alias_key.empty?

        if alias_index.key?(alias_key) && alias_index[alias_key] != profile[:key]
          alias_index[alias_key] = nil
        else
          alias_index[alias_key] = profile[:key]
        end
      end
    end

    alias_index.compact
  end

  def alias_keys_for_login(login, display_name)
    [
      normalized_alias(login),
      normalized_alias(display_name),
      first_last_alias(display_name)
    ].compact.uniq
  end

  def git_aliases(git_author)
    name = git_author.sub(/\s*<.+>\z/, "")
    email = git_author[/<(.+)>/, 1]
    email_local = email&.split("@")&.first

    [
      normalized_alias(email_local),
      normalized_alias(name),
      first_last_alias(name)
    ].compact.uniq
  end

  def normalized_alias(value)
    normalized = value.to_s.downcase.gsub(/[^a-z0-9]/, "")
    normalized.empty? ? nil : normalized
  end

  def first_last_alias(name)
    tokens = name.to_s.downcase.scan(/[a-z0-9]+/)
    return nil if tokens.length < 2

    normalized_alias("#{tokens.first}#{tokens.last}")
  end

  def sort_rows(rows)
    case @options[:sort]
    when "name"
      rows.sort_by { |row| row[:user].downcase }
    when "all"
      rows.sort_by { |row| -all_time_score(row) }
    else
      rows.sort_by { |row| [-recent_score(row), row[:user].downcase] }
    end
  end

  def recent_score(row)
    row[:added_recent] + row[:deleted_recent] + (row[:merged_prs_recent] * 100) + (row[:approved_prs_recent] * 100)
  end

  def all_time_score(row)
    row[:added_all] + row[:deleted_all] + (row[:merged_prs_all] * 100) + (row[:approved_prs_all] * 100)
  end

  def render_table(rows, git_ref)
    headers = {
      user: "User",
      added_all: "Added All",
      deleted_all: "Deleted All",
      added_recent: "Added #{@options[:months]}m",
      deleted_recent: "Deleted #{@options[:months]}m",
      merged_prs_all: "Merged PRs All",
      merged_prs_recent: "Merged PRs #{@options[:months]}m",
      approved_prs_all: "Approved PRs All",
      approved_prs_recent: "Approved PRs #{@options[:months]}m"
    }

    if @options[:show_aliases]
      headers = headers.merge(
        git_authors: "Git Authors",
        github_logins: "GitHub Logins"
      )
      order = %i[user github_logins git_authors added_all deleted_all added_recent deleted_recent merged_prs_all merged_prs_recent approved_prs_all approved_prs_recent]
    else
      headers = headers.merge(github_logins: "GitHub")
      order = %i[user github_logins added_all deleted_all added_recent deleted_recent merged_prs_all merged_prs_recent approved_prs_all approved_prs_recent]
    end

    printable_rows = rows.map do |row|
      order.each_with_object({}) do |column, memo|
        memo[column] = row.fetch(column).to_s
      end
    end

    widths = order.each_with_object({}) do |column, memo|
      memo[column] = ([headers.fetch(column).length] + printable_rows.map { |row| row.fetch(column).length }).max
    end

    lines = []
    lines << "Repo: #{@repo}"
    lines << "Git line stats ref: #{git_ref}"
    lines << "Recent window starts: #{@cutoff_time.utc.strftime('%Y-%m-%d')} UTC"
    lines << ""
    lines << order.map { |column| headers.fetch(column).ljust(widths.fetch(column)) }.join("  ")
    lines << order.map { |column| "-" * widths.fetch(column) }.join("  ")

    printable_rows.each do |row|
      lines << order.map { |column| row.fetch(column).ljust(widths.fetch(column)) }.join("  ")
    end

    lines.join("\n")
  end

  def render_csv(rows)
    columns = %i[user github_logins git_authors added_all deleted_all added_recent deleted_recent merged_prs_all merged_prs_recent approved_prs_all approved_prs_recent]
    columns -= [:git_authors] unless @options[:show_aliases]

    CSV.generate do |csv|
      csv << columns
      rows.each do |row|
        csv << columns.map { |column| row.fetch(column) }
      end
    end
  end

  def render_json(rows, git_ref)
    {
      repo: @repo,
      git_ref: git_ref,
      cutoff_utc: @cutoff_time.utc.iso8601,
      rows: rows
    }.to_json
  end

  def graphql(query, variables)
    args = ["gh", "api", "graphql", "-f", "query=#{query}"]
    variables.each do |key, value|
      next if value.nil?

      args << "-F"
      args << "#{key}=#{value}"
    end

    stdout, stderr, status = Open3.capture3(*args)
    raise CommandError, "gh api graphql failed: #{stderr}" unless status.success?

    JSON.parse(stdout)
  end

  def actor_identity(actor)
    return nil unless actor&.fetch("login", nil)

    {
      login: actor.fetch("login"),
      name: actor["name"],
      type: actor["__typename"]
    }
  end

  def include_actor?(actor)
    return false unless actor
    return true if @options[:include_bots]

    actor["__typename"] != "Bot"
  end

  def capture!(*command)
    stdout, stderr, status = Open3.capture3(*command)
    raise CommandError, "#{command.join(' ')} failed: #{stderr}" unless status.success?

    stdout
  end

  def empty_stat_record
    {
      display_name: nil,
      git_authors: Set.new,
      github_logins: Set.new,
      added_all: 0,
      deleted_all: 0,
      added_recent: 0,
      deleted_recent: 0,
      merged_prs_all: 0,
      merged_prs_recent: 0,
      approved_prs_all_set: Set.new,
      approved_prs_recent_set: Set.new
    }
  end

  def empty_person_record(key)
    empty_stat_record.merge(
      key: key
    )
  end
end

begin
  Reporter.new(ARGV).run
rescue CommandError, ArgumentError => e
  warn(e.message)
  exit 1
end
