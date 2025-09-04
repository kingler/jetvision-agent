/**
 * Prompts Parser Utility
 * Parses the prompts.md file and structures data for UI consumption
 */

import React from 'react';
import {
  IconPlane,
  IconMail,
  IconMap,
  IconTarget,
  IconChartBar
} from '@tabler/icons-react';

export interface PromptCard {
  id: string;
  category: string;
  title: string;
  prompt: string;
  fullPrompt: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface PromptCategory {
  name: string;
  slug: string;
  count: number;
  prompts: PromptCard[];
  icon: React.ElementType;
  color: string;
}

const CATEGORY_ICONS = {
  'Jet Charter Operations': IconPlane,
  'Apollo Campaign Management': IconMail, 
  'Travel Planning & Coordination': IconMap,
  'Lead Generation & Targeting': IconTarget,
  'Analytics & Insights': IconChartBar
};

const CATEGORY_COLORS = {
  'Jet Charter Operations': 'bg-blue-50 text-blue-700 border-blue-200',
  'Apollo Campaign Management': 'bg-purple-50 text-purple-700 border-purple-200',
  'Travel Planning & Coordination': 'bg-green-50 text-green-700 border-green-200', 
  'Lead Generation & Targeting': 'bg-orange-50 text-orange-700 border-orange-200',
  'Analytics & Insights': 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

/**
 * Parses the raw prompts markdown content into structured data
 */
export function parsePromptsMarkdown(content: string): PromptCategory[] {
  const lines = content.split('\n');
  const categories: PromptCategory[] = [];
  let currentCategory: PromptCategory | null = null;
  let currentPrompt: Partial<PromptCard> | null = null;
  let isFullPromptSection = false;
  let fullPromptLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Category header (## Category Name (X cards))
    if (line.startsWith('## ') && line.includes('cards)')) {
      if (currentCategory) {
        categories.push(currentCategory);
      }
      
      const categoryName = line.replace(/^## /, '').replace(/ \(\d+ cards?\)$/, '');
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      currentCategory = {
        name: categoryName,
        slug,
        count: 0,
        prompts: [],
        icon: CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || IconChartBar,
        color: CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || 'bg-gray-50 text-gray-700 border-gray-200'
      };
    }
    
    // Prompt title (### Title)
    else if (line.startsWith('### ')) {
      if (currentPrompt && currentCategory) {
        // Finalize previous prompt
        if (fullPromptLines.length > 0) {
          currentPrompt.fullPrompt = fullPromptLines.join('\n').trim();
          fullPromptLines = [];
        }
        
        currentCategory.prompts.push(currentPrompt as PromptCard);
        currentCategory.count++;
      }
      
      currentPrompt = {
        title: line.replace('### ', ''),
        category: currentCategory?.name || ''
      };
      isFullPromptSection = false;
    }
    
    // Prompt fields
    else if (line.startsWith('- **ID:**')) {
      if (currentPrompt) {
        currentPrompt.id = line.replace('- **ID:** `', '').replace('`', '');
      }
    }
    else if (line.startsWith('- **Prompt:**')) {
      if (currentPrompt) {
        currentPrompt.prompt = line.replace('- **Prompt:** ', '');
      }
    }
    else if (line.startsWith('- **Description:**')) {
      if (currentPrompt) {
        currentPrompt.description = line.replace('- **Description:** ', '');
      }
    }
    else if (line.startsWith('- **Full Prompt:**')) {
      isFullPromptSection = true;
      fullPromptLines = [];
    }
    else if (line.startsWith('- **Parameters:**')) {
      isFullPromptSection = false;
      // Parameters parsing could be enhanced if needed
      if (currentPrompt) {
        currentPrompt.parameters = {};
      }
    }
    
    // Collect full prompt lines
    else if (isFullPromptSection && line && !line.startsWith('---') && !line.startsWith('- **')) {
      fullPromptLines.push(line);
    }
  }
  
  // Finalize last prompt and category
  if (currentPrompt && currentCategory) {
    if (fullPromptLines.length > 0) {
      currentPrompt.fullPrompt = fullPromptLines.join('\n').trim();
    }
    currentCategory.prompts.push(currentPrompt as PromptCard);
    currentCategory.count++;
  }
  
  if (currentCategory) {
    categories.push(currentCategory);
  }
  
  return categories;
}

/**
 * Static prompts data - this would normally be loaded from the markdown file
 * For now, including the key prompts for immediate functionality
 */
export const STATIC_PROMPTS_DATA: PromptCategory[] = [
  {
    name: 'Jet Charter Operations',
    slug: 'jet-charter',
    count: 4,
    icon: IconPlane,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    prompts: [
      {
        id: 'jet-1',
        category: 'Charter',
        title: 'Aircraft Availability',
        prompt: 'Check aircraft availability for Miami to New York tomorrow',
        fullPrompt: 'As a JetVision fleet operations specialist, search for available aircraft for tomorrow\'s flight from Miami International Airport (MIA) to New York area airports (JFK, LGA, or TEB).',
        description: 'Check real-time fleet availability for specific routes'
      },
      {
        id: 'jet-2', 
        category: 'Charter',
        title: 'Empty Legs',
        prompt: 'Find empty leg opportunities for this weekend',
        fullPrompt: 'As a JetVision charter optimization specialist, search the Avinode marketplace for empty leg (repositioning) flights available this weekend (Friday through Sunday).',
        description: 'Find discounted repositioning flights and save costs'
      },
      {
        id: 'jet-3',
        category: 'Charter', 
        title: 'Fleet Utilization',
        prompt: 'Analyze fleet utilization metrics for this month',
        fullPrompt: 'As a JetVision fleet analytics specialist, generate a comprehensive utilization report for the current month.',
        description: 'Monitor aircraft usage metrics and optimization'
      },
      {
        id: 'jet-4',
        category: 'Charter',
        title: 'Heavy Jet Search', 
        prompt: 'Search heavy jets for 12 passengers to London Tuesday',
        fullPrompt: 'As a JetVision international charter specialist, search for heavy jet aircraft capable of transatlantic flight for 12 passengers departing next Tuesday to London.',
        description: 'Search for specific aircraft types by passenger count'
      }
    ]
  },
  {
    name: 'Apollo Campaign Management',
    slug: 'apollo-campaigns',
    count: 4,
    icon: IconMail,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    prompts: [
      {
        id: 'apollo-1',
        category: 'Apollo',
        title: 'Weekly Conversions',
        prompt: 'Analyze prospect to booking conversions this week',
        fullPrompt: 'As a JetVision sales analytics specialist, analyze this week\'s conversion funnel from Apollo.io prospects to confirmed charter bookings.',
        description: 'Track conversion metrics from campaigns to bookings'
      },
      {
        id: 'apollo-2',
        category: 'Apollo', 
        title: 'EA Engagement',
        prompt: 'Identify top engaged executive assistants from campaigns',
        fullPrompt: 'As a JetVision relationship intelligence specialist, identify and analyze the most engaged executive assistants from our Apollo.io email campaigns.',
        description: 'Analyze engagement patterns for executive assistants'
      },
      {
        id: 'apollo-3',
        category: 'Apollo',
        title: 'Finance Campaigns',
        prompt: 'Analyze finance sector campaign performance metrics',
        fullPrompt: 'As a JetVision vertical marketing specialist, provide comprehensive performance analysis of all finance industry campaigns in Apollo.io.',
        description: 'Industry-specific campaign performance metrics'
      },
      {
        id: 'apollo-4',
        category: 'Apollo',
        title: 'VIP Campaign',
        prompt: 'Design VIP campaign for top 100 qualified prospects',
        fullPrompt: 'As a JetVision strategic accounts specialist, design and configure a high-touch VIP campaign in Apollo.io for our top 100 qualified prospects.',
        description: 'Launch targeted campaigns for high-value leads'
      }
    ]
  },
  {
    name: 'Lead Generation & Targeting', 
    slug: 'lead-generation',
    count: 4,
    icon: IconTarget,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    prompts: [
      {
        id: 'lead-1',
        category: 'Leads',
        title: 'PE Assistants',
        prompt: 'Find executive assistants at NYC private equity firms',
        fullPrompt: 'As a JetVision lead generation specialist, use Apollo.io to identify and qualify 20 executive assistants at New York City private equity firms.',
        description: 'Target high-value segments in private equity'
      },
      {
        id: 'lead-2',
        category: 'Leads',
        title: 'Job Changes', 
        prompt: 'Track job changes in target accounts last 30 days',
        fullPrompt: 'As a JetVision trigger-based marketing specialist, identify all job changes in our target market over the past 30 days using Apollo.io\'s intent data.',
        description: 'Track career transitions for timely outreach'
      },
      {
        id: 'lead-3',
        category: 'Leads',
        title: 'Decision Makers',
        prompt: 'Map decision makers at Fortune 500 companies',
        fullPrompt: 'As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies.',
        description: 'Executive targeting at major corporations'
      },
      {
        id: 'lead-4',
        category: 'Leads', 
        title: 'Web Visitors',
        prompt: 'Identify high-intent visitors from pricing page',
        fullPrompt: 'As a JetVision digital intelligence specialist, analyze website visitor data to identify high-intent prospects who visited our pricing page this week.',
        description: 'Intent-based lead scoring from web activity'
      }
    ]
  },
  {
    name: 'Analytics & Insights',
    slug: 'analytics',
    count: 4, 
    icon: IconChartBar,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    prompts: [
      {
        id: 'analytics-1',
        category: 'Analytics',
        title: 'Conversion Trends',
        prompt: 'Compare conversion rates with last quarter',
        fullPrompt: 'As a JetVision revenue operations analyst, provide comprehensive conversion rate analysis comparing current quarter to last quarter performance.',
        description: 'Performance benchmarking across time periods'
      },
      {
        id: 'analytics-2', 
        category: 'Analytics',
        title: 'Campaign ROI',
        prompt: 'Calculate ROI by campaign type and industry vertical',
        fullPrompt: 'As a JetVision marketing analytics specialist, calculate detailed ROI analysis for all campaign types across industry verticals.',
        description: 'Revenue attribution analysis by segment'
      },
      {
        id: 'analytics-3',
        category: 'Analytics',
        title: 'Message Performance',
        prompt: 'Analyze top performing email templates and messaging',
        fullPrompt: 'As a JetVision content optimization specialist, analyze all message templates to identify top performers and optimization opportunities.',
        description: 'Content optimization through A/B testing'
      },
      {
        id: 'analytics-4',
        category: 'Analytics', 
        title: 'Executive Briefing',
        prompt: 'Generate comprehensive Monday executive briefing',
        fullPrompt: 'As a JetVision business intelligence specialist, generate a comprehensive Monday morning executive briefing with actionable insights.',
        description: 'Automated reporting and insights summary'
      }
    ]
  }
];