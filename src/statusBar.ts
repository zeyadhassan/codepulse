// src/statusBar.ts
import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor() {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this.statusBarItem.name = 'CodePulse';
    this.statusBarItem.command = 'codepulse.showDashboard';
    this.statusBarItem.tooltip = 'Show CodePulse Dashboard';
    
    // Initial state
    this.setIdle();
    this.statusBarItem.show();
  }
  
  /**
   * Set status to indicate idle state
   */
  public setIdle(): void {
    this.statusBarItem.text = '$(pulse) CodePulse';
    this.statusBarItem.backgroundColor = undefined;
  }
  
  /**
   * Set status to indicate analyzing state
   */
  public setAnalyzing(): void {
    this.statusBarItem.text = '$(sync~spin) CodePulse: Analyzing...';
    this.statusBarItem.backgroundColor = undefined;
  }
  
  /**
   * Set status to indicate health level
   */
  public setHealth(health: number, tooltip?: string): void {
    let icon: string;
    let color: vscode.ThemeColor | undefined;
    
    if (health >= 80) {
      // Good health
      icon = '$(check)';
      color = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (health >= 60) {
      // Moderate health
      icon = '$(warning)';
      color = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      // Poor health
      icon = '$(error)';
      color = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    
    this.statusBarItem.text = `${icon} CodePulse: ${Math.round(health)}`;
    this.statusBarItem.backgroundColor = color;
    
    if (tooltip) {
      this.statusBarItem.tooltip = `Code Health: ${Math.round(health)}/100\n${tooltip}\nClick to open dashboard`;
    } else {
      this.statusBarItem.tooltip = `Code Health: ${Math.round(health)}/100\nClick to open dashboard`;
    }
  }
  
  /**
   * Set status to indicate error state
   */
  public setError(): void {
    this.statusBarItem.text = '$(error) CodePulse: Error';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.statusBarItem.tooltip = 'Error during analysis. Click to retry.';
  }
  
  /**
   * Dispose status bar item
   */
  public dispose() {
    this.statusBarItem.dispose();
  }
}