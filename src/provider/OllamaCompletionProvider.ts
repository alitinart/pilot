import * as vscode from "vscode";
import OllamaService from "../service/OllamaService";
import { debounce } from "../conf/debounce";

export default class OllamaCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  serverUrl: string | undefined;
  model: string | undefined;
  systemMessage: string | undefined;
  embeddingModel: string | undefined;
  ollamaService: OllamaService = OllamaService.getInstance();

  private currentCancellationTokenSource?: vscode.CancellationTokenSource;

  constructor() {
    const config = vscode.workspace.getConfiguration("pilot");

    this.serverUrl = config.get<string>("serverUrl");
    this.model = config.get<string>("model");
    this.systemMessage = config.get<string>("systemMessage");
    this.embeddingModel = config.get<string>("embeddingModel");
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null | undefined> {
    this.currentCancellationTokenSource?.cancel();
    this.currentCancellationTokenSource = new vscode.CancellationTokenSource();
    const linkedToken = this.mergeCancellationTokens(
      token,
      this.currentCancellationTokenSource.token
    );

    if (linkedToken.isCancellationRequested) {
      return undefined;
    }

    const currentContext = document.getText(
      new vscode.Range(
        new vscode.Position(Math.max(0, position.line - 20), 0),
        position
      )
    );

    const prompt = `
<<SYS>>
${this.systemMessage}
The code is written in this file ${document.fileName}
<</SYS>>

Complete the following code based on the context:
${currentContext}
`;

    try {
      const completion = debounce(
        await this.ollamaService.completion(prompt, linkedToken),
        1000
      )();

      if (linkedToken.isCancellationRequested || !completion) {
        return undefined;
      }

      return [
        new vscode.InlineCompletionItem(
          completion,
          new vscode.Range(position, position)
        ),
      ];
    } catch (err) {
      if (linkedToken.isCancellationRequested) {
        return undefined;
      }
      console.error("Error during completion:", err);
      return undefined;
    }
  }

  private mergeCancellationTokens(
    token1: vscode.CancellationToken,
    token2: vscode.CancellationToken
  ): vscode.CancellationToken {
    const source = new vscode.CancellationTokenSource();
    token1.onCancellationRequested(() => source.cancel());
    token2.onCancellationRequested(() => source.cancel());
    return source.token;
  }
}
