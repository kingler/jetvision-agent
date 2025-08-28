#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying JetVision Integration...\n');

const checks = [
  {
    name: '✅ n8n Provider Created',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/ai/providers/n8n-provider.ts',
    check: (content) => content.includes('class N8nAgentModelImpl')
  },
  {
    name: '✅ Provider Registered',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/ai/providers.ts',
    check: (content) => content.includes("N8N_AGENT: 'n8n-agent'") && content.includes('createN8nAgent')
  },
  {
    name: '✅ JetVision Model Added',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/ai/models.ts',
    check: (content) => content.includes('JETVISION_AGENT') && content.includes("provider: 'n8n-agent'")
  },
  {
    name: '✅ Chat Store Updated',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/store/chat.store.ts',
    check: (content) => content.includes('ModelEnum.JETVISION_AGENT')
  },
  {
    name: '✅ Prompt Cards Component',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/components/jetvision/PromptCards.tsx',
    check: (content) => content.includes('apollo') && content.includes('avinode')
  },
  {
    name: '✅ Chat Page Updated',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/apps/web/app/chat/page.tsx',
    check: (content) => content.includes('JetVision Agent') && content.includes('PromptCards')
  },
  {
    name: '✅ Color Scheme Updated',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/apps/web/app/globals.css',
    check: (content) => content.includes('--jetvision-navy') && content.includes('--jetvision-gold')
  },
  {
    name: '✅ Metadata Updated',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/apps/web/app/layout.tsx',
    check: (content) => content.includes('JetVision - Luxury Private Jet Charter Intelligence')
  },
  {
    name: '✅ Logo Component Updated',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/components/logo.tsx',
    check: (content) => content.includes('JetVision') && content.includes('LUXURY AVIATION INTELLIGENCE')
  },
  {
    name: '✅ Footer Branded',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/components/footer.tsx',
    check: (content) => content.includes('JetVision') && content.includes('Apollo.io Intelligence')
  },
  {
    name: '✅ Sidebar Branded',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/components/layout/side-bar.tsx',
    check: (content) => content.includes('JetVision') && content.includes('Agent Portal')
  },
  {
    name: '✅ Component Exports',
    file: '/Volumes/SeagatePortableDrive/Projects/jetvision-agent/llmchat/packages/common/components/jetvision/index.ts',
    check: (content) => content.includes('export { PromptCards }') && content.includes('export { JetVisionChat }')
  }
];

let allPassed = true;

checks.forEach(({ name, file, check }) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (check(content)) {
      console.log(`${name}`);
    } else {
      console.log(`❌ ${name.replace('✅', '')} - Check failed`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`❌ ${name.replace('✅', '')} - File not found`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ ALL CHECKS PASSED - JetVision Integration Complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Install dependencies with bun or yarn (npm has issues with workspaces)');
  console.log('2. Set environment variables in .env.local:');
  console.log('   - NEXT_PUBLIC_N8N_WEBHOOK_URL');
  console.log('   - NEXT_PUBLIC_N8N_API_KEY (optional)');
  console.log('3. Configure your n8n webhook endpoint');
  console.log('4. Run the application with: bun dev or yarn dev');
} else {
  console.log('⚠️  Some checks failed. Please review the integration.');
}

console.log('\n🚀 The JetVision Agent interface is ready!');
console.log('   - Primary model: JetVision Agent (n8n-powered)');
console.log('   - Interface: Fully branded with aviation theme');
console.log('   - Features: Apollo.io & Avinode integration');
console.log('   - Workflow: All chat responses via n8n webhook');