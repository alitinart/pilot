import { AIService } from "./../service/ai/AIService";
import * as vscode from "vscode";
import { CodeChunk } from "../types/CodeChunk";
import StatusBarProvider from "../provider/StatusBarProvider";

const CHUNK_SIZE = 50;
const MAX_RESULTS = 5000;

export default async function indexWorkspace(AIService: AIService) {
  StatusBarProvider.show(`$(sync~spin) Indexing Workspace...`);
  vscode.window.showInformationMessage("Indexing workspace with Ollama...");

  const includePattern =
    "**/*.{ts,js,jsx,tsx,py,cs,java,cpp,h,json,md,txt,vue,svelte,html,css,scss,less,go,rs,rb,php,kt,swift}";
  const excludePattern =
    "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/__pycache__/**,**/*.min.js,**/*.map,**/.vscode/**,**/.idea/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,**/temp/**,**/vendor/**,**/*.log,**/*.lock,**/*.bak,**/*.tmp,**/*.DS_Store}";

  const MAX_RESULTS = 5000;

  const files = await vscode.workspace.findFiles(
    includePattern,
    excludePattern,
    MAX_RESULTS
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
            const embedding = await AIService.getEmbeddings(chunkText);
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

  AIService.setCodeChunks(codeChunks);
  StatusBarProvider.hide();
}
