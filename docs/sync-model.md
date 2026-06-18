# Sync Model

SkillSyncer treats a configured skill library as the shared source of truth for team skills while still allowing users to create or edit skills locally. The first library format is still the repository `skills/` directory.

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

- Import or install: copy from library `skills/` to the local skills directory.
- Update: pull latest git changes, then install changed library skills locally.
- Replace local: back up the local skills directory, delete it, then copy every valid repository skill into the local skills directory.
- Restore backup: back up the current local skills directory, delete it, then copy a selected backup directory back into the local skills directory.
- Export: copy from the local skills directory to repository `skills/`.
- Publish: commit and push exported repository changes.

These names should be used consistently in the CLI, GUI, and documentation.

Current install support copies shared-only skills into the local directory. Existing local skills are skipped unless the caller explicitly requests overwrite; overwrite creates a backup by default before replacing the local skill directory.

Current export support is intentionally narrow: it copies local-only skills into missing repository skill directories. It does not overwrite repository skills.

## Comparison Rules

The sync engine should compare skills by directory name first. Within each skill directory, it should compare file paths and file contents.

At minimum, the plan classifies each skill as:

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

Conflicts are not resolved automatically. The CLI supports explicit `--use-library`, `--keep-device`, and `--skip` choices through `skillsync resolve`. The GUI supports using the shared version or keeping the device version for all current conflicts.

## Backups

Before replacing local skill files, the tool should create a timestamped backup unless the user explicitly disables backups.

Backups should include enough path context to restore the previous skill version.

The selective install flow backs up overwritten local skills to `skillsyncer-backups/skills-<timestamp>` by default before replacing those skill directories.

The replace-local flow backs up the entire local skills directory to `skillsyncer-backups/skills-<timestamp>` next to the local skills directory before deleting and recreating it.

The current restore-backup flow lists directories from the same backup root and restores the selected backup after first creating a `skillsyncer-backups/pre-restore-<timestamp>` safety backup of the current local skills directory.

## Git Behavior

Repository sync uses normal git operations through the shared git wrapper:

- Pull to receive shared skill changes.
- Commit to add or update skills in the repository.
- Push to publish skills to the remote.

The wrapper supports status inspection, fast-forward pull, selected skill commit, and push. Pull and push can use the current upstream or a configured remote and branch.

## Library Manifest

`skillsyncer.json` is optional. A plain `skills/` directory remains valid. When present next to `skills/`, the manifest can provide a library name, description, skill visibility, tags, and descriptions:

```json
{
  "schemaVersion": 1,
  "name": "engineering-skills",
  "description": "Shared engineering skills",
  "skillsPath": "skills",
  "skills": {
    "sentry-triage": {
      "description": "Investigate production Sentry issues",
      "tags": ["engineering", "incident-response"],
      "visibility": "recommended"
    }
  }
}
```

Invalid manifests are reported in status output, but plain folder discovery still works so users are not blocked from seeing skill files.

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
