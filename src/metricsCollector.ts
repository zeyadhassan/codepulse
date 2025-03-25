// src/metricsCollector.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { AnalysisResult } from './codeAnalyzer';

interface FileMetrics {
  healthScore: number;
  lastUpdated: number;
  complexity: {
    average: number;
    max: number;
    count: number;
  };
  duplication: {
    percentage: number;
    lineCount: number;
  };
  styleIssues: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
}

interface ProjectMetrics {
  timestamp: number;
  overallHealth: number;
  complexityData: {
    low: number;    // 1-5
    medium: number; // 6-10
    high: number;   // 11-20
    veryHigh: number; // 21+
  };
  averageComplexity: number;
  duplicationPercentage: number;
  codeCommentRatio: number;
  codeChanges: number;
  fileMetrics: Record<string, FileMetrics>;
}

interface HistoricalMetric {
  timestamp: number;
  overallHealth: number;
  codeChanges: number;
}

// Maximum number of historical metrics to store
const MAX_HISTORY = 30;

export class MetricsCollector {
  private globalState: vscode.Memento;
  private currentMetrics: ProjectMetrics;
  private historicalMetrics: HistoricalMetric[];
  
  constructor(globalState: vscode.Memento) {
    this.globalState = globalState;
    
    // Load metrics from state or initialize with defaults
    this.currentMetrics = this.loadMetrics() || this.createDefaultMetrics();
    this.historicalMetrics = this.loadHistoricalMetrics() || [];
  }
  
  /**
   * Record metrics for a specific file
   */
  public recordMetrics(filePath: string, analysisResult: AnalysisResult): void {
    // Skip if we don't have results
    if (!analysisResult || !analysisResult.metrics) {
      return;
    }
    
    const metrics = analysisResult.metrics;
    const normalizedPath = this.normalizePath(filePath);
    
    // Calculate complexity data
    const complexityData = {
      low: 0,
      medium: 0,
      high: 0,
      veryHigh: 0
    };
    
    analysisResult.complexityIssues.forEach(issue => {
      if (issue.complexity <= 5) {
        complexityData.low++;
      } else if (issue.complexity <= 10) {
        complexityData.medium++;
      } else if (issue.complexity <= 20) {
        complexityData.high++;
      } else {
        complexityData.veryHigh++;
      }
    });
    
    // Store file metrics
    const fileMetrics: FileMetrics = {
      healthScore: analysisResult.overallHealth,
      lastUpdated: Date.now(),
      complexity: {
        average: metrics.averageComplexity,
        max: metrics.maxComplexity,
        count: metrics.functionCount
      },
      duplication: {
        percentage: metrics.duplicationPercentage,
        lineCount: Math.round((metrics.totalLines * metrics.duplicationPercentage) / 100)
      },
      styleIssues: analysisResult.styleIssues.length,
      totalLines: metrics.totalLines,
      codeLines: metrics.codeLines,
      commentLines: metrics.commentLines
    };
    
    // Store in current metrics
    this.currentMetrics.fileMetrics[normalizedPath] = fileMetrics;
    
    // Update project-wide metrics
    this.updateProjectMetrics();
    
    // Save to storage
    this.saveMetrics();
    this.saveHistoricalMetrics();
  }
  
  /**
   * Get file metrics for a specific file
   */
  public getFileMetrics(filePath: string): FileMetrics | undefined {
    const normalizedPath = this.normalizePath(filePath);
    return this.currentMetrics.fileMetrics[normalizedPath];
  }
  
  /**
   * Get all metrics
   */
  public getAllMetrics(): ProjectMetrics {
    return this.currentMetrics;
  }
  
  /**
   * Get historical metrics
   */
  public getHistoricalMetrics(): HistoricalMetric[] {
    return this.historicalMetrics;
  }
  
  /**
   * Clear metrics for a specific file
   */
  public clearFileMetrics(filePath: string): void {
    const normalizedPath = this.normalizePath(filePath);
    delete this.currentMetrics.fileMetrics[normalizedPath];
    this.updateProjectMetrics();
    this.saveMetrics();
  }
  
  /**
   * Clear all metrics
   */
  public clearAllMetrics(): void {
    this.currentMetrics = this.createDefaultMetrics();
    this.historicalMetrics = [];
    this.saveMetrics();
    this.saveHistoricalMetrics();
  }
  
  /**
   * Update project-wide metrics based on file metrics
   */
  private updateProjectMetrics(): void {
    const fileMetrics = Object.values(this.currentMetrics.fileMetrics);
    
    if (fileMetrics.length === 0) {
      this.currentMetrics.overallHealth = 0;
      this.currentMetrics.averageComplexity = 0;
      this.currentMetrics.duplicationPercentage = 0;
      this.currentMetrics.codeCommentRatio = 0;
      this.currentMetrics.complexityData = { low: 0, medium: 0, high: 0, veryHigh: 0 };
      return;
    }
    
    // Calculate weighted health score based on file size
    let totalLines = 0;
    let weightedHealthSum = 0;
    let totalComplexitySum = 0;
    let totalComplexityCount = 0;
    let totalDuplicatedLines = 0;
    let totalCodeLines = 0;
    let totalCommentLines = 0;
    
    const complexityData = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    
    fileMetrics.forEach(metric => {
      const weight = metric.totalLines;
      totalLines += weight;
      weightedHealthSum += metric.healthScore * weight;
      
      totalComplexitySum += metric.complexity.average * metric.complexity.count;
      totalComplexityCount += metric.complexity.count;
      
      totalDuplicatedLines += metric.duplication.lineCount;
      totalCodeLines += metric.codeLines;
      totalCommentLines += metric.commentLines;
      
      // Sum complexity counts
      const complexityCounts = this.calculateComplexityCounts(
        metric.complexity.average, 
        metric.complexity.count
      );
      
      complexityData.low += complexityCounts.low;
      complexityData.medium += complexityCounts.medium;
      complexityData.high += complexityCounts.high;
      complexityData.veryHigh += complexityCounts.veryHigh;
    });
    
    // Update project metrics
    this.currentMetrics.timestamp = Date.now();
    this.currentMetrics.overallHealth = totalLines > 0 ? weightedHealthSum / totalLines : 0;
    this.currentMetrics.averageComplexity = totalComplexityCount > 0 ? totalComplexitySum / totalComplexityCount : 0;
    this.currentMetrics.duplicationPercentage = totalLines > 0 ? (totalDuplicatedLines / totalLines) * 100 : 0;
    this.currentMetrics.codeCommentRatio = totalCommentLines > 0 ? totalCodeLines / totalCommentLines : 0;
    this.currentMetrics.complexityData = complexityData;
    
    // Update historical metrics (daily record)
    this.updateHistoricalMetrics();
  }
  
  /**
   * Calculate approximate distribution of complexity values
   */
  private calculateComplexityCounts(
    averageComplexity: number, 
    count: number
  ): { low: number, medium: number, high: number, veryHigh: number } {
    // This is a simplified approximation based on average complexity
    // In a real implementation, we'd track exact distributions
    
    const result = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    
    if (count === 0) {
      return result;
    }
    
    if (averageComplexity <= 5) {
      // Mostly low complexity
      result.low = Math.round(count * 0.8);
      result.medium = count - result.low;
    } else if (averageComplexity <= 10) {
      // Mostly medium complexity
      result.medium = Math.round(count * 0.6);
      result.low = Math.round(count * 0.3);
      result.high = count - result.medium - result.low;
    } else if (averageComplexity <= 15) {
      // Mix of medium and high
      result.medium = Math.round(count * 0.4);
      result.high = Math.round(count * 0.4);
      result.low = Math.round(count * 0.1);
      result.veryHigh = count - result.medium - result.high - result.low;
    } else {
      // Mostly high and very high
      result.high = Math.round(count * 0.5);
      result.veryHigh = Math.round(count * 0.3);
      result.medium = Math.round(count * 0.2);
      result.low = count - result.high - result.veryHigh - result.medium;
    }
    
    return result;
  }
  
  /**
   * Update historical metrics
   */
  private updateHistoricalMetrics(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // Check if we already have an entry for today
    const todayEntryIndex = this.historicalMetrics.findIndex(
      metric => {
        const metricDate = new Date(metric.timestamp);
        metricDate.setHours(0, 0, 0, 0);
        return metricDate.getTime() === todayTimestamp;
      }
    );
    
    if (todayEntryIndex !== -1) {
      // Update today's entry
      this.historicalMetrics[todayEntryIndex] = {
        timestamp: todayTimestamp,
        overallHealth: this.currentMetrics.overallHealth,
        codeChanges: this.historicalMetrics[todayEntryIndex].codeChanges + 1
      };
    } else {
      // Add new entry for today
      this.historicalMetrics.push({
        timestamp: todayTimestamp,
        overallHealth: this.currentMetrics.overallHealth,
        codeChanges: 1
      });
      
      // Limit history size
      if (this.historicalMetrics.length > MAX_HISTORY) {
        this.historicalMetrics = this.historicalMetrics.slice(-MAX_HISTORY);
      }
    }
  }
  
  /**
   * Create default metrics object
   */
  private createDefaultMetrics(): ProjectMetrics {
    return {
      timestamp: Date.now(),
      overallHealth: 0,
      complexityData: {
        low: 0,
        medium: 0,
        high: 0,
        veryHigh: 0
      },
      averageComplexity: 0,
      duplicationPercentage: 0,
      codeCommentRatio: 0,
      codeChanges: 0,
      fileMetrics: {}
    };
  }
  
  /**
   * Normalize file path to use as key
   */
  private normalizePath(filePath: string): string {
    // Use path relative to workspace if possible
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspacePath = workspaceFolders[0].uri.fsPath;
      if (filePath.startsWith(workspacePath)) {
        return filePath.substring(workspacePath.length);
      }
    }
    
    return filePath;
  }
  
  /**
   * Load metrics from storage
   */
  private loadMetrics(): ProjectMetrics | undefined {
    const metrics = this.globalState.get<ProjectMetrics>('codepulse.metrics');
    return metrics;
  }
  
  /**
   * Save metrics to storage
   */
  private saveMetrics(): void {
    this.globalState.update('codepulse.metrics', this.currentMetrics);
  }
  
  /**
   * Load historical metrics from storage
   */
  private loadHistoricalMetrics(): HistoricalMetric[] | undefined {
    return this.globalState.get<HistoricalMetric[]>('codepulse.historicalMetrics');
  }
  
  /**
   * Save historical metrics to storage
   */
  private saveHistoricalMetrics(): void {
    this.globalState.update('codepulse.historicalMetrics', this.historicalMetrics);
  }
}