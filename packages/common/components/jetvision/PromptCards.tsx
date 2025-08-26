'use client';
import React from 'react';
import { cn } from '@repo/ui';
import { scrollToChatInputWithFocus } from '@repo/common/utils/scroll-utils';
import { 
    IconRocket, 
    IconUsers, 
    IconChartBar,
    IconPlane,
    IconCalendar,
    IconTarget,
    IconTrendingUp,
    IconMail,
    IconSearch,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';

interface PromptCard {
    id: string;
    category: 'charter' | 'apollo' | 'travel' | 'leads' | 'analytics';
    title: string;
    prompt: string;
    description: string;
    icon: React.ElementType;
}

// All 20 enhanced prompt cards from jetvision-enhanced-prompts.md
const promptCards: PromptCard[] = [
    // Jet Charter Operations (4 cards)
    {
        id: 'jet-1',
        category: 'charter',
        title: 'Aircraft Availability',
        prompt: 'Which aircraft are available for tomorrow\'s Miami to New York flight?',
        description: 'Check real-time fleet availability for specific routes',
        icon: IconPlane,
    },
    {
        id: 'jet-2',
        category: 'charter',
        title: 'Empty Legs',
        prompt: 'Show me empty leg opportunities for this weekend',
        description: 'Find discounted repositioning flights and save costs',
        icon: IconPlane,
    },
    {
        id: 'jet-3',
        category: 'charter',
        title: 'Fleet Utilization',
        prompt: 'What\'s our fleet utilization rate this month?',
        description: 'Monitor aircraft usage metrics and optimization',
        icon: IconPlane,
    },
    {
        id: 'jet-4',
        category: 'charter',
        title: 'Heavy Jet Search',
        prompt: 'Find me a heavy jet for 12 passengers to London next Tuesday',
        description: 'Search for specific aircraft types by passenger count',
        icon: IconPlane,
    },

    // Apollo Campaign Management (4 cards)
    {
        id: 'apollo-1',
        category: 'apollo',
        title: 'Weekly Conversions',
        prompt: 'How many prospects converted to bookings this week?',
        description: 'Track conversion metrics from campaigns to bookings',
        icon: IconRocket,
    },
    {
        id: 'apollo-2',
        category: 'apollo',
        title: 'EA Engagement',
        prompt: 'Which executive assistants opened our emails the most?',
        description: 'Analyze engagement patterns for executive assistants',
        icon: IconMail,
    },
    {
        id: 'apollo-3',
        category: 'apollo',
        title: 'Finance Campaigns',
        prompt: 'Show me response rates for my finance industry campaigns',
        description: 'Industry-specific campaign performance metrics',
        icon: IconRocket,
    },
    {
        id: 'apollo-4',
        category: 'apollo',
        title: 'VIP Campaign',
        prompt: 'Create a VIP campaign for our hottest prospects',
        description: 'Launch targeted campaigns for high-value leads',
        icon: IconTarget,
    },

    // Travel Planning & Coordination (4 cards)
    {
        id: 'travel-1',
        category: 'travel',
        title: 'Multi-City Planning',
        prompt: 'Plan a multi-city roadshow for our tech executive client',
        description: 'Complex itinerary management across multiple cities',
        icon: IconCalendar,
    },
    {
        id: 'travel-2',
        category: 'travel',
        title: 'Weather Routes',
        prompt: 'What are the best routes for avoiding weather delays this week?',
        description: 'Weather-optimized routing for minimal disruption',
        icon: IconCalendar,
    },
    {
        id: 'travel-3',
        category: 'travel',
        title: 'Industry Patterns',
        prompt: 'Show me seasonal travel patterns for entertainment industry',
        description: 'Analyze travel trends by industry and season',
        icon: IconTrendingUp,
    },
    {
        id: 'travel-4',
        category: 'travel',
        title: 'Ground Transport',
        prompt: 'Coordinate ground transportation for tomorrow\'s charter',
        description: 'End-to-end travel coordination including ground',
        icon: IconCalendar,
    },

    // Lead Generation & Targeting (4 cards)
    {
        id: 'lead-1',
        category: 'leads',
        title: 'PE Assistants',
        prompt: 'Find 20 executive assistants at NYC private equity firms',
        description: 'Target high-value segments in private equity',
        icon: IconUsers,
    },
    {
        id: 'lead-2',
        category: 'leads',
        title: 'Job Changes',
        prompt: 'Who changed jobs in our target market last 30 days?',
        description: 'Track career transitions for timely outreach',
        icon: IconUsers,
    },
    {
        id: 'lead-3',
        category: 'leads',
        title: 'Decision Makers',
        prompt: 'Identify decision makers at Fortune 500 companies',
        description: 'Executive targeting at major corporations',
        icon: IconTarget,
    },
    {
        id: 'lead-4',
        category: 'leads',
        title: 'Web Visitors',
        prompt: 'Which prospects visited our pricing page this week?',
        description: 'Intent-based lead scoring from web activity',
        icon: IconSearch,
    },

    // Analytics & Insights (4 cards)
    {
        id: 'analytics-1',
        category: 'analytics',
        title: 'Conversion Trends',
        prompt: 'What\'s our conversion rate compared to last quarter?',
        description: 'Performance benchmarking across time periods',
        icon: IconChartBar,
    },
    {
        id: 'analytics-2',
        category: 'analytics',
        title: 'Campaign ROI',
        prompt: 'Show me ROI by campaign type and industry',
        description: 'Revenue attribution analysis by segment',
        icon: IconChartBar,
    },
    {
        id: 'analytics-3',
        category: 'analytics',
        title: 'Message Performance',
        prompt: 'Which message templates get the best response rates?',
        description: 'Content optimization through A/B testing',
        icon: IconMail,
    },
    {
        id: 'analytics-4',
        category: 'analytics',
        title: 'Executive Briefing',
        prompt: 'Generate my Monday morning executive briefing',
        description: 'Automated reporting and insights summary',
        icon: IconTrendingUp,
    },
];

// Category configurations
const categoryConfig = {
    charter: {
        label: 'Jet Charter Operations',
        icon: IconPlane,
        description: 'Fleet management and aircraft availability',
    },
    apollo: {
        label: 'Apollo Campaign Management', 
        icon: IconRocket,
        description: 'Sales intelligence and email campaigns',
    },
    travel: {
        label: 'Travel Planning & Coordination',
        icon: IconCalendar,
        description: 'Multi-city itineraries and logistics',
    },
    leads: {
        label: 'Lead Generation & Targeting',
        icon: IconUsers,
        description: 'Prospect identification and scoring',
    },
    analytics: {
        label: 'Analytics & Insights',
        icon: IconChartBar,
        description: 'Performance metrics and reporting',
    },
};

interface PromptCardsProps {
    onSelectPrompt: (prompt: string) => void;
    className?: string;
}

export const PromptCards: React.FC<PromptCardsProps> = ({ onSelectPrompt, className }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    // Group cards by category
    const groupedCards = promptCards.reduce((acc, card) => {
        if (!acc[card.category]) {
            acc[card.category] = [];
        }
        acc[card.category].push(card);
        return acc;
    }, {} as Record<string, typeof promptCards>);

    return (
        <motion.div 
            className={cn("w-full", className)}
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Category Sections */}
            <div className="space-y-8">
                {Object.entries(groupedCards).map(([category, cards]) => {
                    const config = categoryConfig[category as keyof typeof categoryConfig];
                    return (
                        <div key={category} className="space-y-4">
                            {/* Category Header */}
                            <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                                <div className="flex items-center gap-3">
                                    <config.icon size={20} className="text-gray-600 dark:text-gray-400" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {config.label}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">
                                            {config.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {cards.map((card) => (
                                    <motion.div
                                        key={card.id}
                                        variants={item}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <button
                                            onClick={() => {
                                                onSelectPrompt(card.prompt);
                                                // Trigger smooth scroll to chat input after prompt selection
                                                scrollToChatInputWithFocus(100);
                                            }}
                                            className={cn(
                                                "group relative w-full rounded-lg p-4 text-left transition-all",
                                                "bg-white dark:bg-gray-900",
                                                "border border-gray-200 dark:border-gray-800",
                                                "shadow-md hover:shadow-lg",
                                                "hover:border-gray-300 dark:hover:border-gray-700",
                                                "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                            )}
                                        >
                                            <div className="flex h-full flex-col gap-2">
                                                {/* Icon */}
                                                <div className="mb-1">
                                                    <card.icon 
                                                        size={20} 
                                                        className="text-gray-600 dark:text-gray-400" 
                                                    />
                                                </div>
                                                
                                                {/* Title */}
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                                    {card.title}
                                                </h4>
                                                
                                                {/* Description - 2 lines */}
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};