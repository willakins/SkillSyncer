# frozen_string_literal: true

require 'json'
require 'optparse'
require 'securerandom'

abort "Refusing to seed manual UI data in #{Rails.env}." if %w[production staging demo].include?(Rails.env)

options = {
  scenario: 'worker-profile-job-orders',
  host: ENV.fetch('LOCAL_APP_URL', 'http://localhost:3000'),
  force_seed: false,
  reuse_only: false
}

OptionParser.new do |parser|
  parser.banner = 'Usage: bin/rails runner .codex/skills/setup-manual-ui-test/scripts/croft_manual_ui_seed.rb [options]'

  parser.on('--scenario SCENARIO', 'Scenario to find or seed. Default: worker-profile-job-orders') do |scenario|
    options[:scenario] = scenario
  end

  parser.on(
    '--host HOST',
    'Local app host for generated links. Default: LOCAL_APP_URL or http://localhost:3000'
  ) do |host|
    options[:host] = host.delete_suffix('/')
  end

  parser.on('--force-seed', 'Skip existing record discovery and create a synthetic scenario') do
    options[:force_seed] = true
  end

  parser.on('--reuse-only', 'Abort instead of seeding when no existing scenario is found') do
    options[:reuse_only] = true
  end
end.parse!(ARGV)

abort "Unknown scenario: #{options[:scenario]}" unless options[:scenario] == 'worker-profile-job-orders'
abort 'Choose either --force-seed or --reuse-only, not both.' if options[:force_seed] && options[:reuse_only]

# Finds or seeds a local worker-profile job-orders scenario for manual browser QA.
# rubocop:disable Metrics/AbcSize, Metrics/ClassLength, Metrics/MethodLength, Metrics/ParameterLists
class CroftManualUiSeed
  EMPLOYMENT_SCENARIOS = {
    future: {
      name_prefix: 'Future Apples',
      start_on: -> { 7.weeks.from_now.to_date },
      end_on: -> { 4.months.from_now.to_date },
      completed_steps: 2
    },
    current: {
      name_prefix: 'Current Berries',
      start_on: -> { 2.weeks.ago.to_date },
      end_on: -> { 6.weeks.from_now.to_date },
      completed_steps: 1
    },
    past: {
      name_prefix: 'Past Cherries',
      start_on: -> { 4.months.ago.to_date },
      end_on: -> { 2.months.ago.to_date },
      completed_steps: 0
    }
  }.freeze

  CHECKLIST_STEP_NAMES = [
    'Manual UI Test Upload Passport',
    'Manual UI Test Confirm Travel',
    'Manual UI Test Review Housing'
  ].freeze

  def initialize(host:, force_seed: false, reuse_only: false)
    @host = host
    @force_seed = force_seed
    @reuse_only = reuse_only
    @suffix = Time.current.strftime('%Y%m%d%H%M%S')
  end

  def call
    ActiveRecord::Base.transaction do
      existing_scenario = find_existing_scenario unless force_seed
      if existing_scenario.present?
        payload(**existing_scenario, setup_mode: 'existing')
      else
        abort 'No existing worker-profile job-order scenario found, and --reuse-only was provided.' if reuse_only

        setup_factory_bot!
        employer_org = create_employer_org
        account = create_account(employer_org:)
        worker = create_worker(employer_org:)
        employments = create_employments(employer_org:, worker:)
        token_result = create_login_token(account:, worker:, employer_org:)

        payload(
          account:,
          employer_org:,
          worker:,
          employments:,
          token_result:,
          setup_mode: 'seeded'
        )
      end
    end
  end

  private

  attr_reader :force_seed, :host, :reuse_only, :suffix

  def routes
    Rails.application.routes.url_helpers
  end

  def find_existing_scenario
    candidate = Employment
                .joins(:job_order)
                .joins(
                  <<~SQL.squish
                    INNER JOIN worker_contacts
                      ON worker_contacts.worker_id = employments.worker_id
                     AND worker_contacts.employer_org_id = job_orders.employer_org_id
                  SQL
                )
                .joins('INNER JOIN employer_accounts ON employer_accounts.employer_org_id = job_orders.employer_org_id')
                .joins('INNER JOIN accounts ON accounts.id = employer_accounts.account_id')
                .where(accounts: { kind: Account::KINDS.fetch(:employer), status: verified_account_status })
                .group('employments.worker_id', 'job_orders.employer_org_id', 'accounts.id')
                .having('COUNT(DISTINCT employments.job_order_id) >= 3')
                .select(
                  <<~SQL.squish
                    employments.worker_id,
                    job_orders.employer_org_id,
                    accounts.id AS account_id,
                    COUNT(DISTINCT employments.job_order_id) AS matching_job_order_count
                  SQL
                )
                .order(Arel.sql('matching_job_order_count DESC, employments.worker_id DESC'))
                .first
    return if candidate.blank?

    employer_org = EmployerOrg.find(candidate.employer_org_id)
    account = Account.find(candidate.account_id)
    worker = Worker.find(candidate.worker_id)
    employments = profile_employments(worker:, employer_org:)
    return if employments.size < 3

    token_result = create_login_token(account:, worker:, employer_org:)

    {
      account:,
      employer_org:,
      worker:,
      employments:,
      token_result:
    }
  end

  def profile_employments(worker:, employer_org:)
    Employment
      .joins(:job_order)
      .includes(:job_order)
      .where(worker:, job_orders: { employer_org_id: employer_org.id })
      .order('job_orders.end_on DESC, job_orders.start_on DESC, employments.id DESC')
      .to_a
  end

  def verified_account_status
    Account.statuses.fetch(Account::STATUSES.fetch(:verified))
  end

  def setup_factory_bot!
    return if @factory_bot_loaded

    require 'factory_bot_rails'
    ensure_factory_sandbox_constants
    FactoryBot.definition_file_paths = [Rails.root.join('spec/factories')]
    FactoryBot.reload
    @factory_bot_loaded = true
  rescue LoadError
    abort 'factory_bot_rails is required when the local manual UI script needs to seed data.'
  end

  def ensure_factory_sandbox_constants
    unless Object.const_defined?(:TWILIO_SANDBOX_WHATSAPP_NUMBER)
      Object.const_set(:TWILIO_SANDBOX_WHATSAPP_NUMBER, '+14155238886')
    end
    return if Object.const_defined?(:TRAVIS_WHATSAPP_NUMBER)

    Object.const_set(:TRAVIS_WHATSAPP_NUMBER, '+14049156045')
  end

  def create_record(...)
    FactoryBot.create(...)
  end

  def create_employer_org
    create_record(:employer_org, name: "Manual UI Test Farm #{suffix}", state: 'WA')
  end

  def create_account(employer_org:)
    account = create_record(:employer_account, employer_org:).account
    account.update!(
      email: "manual-ui-test-#{suffix}@example.test",
      first_name: 'Manual',
      last_name: 'Tester',
      status: Account::STATUSES.fetch(:verified)
    )
    account
  end

  def create_worker(employer_org:)
    worker = create_record(
      :worker,
      first_name: 'Elena',
      last_name: "Manual #{suffix}",
      locale: Worker::LOCALES.fetch(:en).fetch(:value)
    )
    create_record(:worker_contact, worker:, employer_org:, employee_identifier: "MUI-#{suffix}")
    worker
  end

  def create_employments(employer_org:, worker:)
    EMPLOYMENT_SCENARIOS.transform_values do |scenario|
      create_employment(
        employer_org:,
        worker:,
        name: "Manual UI Test #{scenario.fetch(:name_prefix)} #{suffix}",
        start_on: scenario.fetch(:start_on).call,
        end_on: scenario.fetch(:end_on).call,
        completed_steps: scenario.fetch(:completed_steps)
      )
    end
  end

  def create_login_token(account:, worker:, employer_org:)
    LoginTokens::Issuer.call(
      account:,
      redirect_path: redirect_path(worker:, employer_org:),
      delivery_channel: LoginToken::CHANNELS.fetch(:email),
      expires_in: 2.days
    )
  end

  def payload(account:, employer_org:, worker:, employments:, token_result:, setup_mode:)
    {
      scenario: 'worker-profile-job-orders',
      setup_mode:,
      seeded_records: setup_mode == 'seeded',
      host:,
      login_url: "#{host}#{routes.auth_login_path(token: token_result.raw_token)}",
      redirect_path: token_result.login_token.redirect_path,
      account: account_payload(account),
      records: records_payload(employer_org:, worker:, employments:),
      manual_test_steps: manual_test_steps(worker:, employments:, setup_mode:)
    }
  end

  def account_payload(account)
    {
      id: account.id,
      email: account.email
    }
  end

  def records_payload(employer_org:, worker:, employments:)
    job_orders = ordered_job_orders(employments)

    {
      employer_org_id: employer_org.id,
      worker_id: worker.id,
      job_order_count: job_orders.length,
      expected_job_order_ids_in_order: job_orders.map(&:id),
      expected_job_order_names_in_order: job_orders.map(&:name),
      top_job_order_id: job_orders.first&.id,
      second_job_order_id: job_orders.second&.id,
      third_job_order_id: job_orders.third&.id
    }
  end

  def redirect_path(worker:, employer_org:)
    routes.employer_worker_path(worker, employer_org_id: employer_org.id)
  end

  def create_employment(employer_org:, worker:, name:, start_on:, end_on:, completed_steps:)
    job_order = create_record(
      :job_order,
      employer_org:,
      name:,
      start_on:,
      end_on:,
      state: 'WA',
      requested_h2a_worker_count: 12
    )

    employment = create_record(:employment, :with_verified_documents, worker:, job_order:)
    create_checklist(employment:, completed_steps:)
    employment
  end

  def create_checklist(employment:, completed_steps:)
    CHECKLIST_STEP_NAMES.each_with_index do |step_name, index|
      create_checklist_step(
        employment:,
        step_name:,
        index:,
        completed: index < completed_steps
      )
    end
  end

  def create_checklist_step(employment:, step_name:, index:, completed:)
    onboarding_step = create_onboarding_step(employment:, step_name:)
    packet_step = create_packet_step(employment:, onboarding_step:, index:)
    completed_at = completed ? (index + 1).days.ago : nil

    create_record(
      :employment_onboarding_step,
      employment:,
      onboarding_packet_step: packet_step,
      started_at: completed_at&.-(30.minutes),
      completed_at:
    )
  end

  def create_onboarding_step(employment:, step_name:)
    create_record(
      :onboarding_step,
      employer_org: employment.job_order.employer_org,
      name: "#{step_name} #{suffix} #{employment.job_order_id}",
      step_type: OnboardingStep::STEP_TYPES.fetch(:add_document_upload)
    )
  end

  def create_packet_step(employment:, onboarding_step:, index:)
    create_record(
      :onboarding_packet_step,
      employer_org: employment.job_order.employer_org,
      onboarding_packet: employment.job_order.onboarding_packet,
      onboarding_step:,
      order: index
    )
  end

  def ordered_job_orders(employments)
    employment_list(employments)
      .map(&:job_order)
      .sort_by { |job_order| [job_order.end_on, job_order.start_on, job_order.id] }
      .reverse
  end

  def employment_list(employments)
    return employments.values if employments.is_a?(Hash)

    employments
  end

  def search_example(job_orders)
    job_orders.each do |job_order|
      searchable_tokens(job_order).each do |query|
        expected_count = matching_job_order_count(job_orders:, query:)
        return { query:, job_order:, expected_count: } if expected_count == 1
      end
    end

    query = job_orders.first.name
    { query:, job_order: job_orders.first, expected_count: matching_job_order_count(job_orders:, query:) }
  end

  def searchable_tokens(job_order)
    searchable_values(job_order)
      .flat_map { |value| value.scan(/[[:alnum:]][[:alnum:]-]{2,}/) }
      .uniq
  end

  def searchable_values(job_order)
    [
      job_order.name,
      job_order.dol_title,
      job_order.city,
      job_order.state,
      job_order.dol_eta_case_number,
      job_order.swa_job_number
    ].compact.map(&:to_s)
  end

  def matching_job_order_count(job_orders:, query:)
    normalized_query = query.downcase

    job_orders.count do |job_order|
      searchable_values(job_order).any? { |value| value.downcase.include?(normalized_query) }
    end
  end

  def manual_test_steps(worker:, employments:, setup_mode:)
    job_orders = ordered_job_orders(employments)
    top_job_order, second_job_order, third_job_order = job_orders.first(3)
    example = search_example(job_orders)
    seed_note =
      if setup_mode == 'existing'
        'This scenario reuses existing local database records; the script created only a login token.'
      else
        'This scenario uses synthetic Manual UI Test records because no existing matching scenario was found.'
      end

    [
      'Open login_url in the browser. The token expires in two days.',
      seed_note,
      "Confirm the worker profile header shows #{worker.last_name}, #{worker.first_name}.",
      'Open the Job Orders tab.',
      "Confirm #{top_job_order.name} appears above #{second_job_order.name}, " \
      "and #{second_job_order.name} appears above #{third_job_order.name}.",
      'Confirm each job order shows only its summary row at first and the documents/checklist body is collapsed.',
      "Expand #{second_job_order.name} and confirm Identity Documents, Signed And Uploaded Documents, " \
      'and Checklist sections appear.',
      "Search for \"#{example.fetch(:query)}\" and confirm #{example.fetch(:expected_count)} matching " \
      'job order card(s) remain.',
      'Clear the search, then click Open worker in job order on any card and confirm the job order context opens.'
    ]
  end
end
# rubocop:enable Metrics/AbcSize, Metrics/ClassLength, Metrics/MethodLength, Metrics/ParameterLists

puts JSON.pretty_generate(
  CroftManualUiSeed.new(
    host: options.fetch(:host),
    force_seed: options.fetch(:force_seed),
    reuse_only: options.fetch(:reuse_only)
  ).call
)
