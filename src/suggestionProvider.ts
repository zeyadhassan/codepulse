// src/suggestionProvider.ts
import * as vscode from 'vscode';
import { AnalysisResult, ComplexityIssue, DuplicationIssue, StyleIssue } from './codeAnalyzer';

export interface Suggestion {
  title: string;
  description: string;
  actionType: 'refactor' | 'info';
  edit?: vscode.WorkspaceEdit;
  issueType: 'complexity' | 'duplication' | 'style';
  location: vscode.Range;
}

export class SuggestionProvider {
  /**
   * Provide refactoring and improvement suggestions based on analysis results
   */
  public provideSuggestions(
    document: vscode.TextDocument, 
    analysisResult: AnalysisResult
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Generate suggestions for complexity issues
    for (const issue of analysisResult.complexityIssues) {
      const suggestion = this.createComplexitySuggestion(document, issue);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    // Generate suggestions for duplication issues
    for (const issue of analysisResult.duplicationIssues) {
      const suggestion = this.createDuplicationSuggestion(document, issue);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    // Generate suggestions for style issues
    for (const issue of analysisResult.styleIssues) {
      const suggestion = this.createStyleSuggestion(document, issue);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Create suggestion for complexity issue
   */
  private createComplexitySuggestion(
    document: vscode.TextDocument, 
    issue: ComplexityIssue
  ): Suggestion | null {
    try {
      const line = issue.line;
      const lineText = document.lineAt(line).text;
      
      // Create range for the function or block
      let startLine = line;
      let endLine = line;
      
      // Find opening and closing braces for the function
      let blockFound = false;
      let braceBalance = 0;
      let inFunction = false;
      
      // Look for function signature
      if (lineText.includes('function') || lineText.match(/\w+\s*\(/)) {
        inFunction = true;
      }
      
      // Find block limits
      if (inFunction) {
        for (let i = line; i < document.lineCount; i++) {
          const currentLine = document.lineAt(i).text;
          
          if (!blockFound && currentLine.includes('{')) {
            blockFound = true;
          }
          
          if (blockFound) {
            braceBalance += (currentLine.match(/{/g) || []).length;
            braceBalance -= (currentLine.match(/}/g) || []).length;
            
            if (braceBalance === 0) {
              endLine = i;
              break;
            }
          }
        }
      }
      
      const range = new vscode.Range(
        new vscode.Position(startLine, 0),
        new vscode.Position(endLine, document.lineAt(endLine).text.length)
      );
      
      // Generate suggestion based on complexity
      if (issue.complexity > 20) {
        return {
          title: `Split function "${issue.functionName}" into smaller functions`,
          description: `This function has very high complexity (${issue.complexity}). Consider splitting it into smaller, more focused functions.`,
          actionType: 'info',
          issueType: 'complexity',
          location: range
        };
      } else if (issue.complexity > 10) {
        return {
          title: `Simplify function "${issue.functionName}"`,
          description: `This function has high complexity (${issue.complexity}). Look for repeated logic or nested conditions that could be extracted.`,
          actionType: 'info',
          issueType: 'complexity',
          location: range
        };
      }
    } catch (err) {
      console.error('Error creating complexity suggestion:', err);
    }
    
    return null;
  }
  
  /**
   * Create suggestion for duplication issue
   */
  private createDuplicationSuggestion(
    document: vscode.TextDocument, 
    issue: DuplicationIssue
  ): Suggestion | null {
    try {
      const startLine = issue.startLine;
      const endLine = issue.endLine;
      
      // Extract the duplicated code
      let duplicatedCode = '';
      for (let i = startLine; i <= endLine; i++) {
        duplicatedCode += document.lineAt(i).text + '\n';
      }
      
      const lines = duplicatedCode.split('\n');
      const firstLine = lines[0].trim();
      const lastLine = lines[lines.length - 2].trim(); // Last non-empty line
      
      const range = new vscode.Range(
        new vscode.Position(startLine, 0),
        new vscode.Position(endLine, document.lineAt(endLine).text.length)
      );
      
      // Check duplicated code type and make specific suggestions
      if (duplicatedCode.includes('if') || duplicatedCode.includes('switch')) {
        return {
          title: `Extract duplicated conditional logic into a helper function`,
          description: `This code block appears multiple times. Extract it into a reusable function.`,
          actionType: 'info',
          issueType: 'duplication',
          location: range
        };
      } else if (duplicatedCode.match(/for|while|forEach|map|filter|reduce/)) {
        return {
          title: `Extract duplicated loop into a utility function`,
          description: `This loop logic appears multiple times. Extract it into a reusable function.`,
          actionType: 'info',
          issueType: 'duplication',
          location: range
        };
      } else {
        return {
          title: `Extract duplicated code starting with "${firstLine.substring(0, 30)}..."`,
          description: `This code block of ${endLine - startLine + 1} lines appears multiple times. Extract it into a reusable function.`,
          actionType: 'info',
          issueType: 'duplication',
          location: range
        };
      }
    } catch (err) {
      console.error('Error creating duplication suggestion:', err);
    }
    
    return null;
  }
  
  /**
   * Create suggestion for style issue
   */
  private createStyleSuggestion(
    document: vscode.TextDocument, 
    issue: StyleIssue
  ): Suggestion | null {
    try {
      const line = issue.line;
      const lineText = document.lineAt(line).text;
      const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lineText.length)
      );
      
      // Create suggestion based on rule type
      switch (issue.rule) {
        case 'consistent-indentation': {
          // Fix indentation
          const workspaceEdit = new vscode.WorkspaceEdit();
          const indentMatch = lineText.match(/^[\t ]+/);
          
          if (indentMatch) {
            const currentIndent = indentMatch[0];
            const leadingSpaceCount = currentIndent.replace(/\t/g, '    ').length;
            const config = vscode.workspace.getConfiguration('editor');
            const useSpaces = config.get('insertSpaces');
            const tabSize = config.get('tabSize') as number || 4;
            
            let properIndent = '';
            if (useSpaces) {
              // Round to nearest multiple of tabSize
              const properSpaceCount = Math.round(leadingSpaceCount / tabSize) * tabSize;
              properIndent = ' '.repeat(properSpaceCount);
            } else {
              // Convert to tabs
              const tabCount = Math.round(leadingSpaceCount / tabSize);
              properIndent = '\t'.repeat(tabCount);
            }
            
            const fixedLine = properIndent + lineText.trimLeft();
            workspaceEdit.replace(document.uri, range, fixedLine);
            
            return {
              title: 'Fix indentation to match project style',
              description: issue.message,
              actionType: 'refactor',
              edit: workspaceEdit,
              issueType: 'style',
              location: range
            };
          }
          break;
        }
        
        case 'operator-spacing': {
          // Fix spacing around operators
          const workspaceEdit = new vscode.WorkspaceEdit();
          const fixedLine = lineText
            .replace(/(\w+)=(\w+)/g, '$1 = $2')
            .replace(/(\w+)\+=(\w+)/g, '$1 += $2')
            .replace(/(\w+)-=(\w+)/g, '$1 -= $2')
            .replace(/(\w+)\*=(\w+)/g, '$1 *= $2')
            .replace(/(\w+)\/=(\w+)/g, '$1 /= $2');
            
          workspaceEdit.replace(document.uri, range, fixedLine);
          
          return {
            title: 'Add spaces around operators',
            description: issue.message,
            actionType: 'refactor',
            edit: workspaceEdit,
            issueType: 'style',
            location: range
          };
        }
        
        case 'comma-spacing': {
          // Fix spacing after commas
          const workspaceEdit = new vscode.WorkspaceEdit();
          const fixedLine = lineText.replace(/,(\w)/g, ', $1');
          workspaceEdit.replace(document.uri, range, fixedLine);
          
          return {
            title: 'Add spaces after commas',
            description: issue.message,
            actionType: 'refactor',
            edit: workspaceEdit,
            issueType: 'style',
            location: range
          };
        }
        
        case 'naming-convention': {
          // Just highlight naming convention issues, don't auto-fix
          return {
            title: 'Review naming convention',
            description: issue.message,
            actionType: 'info',
            issueType: 'style',
            location: range
          };
        }
        
        case 'max-line-length': {
          return {
            title: 'Consider breaking long line into multiple lines',
            description: issue.message,
            actionType: 'info',
            issueType: 'style',
            location: range
          };
        }
      }
    } catch (err) {
      console.error('Error creating style suggestion:', err);
    }
    
    return null;
  }
}