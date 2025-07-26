import * as vscode from "vscode";
import { CodeChunk } from "../../types/CodeChunk";

/**
 * Interface for the AI Service, defining its public API.
 */
export interface AIService {
  /**
   * Gets the currently loaded code chunks.
   */
  getCodeChunks(): CodeChunk[];

  /**
   * Sets the code chunks for retrieval.
   * @param codeChunks An array of CodeChunk objects.
   */
  setCodeChunks(codeChunks: CodeChunk[]): void;

  /**
   * Loads a specified model.
   * @param name The name of the model to load.
   * @returns A promise that resolves with the API response data.
   */
  loadModel(name: string): Promise<any>;

  /**
   * Unloads a specified model from memory.
   * @param name The name of the model to unload.
   * @returns A promise that resolves with the API response data.
   */
  unloadModel(name: string): Promise<any>;

  /**
   * Generates a completion based on a prompt, optionally with cancellation.
   * This version assumes the prompt already contains all necessary context.
   *
   * NOTE: If you plan to use the RAG-enabled `completion` method,
   * its signature should be updated in the interface as well.
   * For the RAG-enabled version:
   * completion(userPrompt: string, document: vscode.TextDocument, position: vscode.Position, token?: vscode.CancellationToken): Promise<string>;
   *
   * @param prompt The prompt string to send to the model.
   * @param token Optional CancellationToken to allow for request cancellation.
   * @returns A promise that resolves with the completion string.
   */
  completion(prompt: string, token?: vscode.CancellationToken): Promise<string>;

  /**
   * Generates embeddings for a given text using the configured embedding model.
   * @param text The text to embed.
   * @returns A promise that resolves with the embedding (array of numbers).
   */
  getEmbeddings(text: string): Promise<number[]>;

  /**
   * Retrieves relevant code chunks based on a query text.
   * @param text The query text for retrieval.
   * @returns A promise that resolves with the retrieved context string.
   */
  retriever(text: string): Promise<string>;
}
