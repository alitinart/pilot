const vscode = acquireVsCodeApi();

document
  .getElementById("open-vscode-settings")
  .addEventListener("click", () => {
    vscode.postMessage({ type: "open-settings" });
  });
