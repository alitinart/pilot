import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { CodeChunk } from "../types/CodeChunk";
import getSetting from "../conf/getSetting";

export default class OllamaService {
  private static instance: OllamaService;

  private model = getSetting<string>("model");
  private embeddingModel = getSetting<string>("embeddingModel");
  private serverUrl = getSetting<string>("serverUrl");
  private systemMessage = getSetting<string>("systemMessage");

  private constructor() {}

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  private codeChunks: CodeChunk[] = [];

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
        `Failed to load model "${name}": ${err.message || err.toString()}`
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

  public async completion(prompt: string, token?: vscode.CancellationToken) {
    const body = {
      model: this.model,
      prompt,
      systemMessage: this.systemMessage,
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
      vscode.window.showErrorMessage(
        `Failed to generate embeddings: ${err.message || err.toString()}`
      );
      return [];
    }
  }

  public async retriever(text: string) {
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
