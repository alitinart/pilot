import * as vscode from "vscode";
import WebviewProvider from "./provider/WebviewProvider";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("pilot.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from pilot!");
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "main",
      new WebviewProvider(context.extensionUri, "/main/index.html")
    )
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
