// src/utils/duplicationDetector.ts
import * as vscode from 'vscode';
import { DuplicationIssue } from '../codeAnalyzer';

interface DuplicationResult {
  duplicationIssues: DuplicationIssue[];
}

export class DuplicationDetector {
  /**
   * Detect code duplication in the provided code
   */
  public async detect(
    code: string, 
    filePath: string, 
    minLines: number
  ): Promise<DuplicationResult> {
    const duplicationIssues: DuplicationIssue[] = [];
    
    try {
      const lines = code.split('\n');
      
      // Skip if file is too small
      if (lines.length < minLines * 2) {
        return { duplicationIssues };
      }
      
      const duplications = this.findDuplications(lines, minLines);
      
      // Convert to duplication issues
      for (const duplication of duplications) {
        duplicationIssues.push({
          startLine: duplication.firstStart,
          endLine: duplication.firstStart + duplication.length - 1,
          message: `Duplicated block of ${duplication.length} lines`,
          duplicateLocations: [
            {
              file: filePath,
              startLine: duplication.secondStart,
              endLine: duplication.secondStart + duplication.length - 1
            }
          ]
        });
      }
      
      return { duplicationIssues };
    } catch (err) {
      console.error('Error in duplication detection:', err);
      return { duplicationIssues: [] };
    }
  }
  
  /**
   * Find duplicated code blocks
   */
  private findDuplications(
    lines: string[], 
    minLines: number
  ): Array<{firstStart: number, secondStart: number, length: number}> {
    const duplications: Array<{firstStart: number, secondStart: number, length: number}> = [];
    
    // Simple O(n²) algorithm to find duplications
    // In a real implementation, we'd use a more efficient algorithm like suffix trees
    // or the Rabin-Karp algorithm with rolling hash
    for (let i = 0; i < lines.length - minLines; i++) {
      // Skip empty lines and common patterns like imports
      if (this.shouldSkipLine(lines[i])) {
        continue;
      }
      
      for (let j = i + minLines; j < lines.length - minLines + 1; j++) {
        // Skip if the starting lines don't match
        if (lines[i] !== lines[j]) {
          continue;
        }
        
        // Check how many consecutive lines match
        let matchLength = 1;
        while (
          matchLength < minLines &&
          i + matchLength < lines.length &&
          j + matchLength < lines.length &&
          lines[i + matchLength] === lines[j + matchLength]
        ) {
          matchLength++;
        }
        
        // If we found a match that meets the minimum length
        if (matchLength >= minLines) {
          // Check if this is a new duplication or overlapping with existing ones
          const existingDuplication = duplications.find(d => 
            (i >= d.firstStart && i <= d.firstStart + d.length) || 
            (j >= d.secondStart && j <= d.secondStart + d.length)
          );
          
          if (!existingDuplication) {
            duplications.push({
              firstStart: i,
              secondStart: j,
              length: matchLength
            });
          }
          
          // Skip to the end of this duplication to avoid overlapping matches
          i += matchLength - 1;
          break;
        }
      }
    }
    
    return duplications;
  }
  
  /**
   * Check if a line should be skipped for duplication detection
   */
  private shouldSkipLine(line: string): boolean {
    const trimmedLine = line.trim();
    
    // Skip empty or very short lines
    if (trimmedLine.length < 5) {
      return true;
    }
    
    // Skip comment lines
    if (trimmedLine.startsWith('//') || 
        trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('/*') || 
        trimmedLine.startsWith('*')) {
      return true;
    }
    
    // Skip common imports/includes
    if (trimmedLine.startsWith('import ') || 
        trimmedLine.startsWith('using ') || 
        trimmedLine.startsWith('#include ')) {
      return true;
    }
    
    // Skip opening/closing braces
    if (trimmedLine === '{' || trimmedLine === '}') {
      return true;
    }
    
    return false;
  }
}