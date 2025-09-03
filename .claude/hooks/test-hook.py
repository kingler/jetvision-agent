#!/usr/bin/env python3
"""
Test script for the prevent-duplicate-code hook
"""

import json
import subprocess
import sys
import os

def test_hook(tool_name, file_path, content):
    """Test the hook with sample data"""
    test_input = {
        "session_id": "test123",
        "transcript_path": "/test/path",
        "cwd": os.getcwd(),
        "hook_event_name": "PreToolUse",
        "tool_name": tool_name,
        "tool_input": {
            "file_path": file_path,
            "content": content
        }
    }
    
    # Set the environment variable
    env = os.environ.copy()
    env["CLAUDE_PROJECT_DIR"] = os.getcwd()
    
    # Run the hook
    try:
        result = subprocess.run([
            "python3", ".claude/hooks/prevent-duplicate-code.py"
        ], input=json.dumps(test_input), text=True, 
        capture_output=True, env=env, timeout=10)
        
        print(f"Exit code: {result.returncode}")
        if result.stdout:
            print(f"Stdout: {result.stdout}")
        if result.stderr:
            print(f"Stderr: {result.stderr}")
        
        # Try to parse JSON output
        if result.stdout:
            try:
                output = json.loads(result.stdout)
                print(f"JSON output: {json.dumps(output, indent=2)}")
            except json.JSONDecodeError:
                print("Output is not JSON")
        
    except subprocess.TimeoutExpired:
        print("Hook timed out")
    except Exception as e:
        print(f"Error running hook: {e}")

if __name__ == "__main__":
    print("Testing prevent-duplicate-code hook...")
    
    # Test 1: Creating a new React component
    print("\n--- Test 1: New React component ---")
    test_hook("Write", "src/components/TestComponent.tsx", """
import React from 'react';

export const TestComponent: React.FC = () => {
  return <div>Test</div>;
};
""")
    
    # Test 2: Creating a function that might exist
    print("\n--- Test 2: Function that might exist ---")
    test_hook("Write", "src/utils/helper.ts", """
export function formatDate(date: Date): string {
  return date.toISOString();
}

export class DataProcessor {
  process(data: any) {
    return data;
  }
}
""")
    
    # Test 3: Configuration file
    print("\n--- Test 3: Configuration file ---")
    test_hook("Write", "config/database.json", """
{
  "host": "localhost",
  "port": 5432,
  "database": "test"
}
""")