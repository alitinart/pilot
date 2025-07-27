import * as vscode from "vscode";
import * as fs from "fs";
import OllamaService from "../service/ai/impl/OllamaService";
import { Message } from "../types/Message";

export default class WebviewProvider implements vscode.WebviewViewProvider {
  htmlPath: string = "";
  assets: string[] = [];
  ollamaService: OllamaService;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    htmlPath: string,
    assets: string[]
  ) {
    this.htmlPath = htmlPath;
    this.assets = assets;
    this.ollamaService = OllamaService.getInstance();
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
      "media",
      this.htmlPath,
      "index.html"
    );
    const assetsFolder = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      this.htmlPath,
      "assets"
    );

    let htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");

    const fixUri = (fileName: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(assetsFolder, fileName));

    const fixedUris = this.assets.map((asset) => fixUri(asset));
    fixedUris.forEach((uri, index) => {
      htmlContent = htmlContent.replace(this.assets[index], uri.toString());
    });

    htmlContent = htmlContent.replace(
      "%GLOBAL_STYLES%",
      webview
        .asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "media", "global.css")
        )
        .toString()
    );

    webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "openSettings":
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "@ext:nartaliti.pilot"
          );
          break;
        case "sendMessage":
          const { content } = message;
          try {
            const aiResponse: Message = await this.ollamaService.chat(content);
            webview.postMessage({ command: "addMessage", ...aiResponse });
          } catch {
            webview.postMessage({ command: "error" });
          }
          break;
        default:
          vscode.window.showErrorMessage(
            "Unknown Webview message type - Pilot" + message.type
          );
      }
    });

    return htmlContent;
  }
}
