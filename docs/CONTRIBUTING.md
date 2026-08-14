# Contributing to Arcange AI Assistant

## Development Setup

1. Clone the repository
2. Install Node.js 20+ and Python 3.11+
3. Run `npm install` in the root
4. Run `cd frontend && npm install`
5. Run `pip install -r desktop-agent/requirements.txt`
6. Run `npx playwright install chromium`
7. Copy `.env.example` to `.env` and add your API keys
8. Run `npm run dev`

## Code Style

- **TypeScript/React**: Use TypeScript strict mode. Functional components with hooks. Use Tailwind for styling. Use Zustand for state management.
- **Python**: Type hints everywhere. Use pathlib for file operations. Log to stderr (not stdout, to keep JSON-RPC clean).
- **Commits**: Use conventional commits (feat:, fix:, docs:, refactor:, test:)

## Testing

- Run `npm test` for frontend tests
- Test desktop automation manually (requires Windows)

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a PR with a clear description

## Architecture Notes

- The Electron main process uses CommonJS (require/module.exports)
- The React frontend uses ES modules (import/export) with Vite
- The Desktop Agent communicates via JSON-RPC over stdin/stdout
- Never expose Node.js APIs directly to the renderer process — use contextBridge
