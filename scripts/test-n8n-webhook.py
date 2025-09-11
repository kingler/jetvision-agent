#!/usr/bin/env python3
"""
N8N Webhook Test Script
Morpheus Validator - JetVision Agent Project
"The time has come to make a choice."
"""

import requests
import json
import time
from datetime import datetime

# Configuration
N8N_WEBHOOK_URL = "https://n8n.vividwalls.blog/webhook/jetvision-agent"
TIMEOUT = 30

def log_info(message):
    print(f"[INFO] {message}")

def log_success(message):
    print(f"[SUCCESS] {message}")

def log_error(message):
    print(f"[ERROR] {message}")

def log_warning(message):
    print(f"[WARNING] {message}")

def test_webhook_basic():
    """Test basic webhook functionality"""
    log_info("Testing basic webhook functionality...")
    
    payload = {
        "prompt": "test workflow activation",
        "sessionId": "test-session-001",
        "id": "test-001"
    }
    
    try:
        response = requests.post(
            N8N_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        
        log_info(f"Response Status: {response.status_code}")
        log_info(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                if response_data == {} or not response_data:
                    log_warning("Webhook returned empty JSON - workflow likely not activated")
                    return False
                else:
                    log_success("Webhook returned non-empty response")
                    log_info(f"Response preview: {json.dumps(response_data, indent=2)[:500]}...")
                    return True
            except json.JSONDecodeError:
                response_text = response.text
                if not response_text.strip():
                    log_warning("Webhook returned empty response")
                    return False
                else:
                    log_success("Webhook returned text response")
                    log_info(f"Response: {response_text[:200]}...")
                    return True
        else:
            log_error(f"Webhook returned error status: {response.status_code}")
            log_error(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        log_error("Webhook request timed out")
        return False
    except requests.exceptions.RequestException as e:
        log_error(f"Webhook request failed: {e}")
        return False

def test_apollo_integration():
    """Test Apollo integration"""
    log_info("Testing Apollo integration...")
    
    payload = {
        "prompt": "Find me 3 executive assistants in New York for private aviation clients",
        "sessionId": "apollo-test-001",
        "id": "apollo-test-001",
        "category": "lead-generation"
    }
    
    try:
        response = requests.post(
            N8N_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60  # Longer timeout for Apollo requests
        )
        
        log_info(f"Apollo Test Response Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                response_text = json.dumps(response_data).lower()
                
                if "apollo" in response_text or "leads" in response_text or "executive" in response_text:
                    log_success("Apollo integration appears to be working")
                    return True
                else:
                    log_warning("Apollo integration may not be working properly")
                    log_info(f"Response: {json.dumps(response_data, indent=2)[:300]}...")
                    return False
            except json.JSONDecodeError:
                response_text = response.text.lower()
                if "apollo" in response_text or "leads" in response_text:
                    log_success("Apollo integration appears to be working")
                    return True
                else:
                    log_warning("Apollo integration may not be working")
                    return False
        else:
            log_error(f"Apollo test failed with status: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        log_error("Apollo integration test timed out")
        return False
    except requests.exceptions.RequestException as e:
        log_error(f"Apollo integration test failed: {e}")
        return False

def generate_report():
    """Generate diagnostic report"""
    log_info("Generating diagnostic report...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"../docs/n8n_diagnostic_report_{timestamp}.txt"
    
    basic_test_result = test_webhook_basic()
    apollo_test_result = test_apollo_integration()
    
    report_content = f"""N8N Webhook Diagnostic Report
Generated: {datetime.now()}
========================================

1. Basic Webhook Test:
   Status: {'✅ PASS' if basic_test_result else '❌ FAIL'}
   Details: {'Webhook responding with data' if basic_test_result else 'Webhook returning empty responses'}

2. Apollo Integration Test:
   Status: {'✅ PASS' if apollo_test_result else '❌ FAIL'}
   Details: {'Apollo integration working' if apollo_test_result else 'Apollo integration issues detected'}

3. Overall Assessment:
   {'✅ N8N workflow is functioning properly' if basic_test_result and apollo_test_result else '❌ N8N workflow requires attention'}

4. Recommendations:
   {'- System is working correctly' if basic_test_result and apollo_test_result else '''- Import JetVision-Agent-Workflow-FIXED.json
   - Deactivate conflicting workflows
   - Verify environment variables
   - Check workflow activation status'''}

5. Next Steps:
   {'- Continue monitoring system health' if basic_test_result and apollo_test_result else '''- Access N8N admin interface: https://n8n.vividwalls.blog
   - Import corrected workflow from ../n8n-workflow/JetVision-Agent-Workflow-FIXED.json
   - Activate workflow
   - Re-run diagnostics'''}
"""
    
    with open(report_file, 'w') as f:
        f.write(report_content)
    
    log_success(f"Diagnostic report saved to: {report_file}")
    print("\n" + "="*50)
    print("DIAGNOSTIC SUMMARY")
    print("="*50)
    print(report_content)

def main():
    print("="*50)
    print("N8N Webhook Test Script")
    print("Morpheus Validator Analysis")
    print("="*50)
    print()
    
    generate_report()

if __name__ == "__main__":
    main()
