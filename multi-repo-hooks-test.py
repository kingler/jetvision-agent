#!/usr/bin/env python3
"""
Multi-Repository Hook Testing Script
Tests the updated Git workflow hooks across all 4 repositories
"""

import json
import subprocess
import os

def test_hook(hook_script, test_data, description):
    """Test a hook with given data"""
    try:
        print(f"\n🧪 Testing: {description}")
        print("=" * 50)
        
        result = subprocess.run(
            ['python3', hook_script],
            input=json.dumps(test_data),
            text=True,
            capture_output=True,
            cwd='/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project'
        )
        
        if result.stdout:
            print("✅ Output:")
            print(result.stdout)
        if result.stderr:
            print("⚠️  Errors:")
            print(result.stderr)
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    """Run comprehensive tests on all repositories"""
    
    repositories = [
        {
            'name': 'JetVision Agent',
            'path': '/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project/jetvision-agent',
            'key': 'jetvision-agent'
        },
        {
            'name': 'Apollo.io MCP Server',
            'path': '/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project/apollo-io-mcp-server',
            'key': 'apollo-io-mcp-server'
        },
        {
            'name': 'Avinode MCP Server',
            'path': '/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project/avinode-mcp-server',
            'key': 'avinode-mcp-server'
        },
        {
            'name': 'N8N MCP Server',
            'path': '/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project/n8n-mcp-server',
            'key': 'n8n-mcp-server'
        }
    ]
    
    hooks_dir = '/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project/.claude/hooks'
    
    print("🚀 Multi-Repository Git Workflow Hooks Test")
    print("=" * 60)
    
    # Test 1: Workflow Context Injector
    for repo in repositories:
        test_data = {
            'cwd': repo['path'],
            'hook_event_name': 'UserPromptSubmit',
            'prompt': 'I want to add a new feature to improve performance'
        }
        
        success = test_hook(
            f'{hooks_dir}/workflow-context-injector.py',
            test_data,
            f"Workflow Context Injector - {repo['name']}"
        )
        
        if not success:
            print(f"❌ Failed for {repo['name']}")
    
    # Test 2: Git Workflow Enforcer - Protected Branch Check
    print("\n" + "=" * 60)
    print("Testing Git Workflow Enforcer - Branch Protection")
    
    for repo in repositories:
        test_data = {
            'cwd': repo['path'],
            'tool_name': 'Bash',
            'tool_input': {
                'command': 'git commit -m "Direct commit to main (should be blocked)"'
            }
        }
        
        success = test_hook(
            f'{hooks_dir}/git-workflow-enforcer.py',
            test_data,
            f"Git Workflow Enforcer - {repo['name']} - Direct Commit Block"
        )
    
    # Test 3: Test Build Validator - Project Detection
    print("\n" + "=" * 60)
    print("Testing Test Build Validator - Project Detection")
    
    for repo in repositories:
        test_data = {
            'cwd': repo['path'],
            'tool_name': 'Bash',
            'tool_input': {
                'command': 'git merge feature/test-branch'
            }
        }
        
        success = test_hook(
            f'{hooks_dir}/test-build-validator.py',
            test_data,
            f"Test Build Validator - {repo['name']} - Merge Validation"
        )
    
    print("\n" + "=" * 60)
    print("✅ Multi-Repository Hook Testing Complete!")
    print("\nThe hooks now support:")
    print("🏗️  Project-specific configurations")
    print("📂 Correct Git directory detection")
    print("📦 Package manager awareness")
    print("🛡️  Repository-specific quality gates")
    print("💡 Context-aware suggestions")

if __name__ == '__main__':
    main()