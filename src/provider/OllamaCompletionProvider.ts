import * as vscode from "vscode";
import { OllamaService } from "../service/OllamaService";

export default class OllamaCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  serverUrl: string | undefined;
  model: string | undefined;
  systemMessage: string | undefined;
  embeddingModel: string | undefined;
  ollamaService: OllamaService = OllamaService.getInstance();

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
    if (token.isCancellationRequested) {
      return undefined;
    }

    const currentContext = document.getText(
      new vscode.Range(
        new vscode.Position(Math.max(0, position.line - 20), 0),
        position
      )
    );
    // const retrievedContext = this.ollamaService.retreiver(currentContext);

    const prompt = `
    <<SYS>>
    ${this.systemMessage}
    <</SYS>>

    Complete the following code based on the context:
    ${currentContext}
    `;

    const completion = await this.ollamaService.completion(prompt);

    if (token.isCancellationRequested) {
      return undefined;
    }

    return [
      new vscode.InlineCompletionItem(
        completion,
        new vscode.Range(position, position)
      ),
    ];
  }
}
