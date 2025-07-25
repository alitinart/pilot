import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { CodeChunk } from "../types/CodeChunk";

export class OllamaService {
  private static instance: OllamaService;

  private config = vscode.workspace.getConfiguration("pilot");
  private model = this.config.get<string>("modelName");
  private embeddingModel = this.config.get<string>("embeddingModel");
  private serverUrl = this.config.get<string>("serverUrl");
  private systemMessage = this.config.get<string>("systemMessage");

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
      throw err;
    }
  }

  public async completion(prompt: string) {
    const body = {
      model: this.model,
      prompt,
      systemMessage: this.systemMessage,
      options: {
        temperature: 0,
      },
      stream: false,
    };

    try {
      const res = await axios.post(`${this.serverUrl}/api/generate`, body);
      if (res.status !== 200) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }

      return res.data.response;
    } catch (err: any) {
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
      console.error(err);
      console.error(`Error generating embedding: ${err.message}`);
      return [];
    }
  }

  public async retreiver(text: string) {
    const queryEmbedding = await this.getEmbeddings(text);
    const relevantChunks = this.retrieveRelevantChunks(queryEmbedding);

    let retrievedContext = "";
    if (relevantChunks.length > 0) {
      retrievedContext = relevantChunks
        .map((chunk) => `File: ${chunk.filePath}\n${chunk.text}`)
        .join("\n\n");
    }

    return retrievedContext;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length === 0 || vec2.length === 0) return 0;
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
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
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
