# Pilot

**Pilot** is a self-hosted, privacy-first coding assistant built as a extension for Visual Studio Code. It offers inline code completions and an AI-powered chat interface, helping you write, debug, and understand code faster, all without sending your data to third parties.

# Features

- ✨ Inline Code Completions
  Real-time completions tailored to your context using your own self-hosted models.

- 💬 Chat with AI
  A full-featured developer chat assistant inside the activity bar sidebar.

- 📁 Workspace Indexing
  Index your project to enhance the assistant’s understanding of your codebase.

- 🧠 Customizable System Prompts
  Fine-tune how Pilot behaves in both inline and chat interactions.

- ⌨️ Keyboard Shortcuts

  - Ctrl+Shift+Space / Cmd+Shift+Space: Rerun inline completion

  - Ctrl+Alt+P / Cmd+Alt+P: Open chat

  - Ctrl+Alt+I / Cmd+Alt+I: Index workspace

---

## Requirements

To use Pilot, you need to run a self-hosted Ollama server with models like:

codellama:instruct (for inline completion and chatting)

nomic-embed-text:latest (for embedding workspace context)

Install Ollama and start your model with:

```bash
ollama run codellama:instruct
```

You can configure the server address and model names in your VS Code settings.

---

## Extension Settings

This extension contributes the following settings:

- pilot.serverUrl: Sets the local or remote Ollama server URL.

- pilot.model: The model used for inline code completions.

- pilot.embeddingModel: The model used for embedding your workspace context.

- pilot.autoCompleteSystemMessage: Customize the behavior of the inline assistant (default: strict code-only completions).

- pilot.chatSystemMessage: Define how Pilot behaves in chat (default: focused, technical assistant).

You can modify these in your VS Code settings panel (Cmd/Ctrl + , → Search "Pilot").

---

## Known Issues

- 🐞 Indexing extremely large workspaces may affect performance.

- 🔁 The assistant currently does not persist chat history across reloads.

---

## Release Notes

### 1.0.0

- Initial release of Pilot

- Inline code completions

- AI-powered chat

- Workspace indexing

- Customizable prompts

---

## Contributing

Welcome contributors! Feel free to fork and create pull requests for issues that you have a fix.

---

## License

MIT © [Nart Aliti](https://github.com/alitinart)

Enjoy using Pilot and take full control of your coding assistant! 🚀
