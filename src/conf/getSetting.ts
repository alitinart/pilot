import * as vscode from "vscode";

export default function getSetting<T>(name: string) {
  const config = vscode.workspace.getConfiguration("pilot");
  return config.get<T>(name);
}
