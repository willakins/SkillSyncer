# Sync Model

SkillSyncer treats the repository as the shared source of truth for team skills while still allowing users to create or edit skills locally.

## File Layout

Planned repository layout:

```text
skills/
`-- <skill-name>/
    |-- SKILL.md
    |-- scripts/
    |-- references/
    `-- assets/
```

Only `SKILL.md` is required for a skill. Supporting folders are optional and should stay inside the skill directory so a skill can be copied as one unit.

The local Codex skills directory is expected to use the same shape:

```text
~/.codex/skills/
`-- <skill-name>/
    `-- SKILL.md
```

The local path must be configurable because users may keep Codex data somewhere else.

## Direction Names

- Import or install: copy from repository `skills/` to the local skills directory.
- Update: pull latest git changes, then install changed repository skills locally.
- Replace local: back up the local skills directory, delete it, then copy every valid repository skill into the local skills directory.
- Export: copy from the local skills directory to repository `skills/`.
- Publish: commit and push exported repository changes.

These names should be used consistently in the CLI, GUI, and documentation.

Current export support is intentionally narrow: it copies local-only skills into missing repository skill directories. It does not overwrite repository skills.

## Comparison Rules

The sync engine should compare skills by directory name first. Within each skill directory, it should compare file paths and file contents.

At minimum, the plan should classify each skill as:

- Repo only.
- Local only.
- Same on both sides.
- Changed on repo side.
- Changed on local side.
- Changed on both sides.
- Invalid skill directory.

The current scaffold can detect repo-only, local-only, same, changed-on-both-sides, and invalid skill directories. It does not yet keep last-sync metadata, so it cannot distinguish "changed on repo side only" from "changed on local side only" when a skill exists on both sides with different contents.

## Conflict Handling

A conflict exists when both sides changed and the tool cannot safely choose a winner.

Conflicts should not be resolved automatically in the first version. The user should choose whether to keep local, use repo, skip, or manually review.

## Backups

Before replacing local skill files, the tool should create a timestamped backup unless the user explicitly disables backups.

Backups should include enough path context to restore the previous skill version.

The current replace-local flow backs up the entire local skills directory to `skillsyncer-backups/skills-<timestamp>` next to the local skills directory before deleting and recreating it.

## Git Behavior

Repository sync uses normal git operations:

- Pull to receive shared skill changes.
- Commit to add or update skills in the repository.
- Push to publish skills to the remote.

The tool should detect and explain these states:

- Repository is not a git checkout.
- Remote is missing.
- Branch is behind or diverged.
- Working tree has unrelated changes.
- Merge conflict exists.
- Authentication failed.

## What Not To Store

Do not store machine-specific absolute paths in skill files.

Do not store credentials, API keys, local `.env` files, app build artifacts, dependency folders, or generated caches in the skill repository.
