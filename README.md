# Arcange AI Assistant

> Your intelligent AI assistant for your computer.

**Arcange Tech Solutions**

A production-ready Windows AI desktop assistant built with Electron, React, TypeScript, Node.js, and a Python Desktop Agent. It provides AI chat, voice interaction, screen awareness, browser automation, file operations, terminal control, memory, and multi-model support.

---

## Features

- **AI Chat** — Real streaming responses via Google Gemini, OpenRouter, Ollama, or LM Studio
- **Multi-Model Support** — Switch between providers and assign models for different roles (Fast, Smart, Coding, Vision)
- **Desktop Automation** — Mouse, keyboard, screen, applications, files, and terminal control via a Python Desktop Agent
- **Autonomous Agent Loop** — Multi-step task planning, execution, observation, and replanning
- **Screen Awareness** — Screenshot capture and vision-based analysis of what's on screen
- **Browser Agent** — Playwright-powered browser automation (navigate, search, click, type, extract)
- **Voice Assistant** — Speech-to-text and text-to-speech with architecture for future wake-word detection
- **Memory** — Persistent memory across sessions with user-controlled categories
- **RAG Knowledge Base** — Ingest PDF, DOCX, TXT, CSV, Markdown, and Images for retrieval-augmented generation
- **Coding Agent** — Project explorer, code editor, terminal, and AI-assisted coding tools
- **Automation Workflows** — Create and run multi-step workflows (e.g., "Start my coding session")
- **Permission System** — Confirmation required before dangerous operations
- **Activity Monitor** — Real-time view of what Arcange is doing
- **System Tray** — Minimize to tray, quick actions
- **Global Hotkey** — Press `Ctrl+Shift+A` to bring Arcange to the front
- **Command Palette** — Press `Ctrl+K` for quick navigation and actions
- **Onboarding Screen** — Guided setup on first launch
- **Conversation Export** — Export chats as Markdown, JSON, or plain text
- **Windows Startup** — Optional auto-start with Windows (disabled by default)

---

## Architecture

```
┌─────────────────────────────────────┐
│       ARCANGE AI DESKTOP APP        │
│   React UI + Electron + TypeScript   │
└──────────────────┬──────────────────┘
                   │ IPC / WebSocket
┌──────────────────▼──────────────────┐
│       ARCANGE AI ENGINE             │
│  Planner | Agent Router | Executor  │
│  Memory | Model Manager | Providers │
└──────────────────┬──────────────────┘
                   │ JSON-RPC (stdin/stdout)
┌──────────────────▼──────────────────┐
│     WINDOWS DESKTOP AGENT (Python)   │
│  Mouse | Keyboard | Screen | Apps   │
│  Files | Terminal                    │
└─────────────────────────────────────┘
```

### Project Structure

```
arcange-ai-assistant/
├── apps/desktop/
├── frontend/           # React + Vite + Tailwind UI
├── backend/            # Backend services
├── ai-engine/          # AI providers, planner, executor, agents, memory
│   ├── providers/      # Gemini, OpenRouter, Ollama providers
│   ├── planner/         # Task planning
│   ├── executor/        # Tool execution + agent loop
│   ├── memory/          # Persistent memory
│   └── agents/          # Agent definitions + routing
├── desktop-agent/      # Python Windows automation agent
│   ├── mouse/
│   ├── keyboard/
│   ├── screen/
│   ├── applications/
│   ├── filesystem/
│   └── terminal/
├── browser-agent/      # Playwright browser automation
├── voice/              # STT + TTS
├── vision/             # Screen analysis
├── rag/                # Document processing + vector store
├── electron/           # Electron main process + IPC + tray
├── scripts/            # Dev, build, package scripts
├── tests/
├── docs/
├── .github/workflows/  # CI/CD — Windows builds
├── package.json
├── electron-builder.yml
├── .env.example
└── README.md
```

---

## Building on GitHub Actions

You do NOT need to build anything locally. GitHub Actions automatically builds the Windows installer and portable executable on every push.

### How It Works

When you push code to the `main` or `master` branch, GitHub Actions:
1. Spins up a `windows-latest` runner
2. Installs Node.js LTS and all dependencies
3. Type-checks the frontend with TypeScript
4. Builds the frontend with Vite
5. Packages the app with electron-builder
6. Produces `ArcangeAI-Setup.exe` (NSIS installer) and `ArcangeAI.exe` (portable)
7. Uploads both as downloadable artifacts

### Step 1: Push Your Code to GitHub

```bash
# Initialize git if you haven't
cd arcange-ai-assistant
git init
git add .
git commit -m "Initial commit — Arcange AI Assistant"

# Create a repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/arcange-ai-assistant.git
git branch -M main
git push -u origin main
```

### Step 2: Wait for the Build

1. Go to your repo on GitHub
2. Click the **Actions** tab
3. You'll see a workflow called "Build Windows App" running
4. Wait for it to finish (usually 5-10 minutes)

### Step 3: Download the Built Executables

1. Click on the completed workflow run
2. Scroll down to the **Artifacts** section
3. Download one of:
   - `ArcangeAI-Setup` — the Windows installer (.exe)
   - `ArcangeAI-Portable` — the portable standalone (.exe)
   - `ArcangeAI-All-Builds` — everything in the dist folder
4. Unzip the downloaded artifact
5. Run `ArcangeAI-Setup.exe` to install, or run `ArcangeAI.exe` directly (portable)

### Step 4: Create a Release (Optional)

To create a proper GitHub Release with downloadable files:

```bash
# Tag a version and push it
git tag v1.0.0
git push origin v1.0.0
```

This triggers the workflow which:
1. Builds both executables on Windows
2. Creates a GitHub Release named "Arcange AI Assistant v1.0.0"
3. Attaches `ArcangeAI-Setup.exe` and `ArcangeAI.exe` to the release
4. Anyone can download them from the Releases page

Pre-release tags (e.g., `v1.0.0-beta`) are marked as pre-releases automatically.

### Manual Build Trigger

You can also trigger a build manually:
1. Go to **Actions** tab in your GitHub repo
2. Select "Build Windows App"
3. Click **Run workflow**
4. Choose the branch and click **Run workflow**

### Build Outputs

| Artifact | Description | How to Use |
|----------|-------------|------------|
| `ArcangeAI-Setup.exe` | NSIS installer | Run to install with shortcuts + uninstaller |
| `ArcangeAI.exe` | Portable executable | Run directly, no installation needed |

### Build Configuration

The build is configured in two files:
- `.github/workflows/build-windows.yml` — the CI/CD pipeline
- `electron-builder.yml` — the electron-builder packaging config

### Auto-Update (Future)

The electron-builder config includes a `publish` section (commented out). To enable auto-updates:

1. Uncomment the `publish` section in `electron-builder.yml`
2. Replace `YOUR_GITHUB_USERNAME` with your GitHub username
3. Set the `GH_TOKEN` environment variable in your GitHub repo secrets
4. Future releases will automatically check for updates and notify users

---

## Getting Started (Local Development)

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+ (for desktop agent)
- **Windows 10 or 11** (for desktop automation features)

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install Python desktop agent dependencies
cd desktop-agent
pip install -r requirements.txt
```

### Development

```bash
# Start both frontend and Electron in dev mode
npm run dev

# Or separately:
npm run dev:frontend   # Vite dev server on :5173
npm run dev:electron   # Electron app
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your API keys:
   - `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
   - `OPENROUTER_API_KEY` — from https://openrouter.ai/keys
3. Or enter API keys in **Settings → AI Providers** within the app

---

## Building Locally (Optional)

```bash
# Build frontend only
npm run build:frontend

# Build Windows installer + portable
npm run build:windows

# Full packaging (includes desktop agent resources)
npm run package
```

This produces:
- `dist/ArcangeAI-Setup.exe` — Windows installer (NSIS)
- `dist/ArcangeAI.exe` — Portable version

---

## AI Providers

### Google Gemini
- Get an API key from Google AI Studio
- Available models are fetched dynamically
- Supports vision (image understanding)

### OpenRouter
- Get an API key from OpenRouter
- Access models from: Anthropic, OpenAI, Google, DeepSeek, Qwen, Meta, Mistral, xAI
- Supports streaming

### Local Models (Ollama / LM Studio)
- Architecture ready for offline/local model support
- Configure base URL in settings

---

## Desktop Automation

Arcange includes a Python Desktop Agent that provides:

| Category | Tools |
|----------|-------|
| **Mouse** | move, click, double-click, right-click, scroll, drag |
| **Keyboard** | type text, press key, hotkeys |
| **Screen** | screenshot, find UI element, find text, get pixel color |
| **Applications** | open, close, launch, list running, focus |
| **Files** | create, read, write, rename, move, copy, delete, list, search |
| **Terminal** | execute command, PowerShell, Python |

All automation requires explicit permission per category in **Settings → Desktop**.

---

## Permission System

Before dangerous operations, Arcange shows a confirmation dialog:

```
Arcange wants permission
Action: Delete 15 files
[Cancel] [Allow]
```

Dangerous operations include:
- Deleting files
- Moving large numbers of files
- Executing dangerous terminal commands
- Changing system settings
- Installing software

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Ctrl+N` | New Chat |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+Shift+T` | Toggle Theme |
| `Ctrl+Shift+V` | Voice Mode |
| `Ctrl+Shift+A` | Global Hotkey (bring Arcange to front) |

---

## Security

- API keys are stored locally and never hardcoded
- Screen capture requires explicit permission
- All file operations are restricted to allowed directories
- Dangerous terminal commands are blocked by default
- The desktop agent runs as a local process — no remote connections
- Audit logs track all automation actions

---

## License

MIT © Arcange Tech Solutions
