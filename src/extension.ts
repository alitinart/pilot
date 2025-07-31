import * as vscode from "vscode";

import WebviewProvider from "./provider/WebviewProvider";
import OllamaCompletionProvider from "./provider/ai/OllamaCompletionProvider";
import OllamaService from "./service/ai/impl/OllamaService";
import getSetting from "./conf/getSetting";
import indexWorkspace from "./conf/indexWorkspace";
import { debounceAsync } from "./conf/debounce";

const ollamaService = OllamaService.getInstance();
const model = getSetting<string>("model");
const embeddingModel = getSetting<string>("embeddingModel");

export async function activate(context: vscode.ExtensionContext) {
  let errors = [];

  if (model) {
    try {
      await ollamaService.loadModel(model);
    } catch (err) {
      errors.push(
        "❌ Failed to load models. Make sure your local LLM is running or that your model exists."
      );
    }
  } else {
    errors.push("❌ Please choose a model to use in settings");
  }

  if (embeddingModel) {
    let ex = false;
    try {
      await ollamaService.loadModel(embeddingModel);
    } catch (err) {
      ex = true;
      errors.push(
        "❌ Failed to load embedding model. Make sure your local LLM is running or that your model exists."
      );
    }
    if (!ex) {
      await indexWorkspace(context, ollamaService);
    }
  } else {
    vscode.window.showInformationMessage(
      "Couldn't index workspace. No embedding model chosen - Pilot"
    );
  }

  const provider = new WebviewProvider(
    context.extensionUri,
    ollamaService,
    "chat",
    ["main.js", "styles.css", "icon.svg"],
    errors
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
  if (embeddingModel) {
    await ollamaService.unloadModel(embeddingModel);
  }
}
