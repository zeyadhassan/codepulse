// src/extension.ts
import * as vscode from 'vscode';
import { CodeAnalyzer } from './codeAnalyzer';
import { MetricsCollector } from './metricsCollector';
import { SuggestionProvider } from './suggestionProvider';
import { DashboardView } from './dashboardView';
import { StatusBarManager } from './statusBar';

// Add new TreeDataProvider classes for the views
class SuggestionsTreeDataProvider implements vscode.TreeDataProvider<SuggestionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SuggestionItem | undefined | null> = new vscode.EventEmitter<SuggestionItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<SuggestionItem | undefined | null> = this._onDidChangeTreeData.event;
  
  private suggestions: any[] = [];
  
  refresh(newSuggestions: any[]): void {
    this.suggestions = newSuggestions;
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: SuggestionItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(element?: SuggestionItem): Thenable<SuggestionItem[]> {
    if (element) {
      return Promise.resolve([]);
    }
    
    if (this.suggestions.length === 0) {
      return Promise.resolve([]);
    }
    
    return Promise.resolve(
      this.suggestions.map(suggestion => {
        const item = new SuggestionItem(
          suggestion.title,
          suggestion.description,
          vscode.TreeItemCollapsibleState.None
        );
        
        item.command = {
          command: 'codepulse.applyQuickFix',
          title: 'Apply Fix',
          arguments: [suggestion]
        };
        
        item.contextValue = 'suggestion';
        item.tooltip = suggestion.description;
        
        return item;
      })
    );
  }
}

class MetricsTreeDataProvider implements vscode.TreeDataProvider<MetricItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MetricItem | undefined | null> = new vscode.EventEmitter<MetricItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<MetricItem | undefined | null> = this._onDidChangeTreeData.event;
  
  private metrics: any = {};
  
  refresh(newMetrics: any): void {
    this.metrics = newMetrics;
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: MetricItem): vscode.TreeItem {
    return element;
  }
  
  getChildren(element?: MetricItem): Thenable<MetricItem[]> {
    if (element) {
      return Promise.resolve([]);
    }
    
    if (!this.metrics || Object.keys(this.metrics).length === 0) {
      return Promise.resolve([]);
    }
    
    const items: MetricItem[] = [];
    
    // Add overall health score
    if (this.metrics.overallHealth !== undefined) {
      items.push(new MetricItem(`Health Score: ${Math.round(this.metrics.overallHealth)}`, '', vscode.TreeItemCollapsibleState.None));
    }
    
    // Add complexity metrics
    if (this.metrics.metrics) {
      const m = this.metrics.metrics;
      if (m.averageComplexity !== undefined) {
        items.push(new MetricItem(`Average Complexity: ${m.averageComplexity.toFixed(2)}`, '', vscode.TreeItemCollapsibleState.None));
      }
      
      if (m.duplicationPercentage !== undefined) {
        items.push(new MetricItem(`Duplication: ${m.duplicationPercentage.toFixed(2)}%`, '', vscode.TreeItemCollapsibleState.None));
      }
      
      if (m.codeLines !== undefined && m.commentLines !== undefined) {
        const ratio = m.commentLines > 0 ? (m.codeLines / m.commentLines).toFixed(2) : 'N/A';
        items.push(new MetricItem(`Code to Comment Ratio: ${ratio}`, '', vscode.TreeItemCollapsibleState.None));
      }
    }
    
    return Promise.resolve(items);
  }
}

class SuggestionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

class MetricItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('CodePulse extension is now active');
  
  // Initialize components
  const metricsCollector = new MetricsCollector(context.globalState);
  const codeAnalyzer = new CodeAnalyzer();
  const suggestionProvider = new SuggestionProvider();
  const dashboardView = new DashboardView(context, metricsCollector);
  const statusBar = new StatusBarManager();
  
  // Create tree data providers for views
  const suggestionsDataProvider = new SuggestionsTreeDataProvider();
  const metricsDataProvider = new MetricsTreeDataProvider();
  
  // Register tree data providers
  vscode.window.registerTreeDataProvider('codepulse-suggestions', suggestionsDataProvider);
  vscode.window.registerTreeDataProvider('codepulse-metrics', metricsDataProvider);
  
  // Set up event listeners
  let analyzeOnSaveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const config = vscode.workspace.getConfiguration('codepulse');
    if (config.get('enableAutomaticAnalysis')) {
      await analyzeDocument(document);
    }
  });
  
  // Register commands
  let showDashboardDisposable = vscode.commands.registerCommand('codepulse.showDashboard', () => {
    dashboardView.show();
  });
  
  let analyzeCurrentFileDisposable = vscode.commands.registerCommand('codepulse.analyzeCurrentFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await analyzeDocument(editor.document);
    } else {
      vscode.window.showInformationMessage('No file is currently open');
    }
  });
  
  let applyQuickFixDisposable = vscode.commands.registerCommand('codepulse.applyQuickFix', async (fix) => {
    if (fix && fix.edit) {
      await vscode.workspace.applyEdit(fix.edit);
      vscode.window.showInformationMessage('Applied fix: ' + fix.title);
    }
  });
  
  // Function to analyze a document
  async function analyzeDocument(document: vscode.TextDocument) {
    // Skip non-code files
    if (!isCodeFile(document)) {
      return;
    }
    
    try {
      const startTime = Date.now();
      statusBar.setAnalyzing();
      
      // Run analysis
      const analysisResults = await codeAnalyzer.analyze(document);
      
      // Store metrics
      metricsCollector.recordMetrics(document.fileName, analysisResults);
      
      // Generate suggestions
      const suggestions = suggestionProvider.provideSuggestions(document, analysisResults);
      
      // Update tree views
      suggestionsDataProvider.refresh(suggestions);
      metricsDataProvider.refresh(analysisResults);
      
      // Show diagnostics
      updateDiagnostics(document, analysisResults, suggestions);
      
      // Update status bar
      const endTime = Date.now();
      const health = analysisResults.overallHealth;
      statusBar.setHealth(health, `Analysis took ${endTime - startTime}ms`);
      
      return analysisResults;
    } catch (err) {
      console.error('Analysis error:', err);
      statusBar.setError();
      return null;
    }
  }
  
  // Helper to determine if a file is a code file
  function isCodeFile(document: vscode.TextDocument): boolean {
    const fileName = document.fileName.toLowerCase();
    const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs'];
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }
  
  // Create diagnostics collection
  const diagnosticsCollection = vscode.languages.createDiagnosticCollection('codepulse');
  
  // Function to update diagnostics
  function updateDiagnostics(
    document: vscode.TextDocument, 
    results: any, 
    _suggestions: any[]
  ) {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // Convert complexity issues to diagnostics
    results.complexityIssues.forEach((issue: any) => {
      const range = new vscode.Range(
        issue.line, 0, 
        issue.line, document.lineAt(issue.line).text.length
      );
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `High complexity (${issue.complexity}): ${issue.message}`,
        vscode.DiagnosticSeverity.Warning
      );
      
      diagnostic.source = 'CodePulse';
      diagnostic.code = 'complexity';
      diagnostics.push(diagnostic);
    });
    
    // Convert duplication issues to diagnostics
    results.duplicationIssues.forEach((issue: any) => {
      const startLine = issue.startLine;
      const endLine = issue.endLine;
      
      const range = new vscode.Range(
        startLine, 0,
        endLine, document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length
      );
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `Duplicated code: ${issue.message}`,
        vscode.DiagnosticSeverity.Information
      );
      
      diagnostic.source = 'CodePulse';
      diagnostic.code = 'duplication';
      diagnostics.push(diagnostic);
    });
    
    // Add style issues
    results.styleIssues.forEach((issue: any) => {
      const range = new vscode.Range(
        issue.line, 0,
        issue.line, document.lineAt(issue.line).text.length
      );
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `Style issue: ${issue.message}`,
        vscode.DiagnosticSeverity.Information
      );
      
      diagnostic.source = 'CodePulse';
      diagnostic.code = 'style';
      diagnostics.push(diagnostic);
    });
    
    // Set diagnostics for the current file
    diagnosticsCollection.set(document.uri, diagnostics);
  }
  
  // Add all disposables to context subscriptions
  context.subscriptions.push(
    analyzeOnSaveDisposable,
    showDashboardDisposable,
    analyzeCurrentFileDisposable,
    applyQuickFixDisposable,
    diagnosticsCollection,
    statusBar
  );
  
  // Analyze current file on activation if one is open
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    analyzeDocument(activeEditor.document);
  }
}

export function deactivate() {
  // Clean up resources
}