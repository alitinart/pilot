import * as vscode from "vscode";
import OllamaService from "../service/OllamaService";
import { debounce, debounceAsync } from "../conf/debounce";
import StatusBarProvider from "./StatusBarProvider";

const DEBOUNCE_DURATION = 700;

export default class OllamaCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  serverUrl: string | undefined;
  model: string | undefined;
  systemMessage: string | undefined;
  embeddingModel: string | undefined;
  ollamaService: OllamaService = OllamaService.getInstance();

  debouncedProvider;

  private currentCancellationTokenSource?: vscode.CancellationTokenSource;

  constructor() {
    const config = vscode.workspace.getConfiguration("pilot");

    this.serverUrl = config.get<string>("serverUrl");
    this.model = config.get<string>("model");
    this.systemMessage = config.get<string>("systemMessage");
    this.embeddingModel = config.get<string>("embeddingModel");
    this.debouncedProvider = debounceAsync(
      this._provideInlineCompletionItems.bind(this),
      DEBOUNCE_DURATION
    );
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null | undefined> {
    return this.debouncedProvider(document, position, context, token);
  }

  async _provideInlineCompletionItems(
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
        new vscode.Position(Math.max(0, position.line - 10), 0),
        position
      )
    );

    let projectContext = "";
    if (this.ollamaService.getCodeChunks().length > 0) {
      const queryTextForRetrieval = currentContext;
      if (queryTextForRetrieval.trim().length > 0) {
        projectContext = await this.ollamaService.retriever(
          queryTextForRetrieval
        );
      }
    }

    const prompt = `
<system>
${this.systemMessage}
</system>

<code_before_cursor>
${currentContext}
</code_before_cursor>

${
  projectContext !== "" &&
  `<code_from_other_files>
  ${projectContext}
  </code_from_other_files>`
}

<task>
Continue this code without repeating anything above. Your output will be inserted directly where the cursor is.
</task>
`;
    StatusBarProvider.show(`$(sync~spin) Pilot Autocompleting...`);
    try {
      const completion = await this.ollamaService.completion(
        prompt,
        linkedToken
      );

      const postProcessedCompletion = this.removePrefixOverlap(
        currentContext,
        this.cleanResponse(completion)
      );

      if (linkedToken.isCancellationRequested || !completion) {
        return undefined;
      }

      return [
        new vscode.InlineCompletionItem(
          postProcessedCompletion,
          new vscode.Range(position, position)
        ),
      ];
    } catch (err) {
      if (linkedToken.isCancellationRequested) {
        return undefined;
      }
      console.error("Error during completion:", err);
      return undefined;
    } finally {
      StatusBarProvider.hide();
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

  private cleanResponse(response: string): string {
    const match = response.match(/```(?:[a-z]*)?\s*([\s\S]*?)\s*```/);
    return match ? match[1].trim() : response.trim();
  }

  private removePrefixOverlap(
    typedText: string,
    completionText: string
  ): string {
    let i = 0;
    while (
      i < typedText.length &&
      i < completionText.length &&
      typedText[i] === completionText[i]
    ) {
      i++;
    }
    return completionText.slice(i);
  }
}
