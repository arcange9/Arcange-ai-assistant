# Arcange AI Assistant — Documentation

## Architecture Overview

Arcange AI Assistant is built as a desktop-first application with three main layers:

1. **Electron + React Frontend** — The user interface, built with React, TypeScript, Tailwind CSS, and Framer Motion. Runs inside an Electron BrowserWindow with a custom title bar, system tray, and global hotkey support.

2. **AI Engine** — The intelligence layer, handling provider abstraction (Gemini, OpenRouter, Ollama, LM Studio), task planning, tool execution, the autonomous agent loop, and memory management. Communicates with the frontend via Electron IPC.

3. **Desktop Agent** — A Python process that provides Windows desktop automation: mouse, keyboard, screen capture, application management, file operations, and terminal execution. Communicates with the Electron main process via JSON-RPC over stdin/stdout.

## Communication Flow

```
User Input (React UI)
    → IPC (contextBridge)
    → Electron Main Process
    → AI Engine (planner → executor)
    → Desktop Agent (Python, JSON-RPC) or Browser Agent (Playwright)
    → Result back up the chain
    → UI Update (streaming responses, activity monitor)
```

## AI Provider System

Providers implement a common interface:
- `chat(messages, config)` → complete response
- `streamChat(messages, config, onChunk)` → streaming response
- `listModels()` → available models

Current providers:
- **GeminiProvider** — Google AI Studio API
- **OpenRouterProvider** — OpenRouter (access to Claude, GPT, Gemini, etc.)
- **OllamaProvider** — Local Ollama server
- **LMStudioProvider** — Local LM Studio server (architecture ready)

## Agent System

Agents are pre-configured profiles with specific tools and system prompts:

| Agent | Purpose | Model Role | Tools |
|-------|---------|-----------|-------|
| General | Versatile assistant | Smart | All |
| Coding | Code generation & debugging | Coding | Files, Terminal |
| Desktop | Desktop automation | Fast | Mouse, Keyboard, Screen, Apps |
| Browser | Web browsing & extraction | Smart | Browser |
| Research | Web research | Smart | Browser, Search |
| File | File management | Fast | Filesystem |
| Automation | Workflow execution | Fast | Workflows, All |

## Autonomous Agent Loop

The agent loop follows this cycle:

```
1. Understand request
2. Create task plan (planner)
3. Ask confirmation for dangerous steps (if needed)
4. Execute tool (executor)
5. Observe result
6. Replan if needed (planner)
7. Continue until complete
8. Report final response
```

Progress is shown in the Activity Monitor panel.

## Permission System

All operations are classified by risk:
- **Low** — Read files, list directories, take screenshots
- **Medium** — Write files, type text, click, open applications
- **High** — Delete files, execute terminal commands, install software, system changes

High-risk operations require explicit user confirmation via the Permission Dialog.

## Memory

Memory is persistent across sessions and stored locally. Categories:
- User Preferences
- Conversations
- Projects
- Important Facts
- Tasks

The user has full control: view, search, delete individual entries, or clear all.

## RAG Pipeline

```
Upload Document → Parse → Chunk → Embed → Vector Store → Retrieve → AI Context
```

Supported formats: PDF, DOCX, TXT, CSV, Markdown, Images (OCR)

## Build & Distribution

```
npm run dev          → Development (Vite + Electron)
npm run build        → Production frontend build
npm run build:windows → Windows installer (NSIS + Portable)
npm run package      → Full packaging
```

Output:
- `ArcangeAI-Setup.exe` — NSIS installer
- `ArcangeAI.exe` — Portable executable

GitHub Actions CI builds on `windows-latest` with Node 20 + Python 3.11.
