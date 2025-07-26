import * as vscode from "vscode";

import WebviewProvider from "./provider/WebviewProvider";
import OllamaCompletionProvider from "./provider/OllamaCompletionProvider";
import OllamaService from "./service/OllamaService";
import getSetting from "./conf/getSetting";

const ollamaService = OllamaService.getInstance();
const model = getSetting<string>("model");

export async function activate(context: vscode.ExtensionContext) {
  if (model) {
    await ollamaService.loadModel(model);
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "main",
      new WebviewProvider(context.extensionUri, "main", [
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

  vscode.window.showInformationMessage("Pilot Ready 🚀");
}

export async function deactivate() {
  if (model) {
    await ollamaService.unloadModel(model);
  }
}
