#!/usr/bin/env node

/**
 * Quick check script for send button implementation
 */

const fs = require('fs');
const path = require('path');

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

console.log(`\n${colors.cyan}🔍 Checking Send Button Implementation${colors.reset}`);
console.log('=' .repeat(50));

// Check if required files exist
const filesToCheck = [
    {
        path: 'app/api/n8n-webhook/route.ts',
        checks: [
            { pattern: /execution\.status === 'error'/, desc: 'Error handling' },
            { pattern: /PROGRESS_TIMEOUT/, desc: 'Timeout monitoring' },
            { pattern: /extractResponseFromExecutionData/, desc: 'Response extraction' }
        ]
    },
    {
        path: 'lib/n8n-response-transformer.ts',
        checks: [
            { pattern: /transformN8nResponse/, desc: 'Response transformer' },
            { pattern: /extractStructuredData/, desc: 'Structured data extraction' }
        ]
    },
    {
        path: '../../packages/common/components/chat-input/chat-actions.tsx',
        checks: [
            { pattern: /console\.log\('\[SendButton\] Clicked/, desc: 'Send button logging' },
            { pattern: /hasTextInput \|\| isGenerating/, desc: 'Button state checks' },
            { pattern: /sendMessage\(\)/, desc: 'Send message call' }
        ]
    },
    {
        path: '../../packages/common/components/chat-input/input.tsx',
        checks: [
            { pattern: /formData\.append\('query', messageText\)/, desc: 'Plain text query' },
            { pattern: /useN8n: true/, desc: 'Force n8n usage' },
            { pattern: /console\.log\('Sending message to n8n:/, desc: 'Debug logging' }
        ]
    }
];

let allPassed = true;

filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, '..', file.path);
    console.log(`\n📁 Checking: ${file.path}`);
    
    if (fs.existsSync(filePath)) {
        console.log(`  ${colors.green}✅ File exists${colors.reset}`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        file.checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`  ${colors.green}✅ ${check.desc}${colors.reset}`);
            } else {
                console.log(`  ${colors.red}❌ ${check.desc} - NOT FOUND${colors.reset}`);
                allPassed = false;
            }
        });
    } else {
        console.log(`  ${colors.red}❌ File not found${colors.reset}`);
        allPassed = false;
    }
});

console.log('\n' + '=' .repeat(50));

if (allPassed) {
    console.log(`${colors.green}✅ All checks passed! Send button implementation looks good.${colors.reset}`);
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log('1. Start the dev server: bun dev');
    console.log('2. Open http://localhost:3000');
    console.log('3. Type a message in the chat');
    console.log('4. Click the send button');
    console.log('5. Check browser console for debug logs\n');
} else {
    console.log(`${colors.yellow}⚠️  Some checks failed. Please review the issues above.${colors.reset}\n`);
}

// Check for environment variables
console.log(`${colors.cyan}Environment Check:${colors.reset}`);
const envVars = [
    'NEXT_PUBLIC_N8N_WEBHOOK_URL',
    'N8N_API_KEY'
];

envVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`  ${colors.green}✅ ${envVar} is set${colors.reset}`);
    } else {
        console.log(`  ${colors.yellow}⚠️  ${envVar} not set (check .env file)${colors.reset}`);
    }
});

console.log('\n');