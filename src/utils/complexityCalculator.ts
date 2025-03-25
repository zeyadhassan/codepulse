// src/utils/complexityCalculator.ts
import * as vscode from 'vscode';
import { ComplexityIssue } from '../codeAnalyzer';

interface ComplexityResult {
  complexityIssues: ComplexityIssue[];
}

export class ComplexityCalculator {
  /**
   * Calculate cyclomatic complexity for the given code
   */
  public async calculate(code: string, languageId: string, threshold: number): Promise<ComplexityResult> {
    const complexityIssues: ComplexityIssue[] = [];
    
    try {
      // Different parsing strategies based on language
      switch (languageId) {
        case 'javascript':
        case 'typescript':
        case 'javascriptreact':
        case 'typescriptreact':
          complexityIssues.push(...this.analyzeJavaScriptFamily(code, threshold));
          break;
        case 'python':
          complexityIssues.push(...this.analyzePython(code, threshold));
          break;
        default:
          // Basic fallback analysis for unsupported languages
          complexityIssues.push(...this.basicAnalysis(code, threshold));
      }
      
      return { complexityIssues };
    } catch (err) {
      console.error('Error in complexity calculation:', err);
      return { complexityIssues: [] };
    }
  }
  
  /**
   * Analyze JavaScript/TypeScript code for complexity
   */
  private analyzeJavaScriptFamily(code: string, threshold: number): ComplexityIssue[] {
    const issues: ComplexityIssue[] = [];
    const lines = code.split('\n');
    
    // Simple function detection - look for function declarations and arrow functions
    const functionRegex = /function\s+(\w+)\s*\(/g;
    const methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
    const arrowFunctionRegex = /(const|let|var)?\s*(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)=>/g;
    
    // Track function blocks to calculate complexity
    const functionBlocks: Array<{
      name: string;
      startLine: number;
      endLine: number | null;
      complexity: number;
    }> = [];
    
    // First pass: identify function boundaries
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for function declarations
      const functionMatches = [...line.matchAll(functionRegex)];
      for (const match of functionMatches) {
        functionBlocks.push({
          name: match[1],
          startLine: i,
          endLine: null,
          complexity: 1 // Base complexity is 1
        });
      }
      
      // Check for method declarations
      const methodMatches = [...line.matchAll(methodRegex)];
      for (const match of methodMatches) {
        functionBlocks.push({
          name: match[1],
          startLine: i,
          endLine: null,
          complexity: 1
        });
      }
      
      // Check for arrow functions
      const arrowMatches = [...line.matchAll(arrowFunctionRegex)];
      for (const match of arrowMatches) {
        functionBlocks.push({
          name: match[2] || 'anonymous',
          startLine: i,
          endLine: null,
          complexity: 1
        });
      }
    }
    
    // Second pass: calculate complexity by counting branches
    // Simple heuristic: count if, else, for, while, switch, case, &&, ||, ?:
    const complexityMarkers = [
      'if ', 'else ', 'for(', 'for (', 'while(', 'while (', 
      'switch(', 'switch (', 'case ', '&&', '||', '?'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        continue;
      }
      
      // Find active function blocks for this line
      const activeBlocks = functionBlocks.filter(
        block => block.startLine <= i && (block.endLine === null || block.endLine >= i)
      );
      
      // Increment complexity for each found marker
      for (const block of activeBlocks) {
        complexityMarkers.forEach(marker => {
          if (line.includes(marker)) {
            block.complexity++;
          }
        });
      }
      
      // Check for function end with curly brace
      if (line.includes('}') && activeBlocks.length > 0) {
        // Simple approach: close the most recently opened block
        // This is a simplification, in a real implementation we'd need proper parsing
        const lastBlock = activeBlocks[activeBlocks.length - 1];
        if (lastBlock.endLine === null) {
          lastBlock.endLine = i;
        }
      }
    }
    
    // Convert high complexity functions to issues
    for (const block of functionBlocks) {
      if (block.complexity >= threshold) {
        issues.push({
          line: block.startLine,
          complexity: block.complexity,
          functionName: block.name,
          message: `Function '${block.name}' has high cyclomatic complexity (${block.complexity})`
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Analyze Python code for complexity
   */
  private analyzePython(code: string, threshold: number): ComplexityIssue[] {
    const issues: ComplexityIssue[] = [];
    const lines = code.split('\n');
    
    // Look for function definitions in Python
    const functionRegex = /def\s+(\w+)\s*\(/;
    
    // Complexity markers in Python
    const complexityMarkers = [
      'if ', 'elif ', 'else:', 'for ', 'while ', 
      'except:', 'finally:', 'and ', 'or '
    ];
    
    let currentFunction: {
      name: string;
      startLine: number;
      complexity: number;
    } | null = null;
    
    // Track indentation level of function
    let functionIndentation = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Check for function definition
      const functionMatch = functionRegex.exec(trimmedLine);
      if (functionMatch) {
        // If we were tracking a function, add it to issues if complexity is high enough
        if (currentFunction && currentFunction.complexity >= threshold) {
          issues.push({
            line: currentFunction.startLine,
            complexity: currentFunction.complexity,
            functionName: currentFunction.name,
            message: `Function '${currentFunction.name}' has high cyclomatic complexity (${currentFunction.complexity})`
          });
        }
        
        // Start tracking new function
        currentFunction = {
          name: functionMatch[1],
          startLine: i,
          complexity: 1 // Base complexity
        };
        
        // Calculate indentation for function
        functionIndentation = line.length - trimmedLine.length;
        continue;
      }
      
      // If we're in a function, calculate complexity
      if (currentFunction) {
        // Check if the line is part of the function (indentation greater than function def)
        const indentation = line.length - trimmedLine.length;
        
        if (indentation <= functionIndentation && trimmedLine.length > 0) {
          // End of function found, add to issues if complexity is high enough
          if (currentFunction.complexity >= threshold) {
            issues.push({
              line: currentFunction.startLine,
              complexity: currentFunction.complexity,
              functionName: currentFunction.name,
              message: `Function '${currentFunction.name}' has high cyclomatic complexity (${currentFunction.complexity})`
            });
          }
          
          currentFunction = null;
          continue;
        }
        
        // Check for complexity markers
        for (const marker of complexityMarkers) {
          if (trimmedLine.startsWith(marker) || 
              trimmedLine.includes(' ' + marker)) {
            currentFunction.complexity++;
            break;
          }
        }
      }
    }
    
    // Don't forget the last function
    if (currentFunction && currentFunction.complexity >= threshold) {
      issues.push({
        line: currentFunction.startLine,
        complexity: currentFunction.complexity,
        functionName: currentFunction.name,
        message: `Function '${currentFunction.name}' has high cyclomatic complexity (${currentFunction.complexity})`
      });
    }
    
    return issues;
  }
  
  /**
   * Basic analysis for languages without specific implementation
   */
  private basicAnalysis(code: string, threshold: number): ComplexityIssue[] {
    // This is a very simplified analysis for languages we don't have specific parsers for
    const issues: ComplexityIssue[] = [];
    const lines = code.split('\n');
    
    // Simple heuristic: look for blocks with many control statements
    let currentBlockStart = -1;
    let currentBlockName = '';
    let currentComplexity = 0;
    let bracketBalance = 0;
    
    // Complexity markers that are common across many languages
    const complexityMarkers = [
      'if', 'else', 'for', 'while', 'switch', 'case', '&&', '||', '?:'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and common comment formats
      if (line.length === 0 || line.startsWith('//') || line.startsWith('#') || 
          line.startsWith('/*') || line.startsWith('*')) {
        continue;
      }
      
      // Count opening/closing brackets to track blocks
      const openBrackets = (line.match(/{/g) || []).length;
      const closeBrackets = (line.match(/}/g) || []).length;
      
      // Opening a new block
      if (bracketBalance === 0 && openBrackets > 0) {
        const blockNameMatch = /\s*(\w+)\s*\([^)]*\)\s*{/.exec(line);
        currentBlockStart = i;
        currentBlockName = blockNameMatch ? blockNameMatch[1] : 'anonymous';
        currentComplexity = 1; // Base complexity
      }
      
      bracketBalance += openBrackets - closeBrackets;
      
      // Inside a block, count complexity
      if (currentBlockStart >= 0) {
        for (const marker of complexityMarkers) {
          if (line.includes(marker)) {
            currentComplexity++;
            break;
          }
        }
      }
      
      // Block ended
      if (currentBlockStart >= 0 && bracketBalance === 0 && closeBrackets > 0) {
        // Check if complexity is above threshold
        if (currentComplexity >= threshold) {
          issues.push({
            line: currentBlockStart,
            complexity: currentComplexity,
            functionName: currentBlockName,
            message: `Block '${currentBlockName}' has high cyclomatic complexity (${currentComplexity})`
          });
        }
        
        currentBlockStart = -1;
        currentBlockName = '';
        currentComplexity = 0;
      }
    }
    
    return issues;
  }
}