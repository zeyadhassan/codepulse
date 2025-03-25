# CodePulse

> Real-time code quality metrics for rapid iteration

CodePulse is a VSCode extension designed for developers who code at high velocity, helping them maintain code quality during fast iterations. It provides real-time metrics, identifies potential issues, and offers suggestions to reduce technical debt while preserving your coding flow.

## Features

- **Real-time Code Health Analysis**: Monitors code complexity, duplication, and style consistency as you code
- **Non-blocking Feedback**: Provides insights without interrupting your flow
- **Visual Dashboard**: Track code quality metrics over time with easy-to-understand visualizations 
- **Smart Suggestions**: Receive contextual refactoring suggestions to improve code maintainability
- **Velocity-to-Quality Tracking**: See how your development speed impacts code quality

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "CodePulse"
4. Click Install

### Manual Installation

1. Download the `.vsix` file from the [releases page](https://github.com/yourusername/codepulse/releases)
2. In VS Code, go to Extensions (Ctrl+Shift+X)
3. Click on the "..." menu in the top-right of the Extensions panel
4. Select "Install from VSIX..."
5. Choose the downloaded `.vsix` file

## Usage

CodePulse works in the background by default, analyzing your code when you save files. You can also interact with it explicitly:

### Commands

Open the command palette (Ctrl+Shift+P) and type:

- `CodePulse: Show Dashboard` - Opens the metrics dashboard
- `CodePulse: Analyze Current File` - Manually trigger analysis of the current file
- `CodePulse: Apply Suggested Fix` - Apply a suggested refactoring

### Status Bar

CodePulse adds an indicator to your status bar showing the health of your current file. Click on it for quick access to the dashboard.

### Dashboard

The dashboard gives you a visual overview of your code health:

- **Overview tab**: Current project health score, complexity distribution, and duplication percentage
- **Trends tab**: Track how code health changes over time, and see the relationship between coding velocity and quality
- **Files tab**: See health scores for individual files

## Configuration

CodePulse can be configured to suit your needs:

```json
{
  "codepulse.enableAutomaticAnalysis": true,
  "codepulse.complexityThreshold": 10,
  "codepulse.duplicationThreshold": 3
}
```

| Setting                           | Description                                        | Default |
|-----------------------------------|----------------------------------------------------|---------|
| `enableAutomaticAnalysis`         | Analyze files automatically on save                | `true`  |
| `complexityThreshold`             | Threshold for cyclomatic complexity warnings       | `10`    |
| `duplicationThreshold`            | Minimum lines to consider as duplicated code       | `3`     |

## Supported Languages

CodePulse supports analysis for:

- JavaScript/TypeScript
- Python
- Basic support for other languages (Java, C#, C/C++)

## Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/codepulse.git
cd codepulse

# Install dependencies
npm install

# Build
npm run compile

# Package
npm run package
```

## Development Roadmap

- [ ] Expanded language support
- [ ] AI-powered refactoring suggestions
- [ ] Team collaboration features
- [ ] Integration with CI/CD pipelines
- [ ] Custom rule creation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.