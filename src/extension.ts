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

export async function activate(context: vscode.ExtensionContext) {
  if (model) {
    await ollamaService.loadModel(model);
  }
  await indexWorkspace(context, ollamaService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "chat",
      new WebviewProvider(context.extensionUri, "chat", [
        "main.js",
        "styles.css",
        "icon.svg",
      ])
    )
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
    vscode.commands.registerCommand("pilot.openWebview", () => {
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
