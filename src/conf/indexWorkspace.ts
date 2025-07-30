import { AIService } from "./../service/ai/AIService";
import * as vscode from "vscode";
import { CodeChunk } from "../types/CodeChunk";
import StatusBarProvider from "../provider/StatusBarProvider";

const CHUNK_SIZE = 50;
const MAX_RESULTS = 5000;

const codeChunksFile = "code_chunks.json";

export async function saveCodeChunks(
  context: vscode.ExtensionContext,
  codeChunks: CodeChunk[]
) {
  const filePath = vscode.Uri.joinPath(context.storageUri!, codeChunksFile);

  const data = JSON.stringify(codeChunks, null, 2);
  const uint8array = new TextEncoder().encode(data);

  try {
    await vscode.workspace.fs.writeFile(filePath, uint8array);
  } catch (err) {
    vscode.window.showErrorMessage(
      "Failed to save code chunks: " + String(err)
    );
  }
}

async function pruneDeletedFiles(
  context: vscode.ExtensionContext
): Promise<CodeChunk[]> {
  const existingChunks = await loadCodeChunks(context);

  const validChunks: CodeChunk[] = [];
  for (const chunk of existingChunks) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(chunk.filePath));
      validChunks.push(chunk);
    } catch {
      // file no longer exists, skip
    }
  }

  await saveCodeChunks(context, validChunks);
  return validChunks;
}

export async function loadCodeChunks(
  context: vscode.ExtensionContext
): Promise<CodeChunk[]> {
  const filePath = vscode.Uri.joinPath(context.storageUri!, codeChunksFile);
  try {
    const fileData = await vscode.workspace.fs.readFile(filePath);
    const text = new TextDecoder().decode(fileData);
    return JSON.parse(text);
  } catch (err) {
    return [];
  }
}

export default async function indexWorkspace(
  context: vscode.ExtensionContext,
  AIService: AIService,
  specificFileUri?: vscode.Uri
) {
  await pruneDeletedFiles(context);

  if (!context.storageUri) {
    return;
  }

  const codeChunks: CodeChunk[] = [];
  const existingChunks = await loadCodeChunks(context);
  const existingFileMap = new Map<string, number>();

  for (const chunk of existingChunks) {
    existingFileMap.set(chunk.filePath, chunk.mtime);
  }

  StatusBarProvider.show(`$(sync~spin) Indexing Workspace...`);

  const includePattern =
    "**/*.{ts,js,jsx,tsx,py,cs,java,cpp,h,json,md,txt,vue,svelte,html,css,scss,less,go,rs,rb,php,kt,swift}";
  const excludePattern =
    "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/__pycache__/**,**/*.min.js,**/*.map,**/.vscode/**,**/.idea/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,**/temp/**,**/vendor/**,**/*.log,**/*.lock,**/*.bak,**/*.tmp,**/*.DS_Store}";

  const files = specificFileUri
    ? [specificFileUri]
    : await vscode.workspace.findFiles(
        includePattern,
        excludePattern,
        MAX_RESULTS
      );

  let processedFiles = 0;

  for (const file of files) {
    try {
      const mtime = (await vscode.workspace.fs.stat(file)).mtime;
      const previouslyIndexed = existingFileMap.get(file.fsPath);
      if (previouslyIndexed && mtime === previouslyIndexed) {
        continue;
      }

      existingChunks.filter((chunk) => chunk.filePath !== file.fsPath);
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
              mtime,
            });
          }
        }
      }
      processedFiles++;
    } catch (err: any) {
      console.error(`Error processing file ${file.fsPath}:`, err);
      vscode.window.showErrorMessage(
        `Error while processing file ${file.fsPath} | ${
          err.message || err.toString()
        }`
      );
    }
  }

  codeChunks.concat(existingChunks);

  console.log(
    `Indexed ${codeChunks.length} chunks from ${processedFiles} files.`
  );
  console.log(`Number of Existing Chunks: ${existingChunks.length}`);

  await saveCodeChunks(context, codeChunks);
  AIService.setCodeChunks(codeChunks);
  StatusBarProvider.hide();
}
