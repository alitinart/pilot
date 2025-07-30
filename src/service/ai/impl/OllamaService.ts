import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { CodeChunk } from "../../../types/CodeChunk";
import getSetting from "../../../conf/getSetting";
import { AIService } from "../AIService";
import { Message } from "../../../types/Message";
import StatusBarProvider from "../../../provider/StatusBarProvider";

export default class OllamaService implements AIService {
  private static instance: OllamaService;

  private model = getSetting<string>("model");
  private embeddingModel = getSetting<string>("embeddingModel");
  private serverUrl = getSetting<string>("serverUrl");
  private autoCompleteSystemMessage = getSetting<string>(
    "autoCompleteSystemMessage"
  );
  private chatSystemMessage = getSetting<string>("chatSystemMessage");
  private codeChunks: CodeChunk[] = [];
  private chatMessages: Message[] = [
    {
      role: "system",
      content: this.chatSystemMessage!,
    },
  ];

  private constructor() {}

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  public getChatMessages(): Message[] {
    return this.chatMessages.filter((msg) => msg.role !== "system");
  }

  public addMessage(message: Message) {
    return this.chatMessages.push(message);
  }

  public getCodeChunks() {
    return this.codeChunks;
  }

  public setCodeChunks(codeChunks: CodeChunk[]) {
    this.codeChunks = codeChunks;
  }

  public async loadModel(name: string) {
    const body = { model: name };
    try {
      const res = await axios.post(`${this.serverUrl}/api/generate`, body);
      if (res.status !== 200) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }
      return res.data;
    } catch (err: any) {
      console.error("Error loading model:", err);
      vscode.window.showErrorMessage(
        `❌ Failed to load model "${name}". Make sure your local LLM is running - Pilot`
      );
      throw err;
    }
  }

  public async unloadModel(name: string) {
    const body = { model: name, keep_alive: 0 };
    try {
      const res = await axios.post(`${this.serverUrl}/api/generate`, body);
      if (res.status !== 200) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }
      return res.data;
    } catch (err: any) {
      console.error("Error unloading model:", err);
      vscode.window.showErrorMessage(
        `Failed to unload model "${name}": ${err.message || err.toString()}`
      );
      throw err;
    }
  }

  public async chat(prompt: string) {
    let projectContext = await this.retriever(prompt);

    let currentMessages = this.chatMessages;
    const context = {
      role: "system",
      content: `<code_from_other_files>
      ${projectContext}
      </code_from_other_files>`,
    };
    const message = { role: "user", content: prompt };
    currentMessages.push(context);
    currentMessages.push(message);

    const body = {
      model: this.model,
      messages: currentMessages,
      stream: false,
    };

    try {
      StatusBarProvider.show("$(spin~spin) Pilot Thinking...");
      const res = await axios.post(`${this.serverUrl}/api/chat`, body);
      if (res.status !== 200) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }

      const aiResponse = res.data.message;
      this.addMessage(aiResponse);
      return aiResponse;
    } catch (err: any) {
      console.error("Error while generating response: ", err);
      vscode.window.showErrorMessage(`Failed to generate response from model`);
      throw err;
    } finally {
      StatusBarProvider.hide();
    }
  }

  public async completion(prompt: string, token?: vscode.CancellationToken) {
    const body = {
      model: this.model,
      prompt,
      systemMessage: this.autoCompleteSystemMessage,
      options: {
        temperature: 0,
      },
      stream: false,
    };

    const source = axios.CancelToken.source();
    if (token) {
      token.onCancellationRequested(() => {
        source.cancel("Request cancelled by user input.");
      });
    }

    try {
      const res = await axios.post(`${this.serverUrl}/api/generate`, body, {
        cancelToken: source.token,
      });
      return res.data.response;
    } catch (err: any) {
      if (axios.isCancel(err)) {
        console.log("Request cancelled:", err.message);
        return "";
      }
      console.error("Error during completion:", err);
      vscode.window.showErrorMessage(
        `Completion failed: ${err.message || err.toString()}`
      );
      throw err;
    }
  }

  public async retriever(text: string) {
    let context = "";
    if (this.getCodeChunks().length > 0) {
      const queryTextForRetrieval = text;
      if (queryTextForRetrieval.trim().length > 0) {
        context = await this._retriever(queryTextForRetrieval);
      }
    }

    return context;
  }

  public async getEmbeddings(text: string) {
    const body = {
      model: this.embeddingModel,
      prompt: text,
    };

    try {
      const res = await axios.post(`${this.serverUrl}/api/embeddings`, body);
      if (res.status !== 200) {
        throw new Error(`Ollama Embedding API error: ${res.statusText}`);
      }
      return res.data.embedding;
    } catch (err: any) {
      console.error("Error generating embedding:", err);
      throw err;
    }
  }

  private async _retriever(text: string) {
    try {
      const queryEmbedding = await this.getEmbeddings(text);
      const relevantChunks = this.retrieveRelevantChunks(queryEmbedding);

      let retrievedContext = "";
      if (relevantChunks.length > 0) {
        retrievedContext = relevantChunks
          .map((chunk) => `File: ${chunk.filePath}\n${chunk.text}`)
          .join("\n\n");
      }

      return retrievedContext;
    } catch (err: any) {
      console.error("Error retrieving context:", err);
      vscode.window.showErrorMessage(
        `Failed to retrieve context: ${err.message || err.toString()}`
      );
      return "";
    }
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length === 0 || vec2.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  private retrieveRelevantChunks(
    queryEmbedding: number[],
    topN: number = 5
  ): CodeChunk[] {
    const scoredChunks = this.codeChunks.map((chunk) => ({
      chunk: chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topN).map((s) => s.chunk);
  }
}
