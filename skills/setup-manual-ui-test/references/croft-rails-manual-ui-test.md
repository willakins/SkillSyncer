# Croft Rails Manual UI Test Reference

## Purpose

Use this reference to set up a local, authenticated Croft UI state that a human can manually inspect in the browser. The target output is a complete manual test packet: existing or seeded data, entry link, steps, and expected outcomes.

## Local Safety Rules

- Do not reset, drop, or delete the database.
- Do not seed production, staging, demo, or any shared database unless the user explicitly asks and the repo guidance allows it.
- Prefer `Rails.env.development?` for browser QA. `Rails.env.test?` is acceptable only when a temporary server is explicitly running against the test database.
- Prefer existing local records when they already cover the requested scenario. Only create synthetic records when discovery fails or isolation is requested.
- Keep synthetic records clearly named. Use `Manual UI Test` in employer org names, job order names, workers, emails, and notes.
- Keep cleanup non-destructive. Prefer listing record IDs created and offering a small cleanup script only when the user asks.

## First Context To Read

Before writing a seed script, read:

- `config/routes.rb` for the entry path and nested resource shape.
- The target controller and any base controller that enforces authentication or tenant scope.
- The target component/view/presenter that determines what must exist to render meaningful UI states.
- `db/schema.rb` for the tables you will write.
- Relevant models for validations, callbacks, default scopes, and invariants.
- Similar specs or factories for valid local data examples.

For employer UI, especially inspect:

- `app/controllers/employer/base_controller.rb`
- `app/controllers/auth/login_tokens_controller.rb`
- `app/services/login_tokens/issuer.rb`
- `app/models/account.rb`
- `app/models/employer_account.rb`
- `app/models/employer_org.rb`

## Authentication And Tenant Scope

Croft employer pages require an authenticated `Account` and an employer org selected through cookies. The safest manual-test entry is a login token:

```ruby
routes = Rails.application.routes.url_helpers
redirect_path = routes.employer_worker_path(worker, employer_org_id: employer_org.id)
token_result = LoginTokens::Issuer.call(
  account: account,
  redirect_path: redirect_path,
  delivery_channel: LoginToken::CHANNELS.fetch(:email),
  expires_in: 2.days
)
login_path = routes.auth_login_path(token: token_result.raw_token)
login_url = "#{host}#{login_path}"
```

Why this works:

- `/auth/login/:token` consumes the token and establishes the Rodauth employer session.
- `Auth::LoginTokensController#set_redirect_cookies` parses `employer_org_id` from the redirect path and sets the current employer org cookie.
- The redirect path must be relative. Do not put a host inside `redirect_path`.

Use the local app host only when composing the final clickable URL:

```ruby
host = ENV.fetch('LOCAL_APP_URL', 'http://localhost:3000')
```

## Data Discovery Before Seeding

Before writing or running seed code, query the local database for a scenario that already exercises the requested UI state. A suitable existing scenario must include:

- The account role needed for the route, such as a verified employer `Account`.
- The tenant scope needed for cookies and authorization, such as an `EmployerOrg`.
- Domain records that satisfy the visible UI state and edge case under test.
- Any linking records that authorization scopes rely on, such as `EmployerAccount`, `WorkerContact`, `Employment`, and `JobOrder`.

Use only local development or temporary test databases. It is acceptable for the setup script to create a short-lived `LoginToken` for an existing scenario; that is authentication setup, not data seeding. In the final response, explicitly say whether records were reused or synthetic records were created.

## Seed Script Shape

Prefer `bin/rails runner` scripts for manual UI setup. Script defaults should discover existing records first and seed only as a fallback:

```bash
bin/rails runner tmp/manual_ui_tests/seed_some_flow.rb --host http://localhost:3000
```

Recommended output shape:

```json
{
  "scenario": "some-flow",
  "setup_mode": "existing",
  "seeded_records": false,
  "host": "http://localhost:3000",
  "login_url": "http://localhost:3000/auth/login/...",
  "redirect_path": "/employer/...",
  "records": {
    "employer_org_id": 1,
    "account_id": 2
  },
  "manual_test_steps": [
    "Open login_url.",
    "Confirm the page title.",
    "Perform the action.",
    "Confirm the expected result."
  ]
}
```

Use `JSON.pretty_generate` so the final response can quote or summarize the output cleanly.

## FactoryBot In Development

`factory_bot_rails` is in the development and test groups, and Croft factories encode many valid invariants. For local-only manual UI seeds, it is acceptable to load factories inside a Rails runner script, but load them only after existing-record discovery fails:

```ruby
require 'factory_bot_rails'

FactoryBot.definition_file_paths = [Rails.root.join('spec/factories')]
FactoryBot.reload
include FactoryBot::Syntax::Methods
```

Use factories when they model durable invariants that are easy to get wrong by hand, such as:

- `:employer_org`
- `:employer_account`
- `:job_order`
- `:worker`
- `:worker_contact`
- `:employment`
- identity-document traits like `:with_verified_documents`

Do not use factories as a substitute for understanding the actual UI contract. If the UI depends on a service, policy, feature gate, subscription, packet propagation, signing state, or background job, inspect and use the real app path where practical.

## Croft Worker Profile Job-Orders Example

The worker profile page is a useful baseline because it needs employer auth, a worker, multiple job orders, employments, documents, and checklist state.

Before seeding, look for an existing worker with at least three job-order employments in one employer org. The existing scenario is suitable when it has:

- `EmployerOrg`
- `Account` with `kind: Account::KINDS.fetch(:employer)` and `status: verified`
- `EmployerAccount` for the account/org pair
- `WorkerContact` linking the worker to the employer org
- At least three `JobOrder` records linked through `Employment` rows for the same worker and employer org
- Enough checklist, document, or identity-document rows to make the changed UI meaningful when the task concerns those sections

When querying `accounts.status` from another model's relation, compare against `Account.statuses.fetch(Account::STATUSES.fetch(:verified))` so the enum label is cast to the stored integer value.

If no existing worker satisfies the scenario, seed a synthetic fallback with:

- Three `JobOrder` records with different `end_on` values
- One `Employment` per job order
- `OnboardingStep`, `OnboardingPacketStep`, and `EmploymentOnboardingStep` rows for checklist display
- Optional verified identity documents linked through `EmploymentIdentityDocument`

Entry path:

```ruby
routes.employer_worker_path(worker, employer_org_id: employer_org.id)
```

Manual test steps should cover:

1. Open the authorized login URL.
2. Confirm the worker profile header displays the existing or synthetic worker.
3. Open the Job Orders tab.
4. Confirm job orders are ordered by latest `job_orders.end_on` first.
5. Confirm each job order card starts collapsed.
6. Expand a card and confirm identity documents, signed/uploaded documents, and checklist sections render.
7. Use the search field and confirm only matching job orders remain.
8. Use the "Open worker in job order" link and confirm the worker slide-over opens in the job order context.

## Starting The Rails App

If a server is not already running:

- Prefer the `start-rails-server` skill when available. It bootstraps Zellij and the global `parallel rails s` command when needed, then returns the worktree-specific `.localhost` URL.
- If using commands directly, run `parallel rails s` from the Rails app root in a visible Codex app terminal/PTY. This opens or attaches the Zellij workspace so the user can inspect and stop Rails, Tailwind, Sidekiq, and the shell panes themselves.
- Do not start manual-test servers with `nohup`, shell backgrounding, or hidden detached `bin/rails server` processes unless the user explicitly asks for that fallback.
- Use the URL printed by `parallel rails s` for seed hosts and final instructions. If the stack may already be running, check `parallel rails s status`.
- Include the final host in the answer.

If the setup script only finds or creates data, do not claim the UI is ready until either:

- the server is running, or
- you clearly state the user must start the server before opening the link.

## Opening The Browser

After generating the authorized entry URL:

- Prefer opening the `login_url` directly in the Codex in-app browser when Browser plugin tools are available.
- Use the same worktree-specific URL returned by `parallel rails s`; avoid switching back to plain `localhost` when a `.localhost` host was printed.
- If in-app browser tools are unavailable, state that explicitly and give the user the login URL.
- Do not use macOS `open` as the first choice when an in-app browser tool is available.

## Manual Instruction Quality Bar

Good instructions are specific and testable:

- Use exact existing or seeded names, IDs, and expected labels.
- Say where to click and what state should appear.
- Include negative checks when useful, such as "past job order should sort below future job order."
- Include the start URL and the fallback direct path.
- Mention token expiry.

Avoid vague instructions like "check the page looks right."

## Troubleshooting

- If the login URL redirects to `/login`, the token may be expired, already invalid, or the account is closed.
- If the login succeeds but the employer page redirects, verify the account has an `EmployerAccount` for the org and the redirect path includes `employer_org_id`.
- If a page is blank or missing records, inspect Pundit scopes and feature gates for the signed-in account.
- If the target UI relies on background jobs, either run the local Sidekiq process for the same worktree or perform the synchronous service call that creates the derived records.
- If FactoryBot is unavailable, seed with direct model/service calls after reading validations and associations.
