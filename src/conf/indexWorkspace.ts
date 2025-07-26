import OllamaService from "../service/OllamaService";
import * as vscode from "vscode";
import { CodeChunk } from "../types/CodeChunk";

const CHUNK_SIZE = 50;

export default async function indexWorkspace(ollamaService: OllamaService) {
  vscode.window.showInformationMessage("Indexing workspace with Ollama...");

  const includePattern =
    "**/*.{ts,js,jsx,tsx,py,cs,java,cpp,h,json,md,txt,vue,svelte,html,css,scss,less,go,rs,rb,php,kt,swift}";
  const excludePattern =
    "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/__pycache__/**,**/*.min.js,**/*.map,**/.vscode/**,**/.idea/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,**/temp/**,**/vendor/**,**/*.log,**/*.lock,**/*.bak,**/*.tmp,**/*.DS_Store}";

  const maxResults = 5000; // Adjust as needed

  const files = await vscode.workspace.findFiles(
    includePattern,
    excludePattern,
    maxResults
  );
  const codeChunks: CodeChunk[] = [];

  let processedFiles = 0;

  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file);
      const fileContent = document.getText();

      const lines = fileContent.split("\n");

      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const chunkText = lines.slice(i, i + CHUNK_SIZE).join("\n");
        if (chunkText.trim().length > 0) {
          if (chunkText.length > 10 && chunkText.length < 4000) {
            const embedding = await ollamaService.getEmbeddings(chunkText);
            codeChunks.push({
              filePath: file.fsPath,
              text: chunkText,
              embedding: embedding,
            });
          }
        }
      }
      processedFiles++;
    } catch (error) {
      console.error(`Error processing file ${file.fsPath}:`, error);
    }
  }
  console.log(
    `Indexed ${codeChunks.length} chunks from ${processedFiles} files.`
  );
  vscode.window.showInformationMessage(
    `Workspace indexing complete! Indexed ${codeChunks.length} chunks.`
  );

  ollamaService.setCodeChunks(codeChunks);
}
