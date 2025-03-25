// src/dashboardView.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { MetricsCollector } from './metricsCollector';

export class DashboardView {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private metricsCollector: MetricsCollector;
  
  constructor(context: vscode.ExtensionContext, metricsCollector: MetricsCollector) {
    this.context = context;
    this.metricsCollector = metricsCollector;
  }
  
  public show() {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    
    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(
      'codepulseDashboard', // Identifies the type of panel
      'CodePulse Dashboard', // Title displayed to the user
      vscode.ViewColumn.One, // Editor column to show in
      {
        // Enable scripts in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'views'))]
      }
    );
    
    // Set initial HTML content
    this.updateWebviewContent();
    
    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'getMetrics':
            // Send the metrics to the webview
            this.sendMetricsToWebview();
            return;
          case 'refreshMetrics':
            // Refresh metrics and send them to the webview
            this.updateWebviewContent();
            return;
        }
      },
      undefined,
      this.context.subscriptions
    );
    
    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );
  }
  
  private updateWebviewContent() {
    if (!this.panel) {
      return;
    }
    
    this.panel.webview.html = this.getWebviewContent();
    this.sendMetricsToWebview();
  }
  
  private sendMetricsToWebview() {
    if (!this.panel) {
      return;
    }
    
    // Get metrics from collector
    const allMetrics = this.metricsCollector.getAllMetrics();
    const historicalMetrics = this.metricsCollector.getHistoricalMetrics();
    
    console.log('Sending metrics to webview:', JSON.stringify(allMetrics));
    
    // Send data to webview
    this.panel.webview.postMessage({
      command: 'setMetrics',
      metrics: allMetrics,
      historicalMetrics: historicalMetrics
    });
  }
  
  private getWebviewContent() {
    // Get path to Chart.js script - try multiple possible locations
    let chartJsPath: vscode.Uri | undefined;
    try {
      // First try UMD version
      const umdPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
      
      // Check if file exists
      const fs = require('fs');
      if (fs.existsSync(umdPath)) {
        chartJsPath = vscode.Uri.file(umdPath);
      } else {
        // Try the minified version
        const minPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.min.js');
        
        if (fs.existsSync(minPath)) {
          chartJsPath = vscode.Uri.file(minPath);
        } else {
          // Try the regular version
          const regPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.js');
          if (fs.existsSync(regPath)) {
            chartJsPath = vscode.Uri.file(regPath);
          } else {
            // Last resort - use a fallback mechanism
            console.error('Chart.js not found in any expected location');
            chartJsPath = vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'));
          }
        }
      }
    } catch (error) {
      console.error('Error finding Chart.js:', error);
      // Fallback path
      chartJsPath = vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'));
    }
    
    const chartJsUri = this.panel!.webview.asWebviewUri(chartJsPath);
    console.log('Chart.js script URI:', chartJsUri.toString());
    
    // Get path to dashboard CSS
    const cssPath = vscode.Uri.file(
      path.join(this.context.extensionPath, 'views', 'css', 'dashboard.css')
    );
    const cssUri = this.panel!.webview.asWebviewUri(cssPath);
    
    // Read the dashboard HTML file
    const dashboardHtmlPath = path.join(this.context.extensionPath, 'views', 'dashboard.html');
    
    try {
      // Read the file content
      const fs = require('fs');
      let htmlContent = fs.readFileSync(dashboardHtmlPath, 'utf8');
      
      // Replace placeholder for Chart.js script with actual URI
      // Make the replacement more robust by using a more direct approach
      const headEndIndex = htmlContent.indexOf('</head>');
      if (headEndIndex !== -1) {
        const beforeHead = htmlContent.substring(0, headEndIndex);
        const afterHead = htmlContent.substring(headEndIndex);
        htmlContent = beforeHead + `<script src="${chartJsUri}"></script>\n` + afterHead;
      } else {
        // Fallback replacement if </head> not found
        htmlContent = htmlContent.replace(
          '<script>\n        // Placeholder for Chart.js - will be replaced by the extension\n    </script>',
          `<script src="${chartJsUri}"></script>`
        );
      }
      
      // Replace CSS href
      htmlContent = htmlContent.replace(
        'href="css/dashboard.css"',
        `href="${cssUri}"`
      );
      
      console.log('Dashboard HTML prepared with Chart.js inserted before </head>');
      
      return htmlContent;
    } catch (error) {
      console.error('Error reading dashboard HTML:', error);
      
      // Fallback to basic HTML with inline Chart.js if file couldn't be read
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePulse Dashboard</title>
    <link rel="stylesheet" href="${cssUri}">
    <script src="${chartJsUri}"></script>
    <script>
        // Fallback notification
        console.log('Using fallback dashboard HTML');
    </script>
</head>
<body>
    <h1>CodePulse Dashboard</h1>
    <p>Error loading dashboard content. Please check the console for details.</p>
    
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ command: 'getMetrics' });
        })();
    </script>
</body>
</html>`;
    }
  }
}