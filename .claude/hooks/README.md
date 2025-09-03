# Claude Code Hooks: Prevent Duplicate Code Creation

This directory contains Claude Code hooks that help prevent recreating existing code by automatically searching the project structure before creating new files or functions.

## 🎯 Purpose

The `prevent-duplicate-code.py` hook is designed to:

- **Search existing files** with similar names before creating new ones
- **Detect existing functions/classes** with matching names in the codebase  
- **Find similar configuration files** to avoid duplication
- **Provide helpful warnings** without blocking code creation
- **Suggest best practices** like extending existing code or choosing different names

## 🔧 Files

### Core Hook
- `prevent-duplicate-code.py` - Main hook script that prevents code duplication
- `test-hook.py` - Test script to verify hook functionality

### Configuration
- `../settings.json` - Claude Code settings that enable the hook

## ⚙️ How It Works

The hook is triggered on `PreToolUse` events for:
- ✅ `Write` - Creating new files
- ✅ `Edit` - Editing existing files  
- ✅ `MultiEdit` - Multiple file edits

### Search Process

1. **File Search**: Uses `ripgrep` (or `find` as fallback) to locate similar filenames
2. **Function Detection**: Extracts function/class/component names from content using regex patterns
3. **Code Search**: Searches for existing implementations of detected names
4. **Config Detection**: Identifies and searches for similar configuration files
5. **Warning Generation**: Creates helpful messages with recommendations

### Supported Languages

The hook detects code patterns for:
- **JavaScript/TypeScript**: functions, arrow functions, classes, interfaces, types
- **Python**: functions and classes
- **Java**: methods and classes
- **Configuration files**: JSON, YAML, TOML, INI, ENV files

## 📋 Example Output

When duplicates are found, Claude receives a warning like:

```
⚠️  Before creating new code, please review existing similar code:

🔍 Found similar files:
  • /path/to/existing/helper.ts
  • /path/to/another/utility.ts

🔍 Found existing code with similar names:
  • formatDate in /components/date-formatter.tsx
  • DataProcessor in /utils/data-utils.ts

Recommendation: Use the Read tool to examine existing files first, then:
• Extend existing code if appropriate
• Choose different names if creating new functionality  
• Consider refactoring existing code instead

Proceed with creation? The tool will continue after this warning.
```

## 🧪 Testing

Run the test script to verify the hook works:

```bash
python3 .claude/hooks/test-hook.py
```

This tests various scenarios:
- New React component creation
- Function/class duplication detection
- Configuration file similarity detection

## ⚡ Performance

- **Timeout**: 30 seconds maximum execution time
- **Search limits**: Limited to first few matches to avoid overwhelming output
- **Fallback**: Uses `find` if `ripgrep` is not available
- **Skip patterns**: Automatically skips test files, temporary files, and documentation

## 🎛️ Customization

### Modify Search Patterns

Edit the `prevent-duplicate-code.py` script to:
- Add new programming language patterns
- Adjust function/class detection regex
- Modify skip patterns for certain file types
- Change the number of results shown

### Adjust Timeout

In `.claude/settings.json`, modify the timeout value:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/prevent-duplicate-code.py",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

## 🚨 Important Notes

- **Non-blocking**: The hook provides warnings but doesn't prevent code creation
- **Context injection**: Warnings are added to Claude's context for consideration
- **Performance impact**: Searches are optimized but may add a few seconds to tool execution
- **Requires restart**: Claude Code needs to be restarted after hook configuration changes

## 🛠️ Troubleshooting

### Hook Not Running
1. Check if `.claude/settings.json` exists and is valid JSON
2. Ensure the hook script is executable: `chmod +x .claude/hooks/prevent-duplicate-code.py`
3. Restart Claude Code after configuration changes

### Timeout Issues  
1. Increase timeout in settings.json
2. Check if `ripgrep` is installed for better performance
3. Reduce search scope by adding more skip patterns

### Debug Mode
Run Claude Code with `--debug` flag to see hook execution details.

## 🔄 Future Enhancements

Potential improvements:
- **Semantic similarity**: Use AI to detect functionally similar code
- **Import analysis**: Check if functions are already imported/available
- **Git integration**: Consider recent changes and branch history
- **Team collaboration**: Share common patterns across team members
- **IDE integration**: Sync with VS Code workspace for better context