# Security Policy

## API Keys

- API keys are stored locally in the application's user data directory.
- Keys are never hardcoded, logged, or transmitted to third parties.
- Keys are entered by the user in Settings → AI Providers.

## Desktop Automation

- All desktop automation requires explicit permission per category:
  - Screen capture
  - Keyboard input
  - Mouse control
  - Terminal execution
  - File operations
- Permissions are disabled by default.
- The Python Desktop Agent runs as a local process. No remote connections.

## Dangerous Operations

The following operations require explicit user confirmation:
- Deleting files
- Moving more than 5 files
- Executing terminal commands (flagged dangerous patterns)
- Installing software
- Changing system settings

Dangerous command patterns include but are not limited to:
- `rm -rf`, `del /s`, `format`
- `reg delete`, `reg add` (registry changes)
- `shutdown`, `restart`
- `taskkill /f` (force kill)

## File Access

- File operations are restricted to allowed directories (user home, desktop, documents by default).
- Path traversal attempts are blocked.
- The agent validates all paths before operations.

## Screen Capture

- Screen capture is never performed without explicit user permission.
- The Screen Analysis panel requires the user to click "Capture Screen".
- No background screen recording.

## Reporting

Report security issues to: security@arangetech.com
