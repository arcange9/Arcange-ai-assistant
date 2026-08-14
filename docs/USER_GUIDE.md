# Arcange AI Assistant — User Guide

## First Time Setup

### 1. Install
Run `ArcangeAI-Setup.exe` and follow the installer. Choose your installation directory and whether to create shortcuts.

### 2. Add API Keys
Open **Settings → AI Providers**:
- **Google Gemini**: Enter your Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey))
- **OpenRouter**: Enter your OpenRouter key (from [openrouter.ai/keys](https://openrouter.ai/keys))

### 3. Enable Desktop Automation (Optional)
Go to **Settings → Desktop** and enable the permissions you want:
- Screen capture
- Keyboard control
- Mouse control
- Terminal execution
- File operations

### 4. Start Chatting
Type in the input bar or use the microphone button for voice input.

---

## Using Arcange

### Chat
- Type messages in the input bar at the bottom
- Press Enter to send, Shift+Enter for a new line
- Attach files with the paperclip icon
- Use the model selector to switch between Fast/Smart/Coding/Vision models
- Select different agents for specialized tasks

### Agent Types
| Agent | Best For |
|-------|---------|
| General | Everyday questions and tasks |
| Coding | Writing, debugging, and explaining code |
| Desktop | Controlling your computer (mouse, keyboard, apps) |
| Browser | Web browsing and information extraction |
| Research | Deep web research on a topic |
| File | Organizing and managing files |
| Automation | Creating and running workflows |

### Voice
- Click the microphone icon to start recording
- Speak your message
- Arcange will transcribe and respond
- TTS will read the response aloud (enable in Settings → Voice)

### Screen Analysis
- Go to the Screen Analysis panel
- Click "Capture Screen" (requires permission)
- Click "Analyze" to let Arcange understand what's on screen
- Ask questions about the screen content

### Memory
- Arcange remembers information across sessions
- View and manage memories in the Memory panel
- Categories: Preferences, Conversations, Projects, Facts, Tasks
- Delete individual memories or clear all

### Knowledge Base (RAG)
- Upload documents (PDF, DOCX, TXT, CSV, Markdown, Images)
- Arcange processes and indexes them
- Ask questions about the content
- Documents are chunked and embedded for retrieval

### Coding Workspace
- Open the Coding panel for a full development environment
- Browse files in the project explorer
- Edit code with syntax highlighting
- Use AI to explain, generate, debug, refactor, or test code
- Run code in the built-in terminal

### Automation Workflows
- Go to the Automation panel
- Create multi-step workflows
- Example: "Start my coding session" → Open VS Code → Open project → Start dev server
- Run, pause, or stop workflows
- View execution history

### Browser Agent
- Open the Browser Agent panel
- Enter a URL or search query
- Arcange can navigate, click, type, scroll, and extract content
- Watch the browser preview

---

## System Tray

Right-click the Arcange icon in the system tray for:
- Open Assistant
- Voice Mode
- Pause Automation
- Settings
- Exit

---

## Global Hotkey

Press `Ctrl+Shift+A` to bring Arcange to the front from anywhere.
Customize the hotkey in Settings.

---

## Privacy & Security

- All data is stored locally on your computer
- API keys are never shared or transmitted
- Screen capture requires explicit permission every time
- Dangerous operations require confirmation
- You can clear all data in Settings → Memory and Settings → Security
