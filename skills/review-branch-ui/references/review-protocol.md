# Review Protocol

## Checkout And Server

- If the review target came from GitHub, verify local `HEAD` matches the reviewed PR head SHA.
- If the local app server is already running different code and cannot be safely repointed, stop and report the UI as untested locally.
- Use the real changed entrypoint, not only a page shell.

## Account Discovery

- Query candidate emails with `bin/rails runner` when the app is Rails.
- Validate the expected password through the app auth path, not by guessing from hashes.
- Use `RodauthApp.rodauth(...).valid_login_and_password?(login:, password: 'password')` when that pattern is available.
- If no account of the needed type exists, report that exact reason.
- If accounts exist but no credential can be confirmed, report that exact reason.

## Agent Browser Checks

- Run `agent-browser --help` or another lightweight availability check first.
- For modal or Turbo flows, verify the interactive contract, not just the initial render.
- Re-snapshot after page transitions when the flow changes the DOM.

## Output Examples

Passing UI:

```text
UI: The main changed flow works correctly in agent-browser.
```

No UI:

```text
UI: Not applicable.
```

Untested UI:

```text
UI: The main changed flow could not be tested in agent-browser because ...
UI1 -> general comment -> I could not manually test ... because ...
```

Failing UI:

```text
UI: The main changed flow does not work correctly in agent-browser.
UI1 -> general comment -> ...
```

Return only UI-specific review output. Do not mix logic or style findings into this skill.
