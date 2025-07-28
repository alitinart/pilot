import { AIService } from "./../service/ai/AIService";
import * as vscode from "vscode";
import * as fs from "fs";
import { Message } from "../types/Message";

export default class WebviewProvider implements vscode.WebviewViewProvider {
  htmlPath: string = "";
  assets: string[] = [];
  AIService: AIService;
  error?: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    AIService: AIService,
    htmlPath: string,
    assets: string[],
    error?: string
  ) {
    this.htmlPath = htmlPath;
    this.assets = assets;
    this.AIService = AIService;
    this.error = error;
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

    webviewView.webview.html = this.error
      ? this._getErrorHtml(webviewView.webview)
      : this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "reload":
          vscode.commands.executeCommand("workbench.action.reloadWindow");
          break;
        case "openSettings":
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "@ext:nartaliti.pilot"
          );
          break;
        case "sendMessage":
          const { content } = message;
          try {
            const aiResponse: Message = await this.AIService.chat(content);
            webviewView.webview.postMessage({
              command: "addMessage",
              ...aiResponse,
            });
          } catch {
            webviewView.webview.postMessage({ command: "error" });
          }
          break;
        case "requestMessages":
          const previousMessages = this.AIService.getChatMessages();
          webviewView.webview.postMessage({
            command: "previousMessages",
            messages: previousMessages,
          });
          break;
        default:
          vscode.window.showErrorMessage(
            "Unknown Webview message type - Pilot: " + message.command
          );
      }
    });
  }

  private _getErrorHtml(webview: vscode.Webview): string {
    return /* html */ `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 1rem;
              text-align: center;
            }
            button {
              background-color: #007acc;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              margin-top: 1rem;
              cursor: pointer;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <h2>🚨 Extension Error</h2>
          <p>${this.error}</p>
          <button onclick="reload()">Reload Extension</button>
          <script>
            const vscode = acquireVsCodeApi();
            function reload() {
              vscode.postMessage({ command: "reload" });
            }
          </script>
        </body>
      </html>
    `;
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

    return htmlContent;
  }
}
