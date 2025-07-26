import * as vscode from "vscode";

import WebviewProvider from "./provider/WebviewProvider";
import OllamaCompletionProvider from "./provider/OllamaCompletionProvider";
import OllamaService from "./service/OllamaService";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("pilot.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from pilot!");
  });
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

  context.subscriptions.push(disposable);
}

export function deactivate() {}
