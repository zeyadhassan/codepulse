// src/codeAnalyzer.ts
import * as vscode from 'vscode';
import { ComplexityCalculator } from './utils/complexityCalculator';
import { DuplicationDetector } from './utils/duplicationDetector';
import { StyleAnalyzer } from './utils/styleAnalyzer';

export interface AnalysisResult {
  overallHealth: number; // 0-100 score
  complexityIssues: ComplexityIssue[];
  duplicationIssues: DuplicationIssue[];
  styleIssues: StyleIssue[];
  metrics: CodeMetrics;
}

export interface ComplexityIssue {
  line: number;
  complexity: number;
  message: string;
  functionName: string;
}

export interface DuplicationIssue {
  startLine: number;
  endLine: number;
  message: string;
  duplicateLocations: Array<{ file: string, startLine: number, endLine: number }>;
}

export interface StyleIssue {
  line: number;
  message: string;
  rule: string;
}

export interface CodeMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  functionCount: number;
  averageComplexity: number;
  maxComplexity: number;
  duplicationPercentage: number;
}

export class CodeAnalyzer {
  private complexityCalculator: ComplexityCalculator;
  private duplicationDetector: DuplicationDetector;
  private styleAnalyzer: StyleAnalyzer;
  
  constructor() {
    this.complexityCalculator = new ComplexityCalculator();
    this.duplicationDetector = new DuplicationDetector();
    this.styleAnalyzer = new StyleAnalyzer();
  }
  
  public async analyze(document: vscode.TextDocument): Promise<AnalysisResult> {
    const text = document.getText();
    const fileName = document.fileName;
    const languageId = document.languageId;
    
    // Skip if file is too large to avoid performance issues
    if (text.length > 500000) { // ~500KB
      return this.createEmptyResult('File too large for analysis');
    }
    
    try {
      // Get configuration
      const config = vscode.workspace.getConfiguration('codepulse');
      const complexityThreshold = config.get('complexityThreshold') as number;
      const duplicationThreshold = config.get('duplicationThreshold') as number;
      
      // Run complexity analysis
      const complexityResults = await this.complexityCalculator.calculate(text, languageId, complexityThreshold);
      
      // Run duplication detection
      const duplicationResults = await this.duplicationDetector.detect(text, fileName, duplicationThreshold);
      
      // Run style analysis
      const styleResults = await this.styleAnalyzer.analyze(text, languageId);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(
        text, 
        complexityResults.complexityIssues, 
        duplicationResults.duplicationIssues
      );
      
      // Calculate overall health score (0-100)
      const overallHealth = this.calculateHealthScore(
        complexityResults.complexityIssues,
        duplicationResults.duplicationIssues,
        styleResults.styleIssues,
        metrics
      );
      
      return {
        overallHealth,
        complexityIssues: complexityResults.complexityIssues,
        duplicationIssues: duplicationResults.duplicationIssues,
        styleIssues: styleResults.styleIssues,
        metrics
      };
    } catch (err) {
      console.error('Error during analysis:', err);
      return this.createEmptyResult('Analysis error');
    }
  }
  
  private calculateMetrics(
    text: string,
    complexityIssues: ComplexityIssue[],
    duplicationIssues: DuplicationIssue[]
  ): CodeMetrics {
    const lines = text.split('\n');
    const totalLines = lines.length;
    
    // Count code and comment lines
    let commentLines = 0;
    let codeLines = 0;
    
    let inBlockComment = false;
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (inBlockComment) {
        commentLines++;
        if (trimmedLine.includes('*/')) {
          inBlockComment = false;
        }
      } else if (trimmedLine.startsWith('//')) {
        commentLines++;
      } else if (trimmedLine.startsWith('/*')) {
        commentLines++;
        if (!trimmedLine.includes('*/')) {
          inBlockComment = true;
        }
      } else if (trimmedLine.length > 0) {
        codeLines++;
      }
    }
    
    // Calculate complexity metrics
    const complexities = complexityIssues.map(issue => issue.complexity);
    const functionCount = complexities.length;
    const totalComplexity = complexities.reduce((sum, val) => sum + val, 0);
    const averageComplexity = functionCount > 0 ? totalComplexity / functionCount : 0;
    const maxComplexity = functionCount > 0 ? Math.max(...complexities) : 0;
    
    // Calculate duplication percentage
    let duplicatedLines = 0;
    duplicationIssues.forEach(issue => {
      duplicatedLines += (issue.endLine - issue.startLine + 1);
    });
    const duplicationPercentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;
    
    return {
      totalLines,
      codeLines,
      commentLines,
      functionCount,
      averageComplexity,
      maxComplexity,
      duplicationPercentage
    };
  }
  
  private calculateHealthScore(
    complexityIssues: ComplexityIssue[],
    _duplicationIssues: DuplicationIssue[],
    styleIssues: StyleIssue[],
    metrics: CodeMetrics
  ): number {
    // This is a simple scoring algorithm that can be refined over time
    
    // Start with a perfect score
    let score = 100;
    
    // Deduct for complexity issues (more impact for higher complexity)
    complexityIssues.forEach(issue => {
      // Deduct more points for higher complexity
      score -= Math.min(10, (issue.complexity / 5));
    });
    
    // Deduct for duplication
    score -= Math.min(30, metrics.duplicationPercentage);
    
    // Deduct for style issues (less impact)
    score -= Math.min(10, styleIssues.length);
    
    // Ensure score is in 0-100 range
    return Math.max(0, Math.min(100, score));
  }
  
  private createEmptyResult(_reason: string): AnalysisResult {
    return {
      overallHealth: 0,
      complexityIssues: [],
      duplicationIssues: [],
      styleIssues: [],
      metrics: {
        totalLines: 0,
        codeLines: 0,
        commentLines: 0,
        functionCount: 0,
        averageComplexity: 0,
        maxComplexity: 0,
        duplicationPercentage: 0
      }
    };
  }
}