#!/usr/bin/env python3
"""
Claude Code Hook: Prevent Duplicate Code Creation

This hook prevents recreating code functions, configurations, and files by first
searching the file structure to check if the code already exists.
"""

import json
import sys
import os
import re
import subprocess
from pathlib import Path
from typing import List, Tuple, Dict, Any


def search_existing_files(project_dir: str, filename: str) -> List[str]:
    """Search for existing files with similar names."""
    try:
        # Use ripgrep to find files with similar names (if available)
        result = subprocess.run([
            'rg', '--files', '--glob', f'*{Path(filename).stem}*', project_dir
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            return [f.strip() for f in result.stdout.split('\n') if f.strip()]
        
        # Fallback to find command
        result = subprocess.run([
            'find', project_dir, '-name', f'*{Path(filename).stem}*', '-type', 'f'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            return [f.strip() for f in result.stdout.split('\n') if f.strip()]
            
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        pass
    
    return []


def extract_function_names(content: str) -> List[str]:
    """Extract function/class/component names from content."""
    patterns = [
        r'function\s+([a-zA-Z_][a-zA-Z0-9_]*)',  # JavaScript/TypeScript functions
        r'const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=.*=>',  # Arrow functions
        r'export\s+(?:function\s+)?([a-zA-Z_][a-zA-Z0-9_]*)',  # Exports
        r'class\s+([a-zA-Z_][a-zA-Z0-9_]*)',  # Classes
        r'interface\s+([a-zA-Z_][a-zA-Z0-9_]*)',  # TypeScript interfaces
        r'type\s+([a-zA-Z_][a-zA-Z0-9_]*)',  # TypeScript types
        r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)',  # Python functions
        r'public\s+(?:static\s+)?(?:void\s+|[a-zA-Z_][a-zA-Z0-9_<>]*\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(',  # Java methods
    ]
    
    names = []
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
        names.extend([match.group(1) for match in matches])
    
    return list(set(names))


def search_existing_code(project_dir: str, function_names: List[str]) -> List[Tuple[str, str]]:
    """Search for existing code with similar function/class names."""
    found_matches = []
    
    for name in function_names:
        try:
            # Search for function/class definitions
            result = subprocess.run([
                'rg', '--type-add', 'code:*.{js,ts,tsx,jsx,py,java,go,rs,php}',
                '--type', 'code', '-l',
                f'(function\\s+{name}|class\\s+{name}|const\\s+{name}|def\\s+{name}|interface\\s+{name}|type\\s+{name})',
                project_dir
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
                for file_path in files:
                    found_matches.append((name, file_path))
                    
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            continue
    
    return found_matches


def search_existing_configs(project_dir: str, file_path: str, content: str) -> List[Tuple[str, str]]:
    """Search for existing configuration files or similar configs."""
    found_matches = []
    filename = Path(file_path).name
    
    # Common config file patterns
    config_patterns = [
        r'\.json$', r'\.yaml$', r'\.yml$', r'\.toml$', r'\.ini$', r'\.cfg$',
        r'\.env', r'config\.(js|ts)$', r'\.config\.(js|ts)$', r'rc$'
    ]
    
    if any(re.search(pattern, filename, re.IGNORECASE) for pattern in config_patterns):
        try:
            # Search for similar config files
            base_name = re.sub(r'\.(json|yaml|yml|toml|ini|cfg|js|ts)$', '', filename, flags=re.IGNORECASE)
            result = subprocess.run([
                'rg', '--files', '--glob', f'*{base_name}*', project_dir
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
                for existing_file in files[:5]:  # Limit to first 5 matches
                    if existing_file != file_path:
                        found_matches.append((f"Similar config: {base_name}", existing_file))
                        
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            pass
    
    return found_matches


def generate_search_message(similar_files: List[str], code_matches: List[Tuple[str, str]], 
                          config_matches: List[Tuple[str, str]]) -> str:
    """Generate a helpful message about existing code."""
    message_parts = []
    
    if similar_files:
        message_parts.append("🔍 Found similar files:")
        for file_path in similar_files[:3]:  # Show first 3
            message_parts.append(f"  • {file_path}")
        if len(similar_files) > 3:
            message_parts.append(f"  • ... and {len(similar_files) - 3} more")
    
    if code_matches:
        message_parts.append("\n🔍 Found existing code with similar names:")
        seen_names = set()
        for name, file_path in code_matches[:5]:
            if name not in seen_names:
                message_parts.append(f"  • {name} in {file_path}")
                seen_names.add(name)
    
    if config_matches:
        message_parts.append("\n🔍 Found similar configurations:")
        for config_type, file_path in config_matches[:3]:
            message_parts.append(f"  • {file_path}")
    
    if message_parts:
        message_parts.insert(0, "⚠️  Before creating new code, please review existing similar code:")
        message_parts.append("\nRecommendation: Use the Read tool to examine existing files first, then:")
        message_parts.append("• Extend existing code if appropriate")
        message_parts.append("• Choose different names if creating new functionality")
        message_parts.append("• Consider refactoring existing code instead")
        message_parts.append("\nProceed with creation? The tool will continue after this warning.")
        
        return "\n".join(message_parts)
    
    return ""


def main():
    try:
        # Load input from stdin
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    # Get tool information
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", input_data.get("cwd", "."))

    # Only process Write, Edit, and MultiEdit tools
    if tool_name not in ["Write", "Edit", "MultiEdit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    content = tool_input.get("content", "") or tool_input.get("new_string", "")

    if not file_path or not content:
        sys.exit(0)

    # Skip if file path contains certain patterns (tests, temp files, etc.)
    skip_patterns = [
        r'/test/', r'/tests/', r'\.test\.', r'\.spec\.', 
        r'/temp/', r'/tmp/', r'/node_modules/', r'/\.git/',
        r'\.md$', r'\.txt$', r'\.log$'
    ]
    
    if any(re.search(pattern, file_path, re.IGNORECASE) for pattern in skip_patterns):
        sys.exit(0)

    # Search for existing similar files
    similar_files = search_existing_files(project_dir, Path(file_path).name)
    
    # Extract and search for function names in the content
    function_names = extract_function_names(content)
    code_matches = search_existing_code(project_dir, function_names) if function_names else []
    
    # Search for similar configuration files
    config_matches = search_existing_configs(project_dir, file_path, content)
    
    # Generate warning message if duplicates found
    warning_message = generate_search_message(similar_files, code_matches, config_matches)
    
    if warning_message:
        # Use JSON output to provide feedback without blocking
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": warning_message
            },
            "systemMessage": f"Found existing similar code for {Path(file_path).name}. Check the context for details."
        }
        print(json.dumps(output))
    
    # Allow the tool to proceed (exit code 0)
    sys.exit(0)


if __name__ == "__main__":
    main()