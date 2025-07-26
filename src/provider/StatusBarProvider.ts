import * as vscode from "vscode";

export default class StatusBarProvider {
  private static statusBarItem: vscode.StatusBarItem | undefined;

  private constructor() {}

  public static show(text: string) {
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
      );
    }
    this.statusBarItem.text = text;
    this.statusBarItem.show();
  }

  public static hide() {
    if (this.statusBarItem) {
      this.statusBarItem.hide();
    }
  }
}
