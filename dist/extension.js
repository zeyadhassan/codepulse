/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
// src/extension.ts
const vscode = __importStar(__webpack_require__(1));
const codeAnalyzer_1 = __webpack_require__(2);
const metricsCollector_1 = __webpack_require__(6);
const suggestionProvider_1 = __webpack_require__(7);
const dashboardView_1 = __webpack_require__(8);
const statusBar_1 = __webpack_require__(11);
// Add new TreeDataProvider classes for the views
class SuggestionsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.suggestions = [];
    }
    refresh(newSuggestions) {
        this.suggestions = newSuggestions;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        if (this.suggestions.length === 0) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.suggestions.map(suggestion => {
            const item = new SuggestionItem(suggestion.title, suggestion.description, vscode.TreeItemCollapsibleState.None);
            item.command = {
                command: 'codepulse.applyQuickFix',
                title: 'Apply Fix',
                arguments: [suggestion]
            };
            item.contextValue = 'suggestion';
            item.tooltip = suggestion.description;
            return item;
        }));
    }
}
class MetricsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.metrics = {};
    }
    refresh(newMetrics) {
        this.metrics = newMetrics;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        if (!this.metrics || Object.keys(this.metrics).length === 0) {
            return Promise.resolve([]);
        }
        const items = [];
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
    constructor(label, description, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
    }
}
class MetricItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
    }
}
function activate(context) {
    console.log('CodePulse extension is now active');
    // Initialize components
    const metricsCollector = new metricsCollector_1.MetricsCollector(context.globalState);
    const codeAnalyzer = new codeAnalyzer_1.CodeAnalyzer();
    const suggestionProvider = new suggestionProvider_1.SuggestionProvider();
    const dashboardView = new dashboardView_1.DashboardView(context, metricsCollector);
    const statusBar = new statusBar_1.StatusBarManager();
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
        }
        else {
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
    async function analyzeDocument(document) {
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
        }
        catch (err) {
            console.error('Analysis error:', err);
            statusBar.setError();
            return null;
        }
    }
    // Helper to determine if a file is a code file
    function isCodeFile(document) {
        const fileName = document.fileName.toLowerCase();
        const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs'];
        return supportedExtensions.some(ext => fileName.endsWith(ext));
    }
    // Create diagnostics collection
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('codepulse');
    // Function to update diagnostics
    function updateDiagnostics(document, results, _suggestions) {
        const diagnostics = [];
        // Convert complexity issues to diagnostics
        results.complexityIssues.forEach((issue) => {
            const range = new vscode.Range(issue.line, 0, issue.line, document.lineAt(issue.line).text.length);
            const diagnostic = new vscode.Diagnostic(range, `High complexity (${issue.complexity}): ${issue.message}`, vscode.DiagnosticSeverity.Warning);
            diagnostic.source = 'CodePulse';
            diagnostic.code = 'complexity';
            diagnostics.push(diagnostic);
        });
        // Convert duplication issues to diagnostics
        results.duplicationIssues.forEach((issue) => {
            const startLine = issue.startLine;
            const endLine = issue.endLine;
            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length);
            const diagnostic = new vscode.Diagnostic(range, `Duplicated code: ${issue.message}`, vscode.DiagnosticSeverity.Information);
            diagnostic.source = 'CodePulse';
            diagnostic.code = 'duplication';
            diagnostics.push(diagnostic);
        });
        // Add style issues
        results.styleIssues.forEach((issue) => {
            const range = new vscode.Range(issue.line, 0, issue.line, document.lineAt(issue.line).text.length);
            const diagnostic = new vscode.Diagnostic(range, `Style issue: ${issue.message}`, vscode.DiagnosticSeverity.Information);
            diagnostic.source = 'CodePulse';
            diagnostic.code = 'style';
            diagnostics.push(diagnostic);
        });
        // Set diagnostics for the current file
        diagnosticsCollection.set(document.uri, diagnostics);
    }
    // Add all disposables to context subscriptions
    context.subscriptions.push(analyzeOnSaveDisposable, showDashboardDisposable, analyzeCurrentFileDisposable, applyQuickFixDisposable, diagnosticsCollection, statusBar);
    // Analyze current file on activation if one is open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        analyzeDocument(activeEditor.document);
    }
}
exports.activate = activate;
function deactivate() {
    // Clean up resources
}
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeAnalyzer = void 0;
// src/codeAnalyzer.ts
const vscode = __importStar(__webpack_require__(1));
const complexityCalculator_1 = __webpack_require__(3);
const duplicationDetector_1 = __webpack_require__(4);
const styleAnalyzer_1 = __webpack_require__(5);
class CodeAnalyzer {
    constructor() {
        this.complexityCalculator = new complexityCalculator_1.ComplexityCalculator();
        this.duplicationDetector = new duplicationDetector_1.DuplicationDetector();
        this.styleAnalyzer = new styleAnalyzer_1.StyleAnalyzer();
    }
    async analyze(document) {
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
            const complexityThreshold = config.get('complexityThreshold');
            const duplicationThreshold = config.get('duplicationThreshold');
            // Run complexity analysis
            const complexityResults = await this.complexityCalculator.calculate(text, languageId, complexityThreshold);
            // Run duplication detection
            const duplicationResults = await this.duplicationDetector.detect(text, fileName, duplicationThreshold);
            // Run style analysis
            const styleResults = await this.styleAnalyzer.analyze(text, languageId);
            // Calculate metrics
            const metrics = this.calculateMetrics(text, complexityResults.complexityIssues, duplicationResults.duplicationIssues);
            // Calculate overall health score (0-100)
            const overallHealth = this.calculateHealthScore(complexityResults.complexityIssues, duplicationResults.duplicationIssues, styleResults.styleIssues, metrics);
            return {
                overallHealth,
                complexityIssues: complexityResults.complexityIssues,
                duplicationIssues: duplicationResults.duplicationIssues,
                styleIssues: styleResults.styleIssues,
                metrics
            };
        }
        catch (err) {
            console.error('Error during analysis:', err);
            return this.createEmptyResult('Analysis error');
        }
    }
    calculateMetrics(text, complexityIssues, duplicationIssues) {
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
            }
            else if (trimmedLine.startsWith('//')) {
                commentLines++;
            }
            else if (trimmedLine.startsWith('/*')) {
                commentLines++;
                if (!trimmedLine.includes('*/')) {
                    inBlockComment = true;
                }
            }
            else if (trimmedLine.length > 0) {
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
    calculateHealthScore(complexityIssues, _duplicationIssues, styleIssues, metrics) {
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
    createEmptyResult(_reason) {
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
exports.CodeAnalyzer = CodeAnalyzer;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ComplexityCalculator = void 0;
class ComplexityCalculator {
    /**
     * Calculate cyclomatic complexity for the given code
     */
    async calculate(code, languageId, threshold) {
        const complexityIssues = [];
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
        }
        catch (err) {
            console.error('Error in complexity calculation:', err);
            return { complexityIssues: [] };
        }
    }
    /**
     * Analyze JavaScript/TypeScript code for complexity
     */
    analyzeJavaScriptFamily(code, threshold) {
        const issues = [];
        const lines = code.split('\n');
        // Simple function detection - look for function declarations and arrow functions
        const functionRegex = /function\s+(\w+)\s*\(/g;
        const methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
        const arrowFunctionRegex = /(const|let|var)?\s*(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)=>/g;
        // Track function blocks to calculate complexity
        const functionBlocks = [];
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
            const activeBlocks = functionBlocks.filter(block => block.startLine <= i && (block.endLine === null || block.endLine >= i));
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
    analyzePython(code, threshold) {
        const issues = [];
        const lines = code.split('\n');
        // Look for function definitions in Python
        const functionRegex = /def\s+(\w+)\s*\(/;
        // Complexity markers in Python
        const complexityMarkers = [
            'if ', 'elif ', 'else:', 'for ', 'while ',
            'except:', 'finally:', 'and ', 'or '
        ];
        let currentFunction = null;
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
    basicAnalysis(code, threshold) {
        // This is a very simplified analysis for languages we don't have specific parsers for
        const issues = [];
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
exports.ComplexityCalculator = ComplexityCalculator;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DuplicationDetector = void 0;
class DuplicationDetector {
    /**
     * Detect code duplication in the provided code
     */
    async detect(code, filePath, minLines) {
        const duplicationIssues = [];
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
        }
        catch (err) {
            console.error('Error in duplication detection:', err);
            return { duplicationIssues: [] };
        }
    }
    /**
     * Find duplicated code blocks
     */
    findDuplications(lines, minLines) {
        const duplications = [];
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
                while (matchLength < minLines &&
                    i + matchLength < lines.length &&
                    j + matchLength < lines.length &&
                    lines[i + matchLength] === lines[j + matchLength]) {
                    matchLength++;
                }
                // If we found a match that meets the minimum length
                if (matchLength >= minLines) {
                    // Check if this is a new duplication or overlapping with existing ones
                    const existingDuplication = duplications.find(d => (i >= d.firstStart && i <= d.firstStart + d.length) ||
                        (j >= d.secondStart && j <= d.secondStart + d.length));
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
    shouldSkipLine(line) {
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
exports.DuplicationDetector = DuplicationDetector;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StyleAnalyzer = void 0;
class StyleAnalyzer {
    /**
     * Analyze code style consistency
     */
    async analyze(code, languageId) {
        const styleIssues = [];
        try {
            const lines = code.split('\n');
            // Detect spacing inconsistencies
            this.checkSpacingConsistency(lines, styleIssues);
            // Detect naming conventions
            this.checkNamingConventions(code, languageId, styleIssues);
            // Detect line length issues
            this.checkLineLengths(lines, styleIssues);
            return { styleIssues };
        }
        catch (err) {
            console.error('Error in style analysis:', err);
            return { styleIssues: [] };
        }
    }
    /**
     * Check for consistent spacing
     */
    checkSpacingConsistency(lines, issues) {
        let indentType = null;
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
            }
            else if (leadingTabs) {
                indentStats.tabs += leadingTabs[1].length;
            }
        }
        // Determine dominant indentation style
        if (indentStats.spaces2 > indentStats.spaces4 && indentStats.spaces2 > indentStats.tabs) {
            indentType = 'spaces';
            indentSize = 2;
        }
        else if (indentStats.spaces4 > indentStats.spaces2 && indentStats.spaces4 > indentStats.tabs) {
            indentType = 'spaces';
            indentSize = 4;
        }
        else if (indentStats.tabs > indentStats.spaces2 && indentStats.tabs > indentStats.spaces4) {
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
                }
                else if (indentSize === 4) {
                    const leadingSpaces = line.match(/^( +)/);
                    if (leadingSpaces && leadingSpaces[1].length % 4 !== 0) {
                        issues.push({
                            line: lineNumber - 1,
                            message: 'Line has inconsistent indentation (should be multiple of 4 spaces)',
                            rule: 'consistent-indentation'
                        });
                    }
                }
            }
            else if (indentType === 'tabs') {
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
    checkNamingConventions(code, languageId, issues) {
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
    checkJavaScriptNaming(code, issues) {
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
    checkPythonNaming(code, issues) {
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
    checkCSharpNaming(code, issues) {
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
    checkLineLengths(lines, issues) {
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
exports.StyleAnalyzer = StyleAnalyzer;


/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MetricsCollector = void 0;
// src/metricsCollector.ts
const vscode = __importStar(__webpack_require__(1));
// Maximum number of historical metrics to store
const MAX_HISTORY = 30;
class MetricsCollector {
    constructor(globalState) {
        this.globalState = globalState;
        // Load metrics from state or initialize with defaults
        this.currentMetrics = this.loadMetrics() || this.createDefaultMetrics();
        this.historicalMetrics = this.loadHistoricalMetrics() || [];
    }
    /**
     * Record metrics for a specific file
     */
    recordMetrics(filePath, analysisResult) {
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
            }
            else if (issue.complexity <= 10) {
                complexityData.medium++;
            }
            else if (issue.complexity <= 20) {
                complexityData.high++;
            }
            else {
                complexityData.veryHigh++;
            }
        });
        // Store file metrics
        const fileMetrics = {
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
    getFileMetrics(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        return this.currentMetrics.fileMetrics[normalizedPath];
    }
    /**
     * Get all metrics
     */
    getAllMetrics() {
        return this.currentMetrics;
    }
    /**
     * Get historical metrics
     */
    getHistoricalMetrics() {
        return this.historicalMetrics;
    }
    /**
     * Clear metrics for a specific file
     */
    clearFileMetrics(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        delete this.currentMetrics.fileMetrics[normalizedPath];
        this.updateProjectMetrics();
        this.saveMetrics();
    }
    /**
     * Clear all metrics
     */
    clearAllMetrics() {
        this.currentMetrics = this.createDefaultMetrics();
        this.historicalMetrics = [];
        this.saveMetrics();
        this.saveHistoricalMetrics();
    }
    /**
     * Update project-wide metrics based on file metrics
     */
    updateProjectMetrics() {
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
            const complexityCounts = this.calculateComplexityCounts(metric.complexity.average, metric.complexity.count);
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
    calculateComplexityCounts(averageComplexity, count) {
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
        }
        else if (averageComplexity <= 10) {
            // Mostly medium complexity
            result.medium = Math.round(count * 0.6);
            result.low = Math.round(count * 0.3);
            result.high = count - result.medium - result.low;
        }
        else if (averageComplexity <= 15) {
            // Mix of medium and high
            result.medium = Math.round(count * 0.4);
            result.high = Math.round(count * 0.4);
            result.low = Math.round(count * 0.1);
            result.veryHigh = count - result.medium - result.high - result.low;
        }
        else {
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
    updateHistoricalMetrics() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        // Check if we already have an entry for today
        const todayEntryIndex = this.historicalMetrics.findIndex(metric => {
            const metricDate = new Date(metric.timestamp);
            metricDate.setHours(0, 0, 0, 0);
            return metricDate.getTime() === todayTimestamp;
        });
        if (todayEntryIndex !== -1) {
            // Update today's entry
            this.historicalMetrics[todayEntryIndex] = {
                timestamp: todayTimestamp,
                overallHealth: this.currentMetrics.overallHealth,
                codeChanges: this.historicalMetrics[todayEntryIndex].codeChanges + 1
            };
        }
        else {
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
    createDefaultMetrics() {
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
    normalizePath(filePath) {
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
    loadMetrics() {
        const metrics = this.globalState.get('codepulse.metrics');
        return metrics;
    }
    /**
     * Save metrics to storage
     */
    saveMetrics() {
        this.globalState.update('codepulse.metrics', this.currentMetrics);
    }
    /**
     * Load historical metrics from storage
     */
    loadHistoricalMetrics() {
        return this.globalState.get('codepulse.historicalMetrics');
    }
    /**
     * Save historical metrics to storage
     */
    saveHistoricalMetrics() {
        this.globalState.update('codepulse.historicalMetrics', this.historicalMetrics);
    }
}
exports.MetricsCollector = MetricsCollector;


/***/ }),
/* 7 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SuggestionProvider = void 0;
// src/suggestionProvider.ts
const vscode = __importStar(__webpack_require__(1));
class SuggestionProvider {
    /**
     * Provide refactoring and improvement suggestions based on analysis results
     */
    provideSuggestions(document, analysisResult) {
        const suggestions = [];
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
    createComplexitySuggestion(document, issue) {
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
            const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, document.lineAt(endLine).text.length));
            // Generate suggestion based on complexity
            if (issue.complexity > 20) {
                return {
                    title: `Split function "${issue.functionName}" into smaller functions`,
                    description: `This function has very high complexity (${issue.complexity}). Consider splitting it into smaller, more focused functions.`,
                    actionType: 'info',
                    issueType: 'complexity',
                    location: range
                };
            }
            else if (issue.complexity > 10) {
                return {
                    title: `Simplify function "${issue.functionName}"`,
                    description: `This function has high complexity (${issue.complexity}). Look for repeated logic or nested conditions that could be extracted.`,
                    actionType: 'info',
                    issueType: 'complexity',
                    location: range
                };
            }
        }
        catch (err) {
            console.error('Error creating complexity suggestion:', err);
        }
        return null;
    }
    /**
     * Create suggestion for duplication issue
     */
    createDuplicationSuggestion(document, issue) {
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
            const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, document.lineAt(endLine).text.length));
            // Check duplicated code type and make specific suggestions
            if (duplicatedCode.includes('if') || duplicatedCode.includes('switch')) {
                return {
                    title: `Extract duplicated conditional logic into a helper function`,
                    description: `This code block appears multiple times. Extract it into a reusable function.`,
                    actionType: 'info',
                    issueType: 'duplication',
                    location: range
                };
            }
            else if (duplicatedCode.match(/for|while|forEach|map|filter|reduce/)) {
                return {
                    title: `Extract duplicated loop into a utility function`,
                    description: `This loop logic appears multiple times. Extract it into a reusable function.`,
                    actionType: 'info',
                    issueType: 'duplication',
                    location: range
                };
            }
            else {
                return {
                    title: `Extract duplicated code starting with "${firstLine.substring(0, 30)}..."`,
                    description: `This code block of ${endLine - startLine + 1} lines appears multiple times. Extract it into a reusable function.`,
                    actionType: 'info',
                    issueType: 'duplication',
                    location: range
                };
            }
        }
        catch (err) {
            console.error('Error creating duplication suggestion:', err);
        }
        return null;
    }
    /**
     * Create suggestion for style issue
     */
    createStyleSuggestion(document, issue) {
        try {
            const line = issue.line;
            const lineText = document.lineAt(line).text;
            const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, lineText.length));
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
                        const tabSize = config.get('tabSize') || 4;
                        let properIndent = '';
                        if (useSpaces) {
                            // Round to nearest multiple of tabSize
                            const properSpaceCount = Math.round(leadingSpaceCount / tabSize) * tabSize;
                            properIndent = ' '.repeat(properSpaceCount);
                        }
                        else {
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
        }
        catch (err) {
            console.error('Error creating style suggestion:', err);
        }
        return null;
    }
}
exports.SuggestionProvider = SuggestionProvider;


/***/ }),
/* 8 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DashboardView = void 0;
// src/dashboardView.ts
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(9));
class DashboardView {
    constructor(context, metricsCollector) {
        this.context = context;
        this.metricsCollector = metricsCollector;
    }
    show() {
        // If we already have a panel, show it
        if (this.panel) {
            this.panel.reveal();
            return;
        }
        // Create and show a new webview panel
        this.panel = vscode.window.createWebviewPanel('codepulseDashboard', // Identifies the type of panel
        'CodePulse Dashboard', // Title displayed to the user
        vscode.ViewColumn.One, // Editor column to show in
        {
            // Enable scripts in the webview
            enableScripts: true,
            // Restrict the webview to only load resources from the extension's directory
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'views'))]
        });
        // Set initial HTML content
        this.updateWebviewContent();
        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(message => {
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
        }, undefined, this.context.subscriptions);
        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);
    }
    updateWebviewContent() {
        if (!this.panel) {
            return;
        }
        this.panel.webview.html = this.getWebviewContent();
        this.sendMetricsToWebview();
    }
    sendMetricsToWebview() {
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
    getWebviewContent() {
        // Get path to Chart.js script - try multiple possible locations
        let chartJsPath;
        try {
            // First try UMD version
            const umdPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
            // Check if file exists
            const fs = __webpack_require__(10);
            if (fs.existsSync(umdPath)) {
                chartJsPath = vscode.Uri.file(umdPath);
            }
            else {
                // Try the minified version
                const minPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.min.js');
                if (fs.existsSync(minPath)) {
                    chartJsPath = vscode.Uri.file(minPath);
                }
                else {
                    // Try the regular version
                    const regPath = path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.js');
                    if (fs.existsSync(regPath)) {
                        chartJsPath = vscode.Uri.file(regPath);
                    }
                    else {
                        // Last resort - use a fallback mechanism
                        console.error('Chart.js not found in any expected location');
                        chartJsPath = vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'));
                    }
                }
            }
        }
        catch (error) {
            console.error('Error finding Chart.js:', error);
            // Fallback path
            chartJsPath = vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'));
        }
        const chartJsUri = this.panel.webview.asWebviewUri(chartJsPath);
        console.log('Chart.js script URI:', chartJsUri.toString());
        // Get path to dashboard CSS
        const cssPath = vscode.Uri.file(path.join(this.context.extensionPath, 'views', 'css', 'dashboard.css'));
        const cssUri = this.panel.webview.asWebviewUri(cssPath);
        // Read the dashboard HTML file
        const dashboardHtmlPath = path.join(this.context.extensionPath, 'views', 'dashboard.html');
        try {
            // Read the file content
            const fs = __webpack_require__(10);
            let htmlContent = fs.readFileSync(dashboardHtmlPath, 'utf8');
            // Replace placeholder for Chart.js script with actual URI
            // Make the replacement more robust by using a more direct approach
            const headEndIndex = htmlContent.indexOf('</head>');
            if (headEndIndex !== -1) {
                const beforeHead = htmlContent.substring(0, headEndIndex);
                const afterHead = htmlContent.substring(headEndIndex);
                htmlContent = beforeHead + `<script src="${chartJsUri}"></script>\n` + afterHead;
            }
            else {
                // Fallback replacement if </head> not found
                htmlContent = htmlContent.replace('<script>\n        // Placeholder for Chart.js - will be replaced by the extension\n    </script>', `<script src="${chartJsUri}"></script>`);
            }
            // Replace CSS href
            htmlContent = htmlContent.replace('href="css/dashboard.css"', `href="${cssUri}"`);
            console.log('Dashboard HTML prepared with Chart.js inserted before </head>');
            return htmlContent;
        }
        catch (error) {
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
exports.DashboardView = DashboardView;


/***/ }),
/* 9 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 11 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StatusBarManager = void 0;
// src/statusBar.ts
const vscode = __importStar(__webpack_require__(1));
class StatusBarManager {
    constructor() {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
    setIdle() {
        this.statusBarItem.text = '$(pulse) CodePulse';
        this.statusBarItem.backgroundColor = undefined;
    }
    /**
     * Set status to indicate analyzing state
     */
    setAnalyzing() {
        this.statusBarItem.text = '$(sync~spin) CodePulse: Analyzing...';
        this.statusBarItem.backgroundColor = undefined;
    }
    /**
     * Set status to indicate health level
     */
    setHealth(health, tooltip) {
        let icon;
        let color;
        if (health >= 80) {
            // Good health
            icon = '$(check)';
            color = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else if (health >= 60) {
            // Moderate health
            icon = '$(warning)';
            color = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        else {
            // Poor health
            icon = '$(error)';
            color = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        this.statusBarItem.text = `${icon} CodePulse: ${Math.round(health)}`;
        this.statusBarItem.backgroundColor = color;
        if (tooltip) {
            this.statusBarItem.tooltip = `Code Health: ${Math.round(health)}/100\n${tooltip}\nClick to open dashboard`;
        }
        else {
            this.statusBarItem.tooltip = `Code Health: ${Math.round(health)}/100\nClick to open dashboard`;
        }
    }
    /**
     * Set status to indicate error state
     */
    setError() {
        this.statusBarItem.text = '$(error) CodePulse: Error';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBarItem.tooltip = 'Error during analysis. Click to retry.';
    }
    /**
     * Dispose status bar item
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map