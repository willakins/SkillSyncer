# GUI

The desktop app should make the same sync operations available to users who do not want to manage skill files by hand.

The current Electron app uses a sidebar layout with Dashboard, Settings, and Backups views. The dashboard uses user-facing shared-library and device language, showing shared-only, device-only, changed, invalid, and unchanged skill counts, plus separate shared and device skill lists. It calls shared sync logic through a narrow preload bridge.

The dashboard can share device-only skills into the shared library without overwriting existing shared skills. Changed-on-both-sides skills are still review-only until conflict handling and backups are implemented.

The dashboard can also reset this device from the shared library. This action requires confirmation, backs up the existing device skills, clears the current device skills, and loads every valid shared skill.

The Backups view lists saved backups. Each backup item shows the skills saved in that backup and provides a restore button. Restore creates a safety backup of the current local skills directory before replacing it.

The Settings view currently stores a local appearance preference in browser storage. Users can choose Graphite, Paper, or Midnight appearances.

## Target Platforms

- macOS.
- Arch Linux.

The UI should avoid assumptions that only work on one platform. Platform-specific packaging, file picker behavior, and permission handling should live outside the shared sync engine.

## Planned Screens

### First Run

The first-run flow should collect:

- Shared library location.
- Device skills location, defaulting to the standard Codex skills location when present.
- Backup storage location.

### Dashboard

The dashboard should show:

- Shared library status.
- Device skills status.
- Last successful sync.
- Counts for shared-only, device-only, changed, and conflicted skills.

### Settings

The settings view should show:

- Appearance selection.
- Future configurable library, device, and backup preferences.

### Backups

The backups view should show:

- Empty state when no backups are saved.
- Saved backup items with backup metadata.
- The skills contained in each backup.
- A restore action for each backup.

### Install and Update

This flow installs skills from the shared library onto this device.

It should show:

- Skills that will be added to this device.
- Skills that will update existing device skills.
- Skills with conflicts or device-only changes.
- Backup behavior before overwrites.

### Export and Publish

This flow shares device skill changes into the shared library.

It should show:

- New device skills that can be shared.
- Changed device skills that can update the shared version.
- A summary before changes are applied.
- Final shared-library status.

### Conflicts

Conflicts should stop the sync until the user chooses an action. The app should support at least:

- Keep local version.
- Use shared version.
- Skip for now.
- Open both versions for manual review.

## UX Requirements

- Preview file changes before mutating either side.
- Make destructive actions explicit.
- Prefer recoverable operations, including backups before overwrites.
- Keep errors actionable: identify the operation and suggested next step.
- Do not require users to understand storage internals for ordinary install/update workflows.

## Current State

The Electron app can show status, list shared/device skills, switch between Dashboard, Settings, and Backups, persist one of three appearances, share device-only skills, reset this device from the shared library with a backup, and restore device skills from a backup. The next GUI work is to add configuration, preview details, selective update actions, broader state handling, and conflict resolution.
