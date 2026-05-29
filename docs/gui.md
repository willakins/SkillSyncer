# GUI

The desktop app should make the same sync operations available to users who do not want to manage skill files by hand.

The current Electron app displays a dashboard with repository-only, local-only, changed, invalid, and unchanged skill counts, plus separate repository and local skill lists. It calls shared sync logic through a narrow preload bridge.

The dashboard can export local-only skills into the repository skill tree without overwriting existing repository skills. After an export, the app can commit and push the exported skill directories when the current git branch has an upstream push target. Changed-on-both-sides skills are still review-only until conflict handling and backups are implemented.

The dashboard can also replace the local skills directory from the repository skill tree. This action requires confirmation, backs up the existing local skills directory under a sibling `skillsyncer-backups/` directory, deletes the local skills directory, and imports every valid repository skill.

## Target Platforms

- macOS.
- Arch Linux.

The UI should avoid assumptions that only work on one platform. Platform-specific packaging, file picker behavior, and permission handling should live outside the shared sync engine.

## Planned Screens

### First Run

The first-run flow should collect:

- Repository location.
- Local Codex skills directory, defaulting to `~/.codex/skills` when present.
- Backup location.
- Preferred git remote and branch, when needed.

### Dashboard

The dashboard should show:

- Current repository branch and git status.
- Local skills directory path.
- Repo skills directory path.
- Last successful sync.
- Counts for repo-only, local-only, changed, and conflicted skills.

### Install and Update

This flow installs skills from the repository into the local skills directory.

It should show:

- Skills that will be added locally.
- Skills that will update existing local files.
- Skills with conflicts or local-only changes.
- Backup behavior before overwrites.

### Export and Publish

This flow copies local skill changes into the repository and prepares them for git publication.

It should show:

- New local skills that can be added to the repo.
- Changed local skills that can update repo files.
- A git diff summary before commit.
- Commit message input.
- Push status.

### Conflicts

Conflicts should stop the sync until the user chooses an action. The app should support at least:

- Keep local version.
- Use repository version.
- Skip for now.
- Open both files for manual review.

## UX Requirements

- Preview file changes before mutating either side.
- Make destructive actions explicit.
- Prefer recoverable operations, including backups before overwrites.
- Keep errors actionable: identify the path, operation, and suggested next step.
- Do not require users to understand git internals for ordinary install/update workflows.

## Current State

The Electron app can show status, list repository/local skills, export local-only skills, replace local skills from the repository with a backup, and publish the exported skill directories. The next GUI work is to add path configuration, preview details, selective import/update actions, broader git status handling, and conflict resolution.
