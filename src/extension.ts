import * as vscode from "vscode";

import WebviewProvider from "./provider/WebviewProvider";
import OllamaCompletionProvider from "./provider/ai/OllamaCompletionProvider";
import OllamaService from "./service/ai/impl/OllamaService";
import getSetting from "./conf/getSetting";
import indexWorkspace, {
  loadCodeChunks,
  saveCodeChunks,
} from "./conf/indexWorkspace";
import { debounceAsync } from "./conf/debounce";

const ollamaService = OllamaService.getInstance();
const model = getSetting<string>("model");
const embeddingModel = getSetting<string>("embeddingModel");

export async function activate(context: vscode.ExtensionContext) {
  let errorMessage: string | undefined;

  if (model) {
    try {
      await ollamaService.loadModel(model);
    } catch (err) {
      errorMessage =
        "❌ Failed to load model. Make sure your local LLM is running.";
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  if (embeddingModel) {
    await indexWorkspace(context, ollamaService);
  }

  const provider = new WebviewProvider(
    context.extensionUri,
    ollamaService,
    "chat",
    ["main.js", "styles.css", "icon.svg"],
    errorMessage
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("chat", provider)
  );

  vscode.languages.registerInlineCompletionItemProvider(
    { scheme: "file" },
    new OllamaCompletionProvider()
  );
  vscode.commands.registerCommand("pilot.triggerInlineCompletion", async () => {
    await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
  });

  const debouncedIndex = debounceAsync(indexWorkspace, 1000);

  vscode.workspace.onDidSaveTextDocument(async (document) => {
    await debouncedIndex(context, ollamaService, document.uri);
  });

  vscode.workspace.onDidDeleteFiles(
    async () => await indexWorkspace(context, ollamaService)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pilot.openChat", () => {
      vscode.commands.executeCommand("workbench.view.extension.chat");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pilot.indexWorkspace", async () => {
      await indexWorkspace(context, ollamaService);
      vscode.window.showInformationMessage("Workspace re-indexed ✅");
    })
  );

  vscode.window.showInformationMessage("Pilot Ready 🚀");
}

export async function deactivate() {
  if (model) {
    await ollamaService.unloadModel(model);
  }
}
