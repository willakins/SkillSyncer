# GUI

The desktop app should make the same sync operations available to users who do not want to manage skill files by hand.

The current Electron app starts on an embedded Cognito login screen. Signed-in users land on a Repos and Organizations view, then can open the existing Dashboard, Settings, and Backups views. The dashboard uses user-facing shared-library and device language, showing shared-only, device-only, changed, invalid, and unchanged skill counts, plus separate shared and device skill lists. It calls shared sync logic through a narrow preload bridge.

The dashboard can install shared-only skills onto this device, share device-only skills into the shared library without overwriting existing shared skills, and resolve changed-on-both-sides skills by using the shared version or keeping the device version.

The dashboard shows optional library manifest metadata when `skillsyncer.json` is present, including library name, description, recommended/optional counts, and tags.

The dashboard can also reset this device from the shared library. This action requires confirmation, backs up the existing device skills, clears the current device skills, and loads every valid shared skill.

The Backups view lists saved backups. Each backup item shows the skills saved in that backup and provides a restore button. Restore creates a safety backup of the current local skills directory before replacing it.

The Settings view stores a local appearance preference in browser storage and saves sync configuration through the Electron main process. Users can choose Graphite, Paper, or Midnight appearances and configure the shared library skills path, device skills path, backup directory, git remote, and git branch.

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
- Configurable library, device, backup, remote, and branch preferences.

### Repos and Organizations

The signed-in landing view should show:

- Connected repos returned by the AWS metadata API.
- Organizations returned by the AWS metadata API.
- Clone URLs, default branch, provider, and capability flags.
- A route into the normal sync dashboard after the user clones or opens a local checkout.

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

Conflicts stop the sync until the user chooses an action. The app supports:

- Keep local version.
- Use shared version.

Skip and manual side-by-side review remain CLI/manual workflows.

## UX Requirements

- Preview file changes before mutating either side.
- Make destructive actions explicit.
- Prefer recoverable operations, including backups before overwrites.
- Keep errors actionable: identify the operation and suggested next step.
- Do not require users to understand storage internals for ordinary install/update workflows.

## Current State

The Electron app can authenticate with Cognito, show cloud repos and organizations, show status, display library manifest metadata, list shared/device skills, switch between Repos, Dashboard, Settings, and Backups, persist one of three appearances, save sync paths and git defaults, install shared-only skills, share device-only skills, resolve conflicts with backups, reset this device from the shared library with a backup, and restore device skills from a backup. The next GUI work is to add native clone/open directory pickers, preview details, selective update actions, broader state handling, and manual side-by-side conflict review.
