# Pilot

**Pilot** is your self-hosted, privacy-first coding assistant for Visual Studio Code. It brings AI-powered chat and inline code completions right into your editor—helping you code, debug, and explore your project faster. Best of all, your code stays yours—no data ever leaves your machine.

# Features

- ✨ Inline Code Completions
  Get real-time suggestions based on your code context, powered by your own models.

- 💬 Chat with AI
  Ask questions, get explanations, or debug problems using a smart developer assistant.

- 📁 Workspace Indexing
  Boost accuracy by indexing your project so the assistant understands your codebase better.

- 🧠 Customizable System Prompts
  Tune how Pilot behaves, both in completions and chat.

- ⌨️ **Keyboard Shortcuts**

  - Ctrl+Shift+Space / Cmd+Shift+Space: Rerun inline completion

  - Ctrl+Alt+P / Cmd+Alt+P: Open chat

  - Ctrl+Alt+I / Cmd+Alt+I: Index workspace

---

## Requirements

To use Pilot, you must run a local or remote Ollama server with 2 types of models, a normal LLM for coding and an Embedding LLM for indexing.

The ones I recommend are:

- **codellama:instruct (for inline completion and chatting)**

- **nomic-embed-text:latest (for embedding workspace context)**

You can also use other models.

Install them with:

```bash
ollama pull codellama:instruct
ollama pull nomic-embed-text:instruct
```

Then, set the server URL and model names in your VS Code settings.

**⚠️ Heads up**: If your machine isn’t powerful enough to run these models smoothly, you may notice delays during chat, completion, or indexing

---

## Extension Settings

You can configure Pilot through your VS Code settings (Cmd/Ctrl + ,, then search for "Pilot"):

- pilot.serverUrl: URL of your local/remote Ollama server

- pilot.model: Model used for inline code suggestions

- pilot.embeddingModel: Model used to understand your project context

- pilot.autoCompleteSystemMessage: Customize how inline completions behave

- pilot.chatSystemMessage: Adjust the tone/personality of the chat assistant

---

## Known Issues

- 🚫 NONE

---

## Release Notes

### 1.0.0

- Initial release of Pilot

- Inline code completions

- AI powered chat

- Workspace indexing

- Customizable prompts

---

## Contributing

Excited to have contributors on board! While contribution guidelines are still in progress, feel free to try out the extension and [report any issues](https://github.com/alitinart/pilot/issues).

---

## License

MIT © [Nart Aliti](https://github.com/alitinart)

Pilot is all about giving you control over your AI assistant—right inside your favorite editor. Happy coding! 🧑‍💻
