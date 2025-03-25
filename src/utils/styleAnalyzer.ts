// src/utils/styleAnalyzer.ts
import * as vscode from 'vscode';
import { StyleIssue } from '../codeAnalyzer';

interface StyleResult {
  styleIssues: StyleIssue[];
}

export class StyleAnalyzer {
  /**
   * Analyze code style consistency
   */
  public async analyze(code: string, languageId: string): Promise<StyleResult> {
    const styleIssues: StyleIssue[] = [];
    
    try {
      const lines = code.split('\n');
      
      // Detect spacing inconsistencies
      this.checkSpacingConsistency(lines, styleIssues);
      
      // Detect naming conventions
      this.checkNamingConventions(code, languageId, styleIssues);
      
      // Detect line length issues
      this.checkLineLengths(lines, styleIssues);
      
      return { styleIssues };
    } catch (err) {
      console.error('Error in style analysis:', err);
      return { styleIssues: [] };
    }
  }
  
  /**
   * Check for consistent spacing
   */
  private checkSpacingConsistency(lines: string[], issues: StyleIssue[]): void {
    let indentType: 'spaces' | 'tabs' | null = null;
    let indentSize = 0;
    let lineNumber = 0;
    
    const indentStats = {
      spaces2: 0,
      spaces4: 0,
      tabs: 0
    };
    
    // First pass: detect indentation style
    for (const line of lines) {
      lineNumber++;
      
      if (line.trim().length === 0) {
        continue;
      }
      
      const leadingSpaces = line.match(/^( +)/);
      const leadingTabs = line.match(/^(\t+)/);
      
      if (leadingSpaces) {
        const indent = leadingSpaces[1].length;
        
        if (indent % 2 === 0) {
          indentStats.spaces2 += indent / 2;
        }
        
        if (indent % 4 === 0) {
          indentStats.spaces4 += indent / 4;
        }
      } else if (leadingTabs) {
        indentStats.tabs += leadingTabs[1].length;
      }
    }
    
    // Determine dominant indentation style
    if (indentStats.spaces2 > indentStats.spaces4 && indentStats.spaces2 > indentStats.tabs) {
      indentType = 'spaces';
      indentSize = 2;
    } else if (indentStats.spaces4 > indentStats.spaces2 && indentStats.spaces4 > indentStats.tabs) {
      indentType = 'spaces';
      indentSize = 4;
    } else if (indentStats.tabs > indentStats.spaces2 && indentStats.tabs > indentStats.spaces4) {
      indentType = 'tabs';
      indentSize = 1;
    }
    
    // Skip if we couldn't determine indentation style
    if (!indentType) {
      return;
    }
    
    // Second pass: check for inconsistencies
    lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      
      if (line.trim().length === 0) {
        continue;
      }
      
      if (indentType === 'spaces') {
        // Check for tabs in a spaces project
        if (line.match(/^\t+/)) {
          issues.push({
            line: lineNumber - 1,
            message: `Line uses tabs for indentation, but project uses ${indentSize} spaces`,
            rule: 'consistent-indentation'
          });
        } 
        // Check for inconsistent space counts
        else if (indentSize === 2) {
          const leadingSpaces = line.match(/^( +)/);
          if (leadingSpaces && leadingSpaces[1].length % 2 !== 0) {
            issues.push({
              line: lineNumber - 1,
              message: 'Line has inconsistent indentation (should be multiple of 2 spaces)',
              rule: 'consistent-indentation'
            });
          }
        } else if (indentSize === 4) {
          const leadingSpaces = line.match(/^( +)/);
          if (leadingSpaces && leadingSpaces[1].length % 4 !== 0) {
            issues.push({
              line: lineNumber - 1,
              message: 'Line has inconsistent indentation (should be multiple of 4 spaces)',
              rule: 'consistent-indentation'
            });
          }
        }
      } else if (indentType === 'tabs') {
        // Check for spaces in a tabs project
        if (line.match(/^ +/)) {
          issues.push({
            line: lineNumber - 1,
            message: 'Line uses spaces for indentation, but project uses tabs',
            rule: 'consistent-indentation'
          });
        }
      }
      
      // Check spacing around operators
      if (line.match(/[a-zA-Z0-9]=[a-zA-Z0-9]/)) {
        issues.push({
          line: lineNumber - 1,
          message: 'Missing spaces around equals operator',
          rule: 'operator-spacing'
        });
      }
      
      // Check spacing after commas
      if (line.match(/,[a-zA-Z0-9]/)) {
        issues.push({
          line: lineNumber - 1,
          message: 'Missing space after comma',
          rule: 'comma-spacing'
        });
      }
    }
  }
  
  /**
   * Check naming conventions
   */
  private checkNamingConventions(code: string, languageId: string, issues: StyleIssue[]): void {
    // Different conventions for different languages
    switch (languageId) {
      case 'javascript':
      case 'typescript':
      case 'javascriptreact':
      case 'typescriptreact':
        this.checkJavaScriptNaming(code, issues);
        break;
      case 'python':
        this.checkPythonNaming(code, issues);
        break;
      case 'csharp':
        this.checkCSharpNaming(code, issues);
        break;
      // Add more language-specific checks as needed
    }
  }
  
  /**
   * Check JavaScript/TypeScript naming conventions
   */
  private checkJavaScriptNaming(code: string, issues: StyleIssue[]): void {
    const lines = code.split('\n');
    let lineNumber = 0;
    
    // Check variable declarations
    const constRegex = /const\s+([A-Z_][A-Z0-9_]*)\s*=/g;
    const letVarRegex = /(let|var)\s+([A-Z_][A-Z0-9_]*)\s*=/g;
    const functionRegex = /function\s+([a-z_][a-zA-Z0-9]*)([A-Z])/g;
    const classRegex = /class\s+([a-z][a-zA-Z0-9]*)\s/g;
    
    for (const line of lines) {
      lineNumber++;
      
      // Check for constants using lowercase
      const constMatch = [...line.matchAll(constRegex)];
      for (const match of constMatch) {
        if (match[1].toUpperCase() === match[1] && !match[1].includes('_')) {
          issues.push({
            line: lineNumber - 1,
            message: `Constant ${match[1]} should use UPPER_SNAKE_CASE`,
            rule: 'naming-convention'
          });
        }
      }
      
      // Check let/var using uppercase
      const letVarMatch = [...line.matchAll(letVarRegex)];
      for (const match of letVarMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Variable ${match[2]} should use camelCase, not UPPER_CASE`,
          rule: 'naming-convention'
        });
      }
      
      // Check function names
      const functionMatch = [...line.matchAll(functionRegex)];
      for (const match of functionMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Function name ${match[1]}${match[2]} should use camelCase`,
          rule: 'naming-convention'
        });
      }
      
      // Check class names
      const classMatch = [...line.matchAll(classRegex)];
      for (const match of classMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Class name ${match[1]} should use PascalCase`,
          rule: 'naming-convention'
        });
      }
    }
  }
  
  /**
   * Check Python naming conventions
   */
  private checkPythonNaming(code: string, issues: StyleIssue[]): void {
    const lines = code.split('\n');
    let lineNumber = 0;
    
    const functionRegex = /def\s+([A-Z][a-zA-Z0-9_]*)\s*\(/g;
    const classRegex = /class\s+([a-z][a-zA-Z0-9_]*)\s*[:\(]/g;
    const constantRegex = /([a-z][a-zA-Z0-9_]*)\s*=\s*[^=]/g;
    
    for (const line of lines) {
      lineNumber++;
      
      // Check function names (should be snake_case)
      const functionMatch = [...line.matchAll(functionRegex)];
      for (const match of functionMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Function name ${match[1]} should use snake_case, not PascalCase`,
          rule: 'naming-convention'
        });
      }
      
      // Check class names (should be PascalCase)
      const classMatch = [...line.matchAll(classRegex)];
      for (const match of classMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Class name ${match[1]} should use PascalCase, not snake_case`,
          rule: 'naming-convention'
        });
      }
      
      // Check for constants at module level
      if (line.match(/^[A-Za-z]/)) {
        const constantMatch = [...line.matchAll(constantRegex)];
        for (const match of constantMatch) {
          if (match[1].toUpperCase() === match[1] && match[1].length > 2 && !match[1].includes('_')) {
            issues.push({
              line: lineNumber - 1,
              message: `Constant ${match[1]} should use UPPER_SNAKE_CASE`,
              rule: 'naming-convention'
            });
          }
        }
      }
    }
  }
  
  /**
   * Check C# naming conventions
   */
  private checkCSharpNaming(code: string, issues: StyleIssue[]): void {
    const lines = code.split('\n');
    let lineNumber = 0;
    
    const privateFieldRegex = /private\s+[a-zA-Z0-9_<>]+\s+([a-zA-Z0-9_]+)\s*;/g;
    const publicMethodRegex = /public\s+[a-zA-Z0-9_<>]+\s+([a-z][a-zA-Z0-9_]*)\s*\(/g;
    const privateMethodRegex = /private\s+[a-zA-Z0-9_<>]+\s+([A-Z][a-zA-Z0-9_]*)\s*\(/g;
    
    for (const line of lines) {
      lineNumber++;
      
      // Check private fields (should start with _)
      const privateFieldMatch = [...line.matchAll(privateFieldRegex)];
      for (const match of privateFieldMatch) {
        if (!match[1].startsWith('_')) {
          issues.push({
            line: lineNumber - 1,
            message: `Private field ${match[1]} should start with underscore (_)`,
            rule: 'naming-convention'
          });
        }
      }
      
      // Check public methods (should be PascalCase)
      const publicMethodMatch = [...line.matchAll(publicMethodRegex)];
      for (const match of publicMethodMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Public method ${match[1]} should use PascalCase, not camelCase`,
          rule: 'naming-convention'
        });
      }
      
      // Check private methods (should be camelCase)
      const privateMethodMatch = [...line.matchAll(privateMethodRegex)];
      for (const match of privateMethodMatch) {
        issues.push({
          line: lineNumber - 1,
          message: `Private method ${match[1]} should use camelCase, not PascalCase`,
          rule: 'naming-convention'
        });
      }
    }
  }
  
  /**
   * Check line lengths
   */
  private checkLineLengths(lines: string[], issues: StyleIssue[]): void {
    const MAX_LINE_LENGTH = 100;
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      if (line.length > MAX_LINE_LENGTH) {
        issues.push({
          line: lineNumber - 1,
          message: `Line exceeds maximum length of ${MAX_LINE_LENGTH} characters`,
          rule: 'max-line-length'
        });
      }
    }
  }
}