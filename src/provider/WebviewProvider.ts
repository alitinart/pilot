import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export default class WebviewProvider implements vscode.WebviewViewProvider {
  htmlPath: string = "";

  constructor(private readonly _extensionUri: vscode.Uri, htmlPath: string) {
    this.htmlPath = htmlPath;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const htmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "views",
      this.htmlPath
    );
    const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");

    return htmlContent;
  }
}
