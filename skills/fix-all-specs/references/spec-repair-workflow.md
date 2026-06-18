# Spec Repair Workflow

## Defaults

- Default `source_branch` to the current branch.
- Default `base_branch` to `main`.
- In Croft, use `RAILS_ENV=test bin/rails run specs` for spec runs so specs use the repo's parallel runner against test databases. In generic Rails repos, use `bundle exec rspec`.
- Do not run the full suite by default.
- The user should be able to trigger the workflow with a minimal prompt.

## Source Of Truth

- Read `git status -sb` before choosing the spec set or committing anything.
- Read the branch diff against `base_branch`.
- Understand the changed code before choosing what specs to run.
- Use the repo's existing spec guidance, but optimize for the spec set that could newly fail because of this branch.
- Use the local `write-commit-name` skill for repair commit subjects.
- Do not assume pre-existing dirty worktree files belong in the repair just because they are present.

## Core Idea

`Fix all specs` means:

1. Understand the branch and its blast radius.
2. Run all specs that could fail because of this branch.
3. Fix failures until that affected spec set is green.
4. Rerun the affected spec set to confirm nothing regressed.
5. Commit each major repair round intentionally without sweeping unrelated local WIP into the repair batch.

Do not interpret this as "always run the full repo spec suite" unless the branch is truly global in scope.

## Blast Radius Rules

Start with changed files, then widen to affected specs:

- Changed spec files: always include them.
- Changed models: include matching model specs and directly impacted service, query, presenter, request, and system specs.
- Changed services, jobs, or queries: include their direct specs plus request, system, and model specs that exercise them.
- Changed controllers, views, components, or helpers: include matching request specs, component or presenter specs, and critical system specs for the changed UI flow.
- Changed migrations, schema, test support, shared infrastructure, or config: widen aggressively because many domains may be affected.
- Changed authorization, shared concerns, or shared presenters: include direct specs plus the most important entrypoint specs that rely on them.

If failures show broader impact than the initial target set, widen the target set and continue.

## When To Run Broader

Run broader than the initial blast radius when the branch touches:

- `spec/support`
- global initializers
- framework or test configuration
- shared helpers used across many domains
- database schema changes with broad model impact
- cross-cutting authorization or shared query behavior

Only run a bare `bundle exec rspec` when the branch is truly global or targeted runs can no longer give confidence.

## Run Strategy

- In Croft, use `RAILS_ENV=test bin/rails run specs` with explicit spec paths or line numbers. This command delegates to `bin/run-specs`, sets up parallel test databases, and runs `parallel_rspec` with the repo runtime log.
- If a Croft parallel run fails, rerun only the failed spec files before widening. Prefer `RAILS_ENV=test bin/rails run specs FAILED_SPEC_FILES` for the rerun.
- In generic Rails repos, use `bundle exec rspec` with explicit spec paths or line numbers.
- Prefer rerunning the narrowest failing subset while fixing.
- After a fix is green locally, rerun the full affected spec set, not only the single failing example.
- Focus on the summary at the bottom of spec output.

Examples:

```bash
RAILS_ENV=test bin/rails run specs spec/models/worker_spec.rb spec/requests/employer/job_orders/missing_worker_details_spec.rb
RAILS_ENV=test bin/rails run specs spec/services/employer/rollup/missing_employee_identifier_service_spec.rb:42
```

## Repair Rules

- Fix the real cause, not just the first symptom.
- Keep tests with the code they validate.
- If the branch is too large or mixed to reason about cleanly, stop and use `split-branch-into-stack`.
- If repeated failures reveal broader correctness problems beyond specs alone, consider `review-branch-until-clean`.

## Stop Conditions

Stop when one of these is true:

- The affected spec set runs clean.
- The branch should be split before further repair work.
- The failures depend on an environment or setup blocker rather than code in the branch.

## Output Format

Return a short Markdown summary with:

- review base branch
- affected spec set that was run
- any widened blast-radius decisions
- repair commits created
- final green spec commands

Use inline code paths. Do not emit local filesystem links.
