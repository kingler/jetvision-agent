'use client';
import React from 'react';
import { cn } from '@repo/ui';
import { 
    IconRocket, 
    IconDatabase, 
    IconUsers, 
    IconChartBar,
    IconPlane,
    IconCalendar,
    IconMail,
    IconTarget,
    IconSearch,
    IconSettings,
    IconApi,
    IconCloudComputing
} from '@tabler/icons-react';
import { motion } from 'framer-motion';

interface PromptCard {
    id: string;
    category: 'apollo' | 'avinode' | 'integration';
    title: string;
    prompt: string;
    description: string;
    icon: React.ElementType;
    iconColor: string;
}

// Enhanced prompt cards with detailed prompts from jetvision-enhanced-prompts.md
const promptCards: PromptCard[] = [
    // Jet Charter Prompts (Apollo category)
    {
        id: 'jet-1',
        category: 'apollo',
        title: 'Aircraft Availability',
        prompt: 'Which aircraft are available for tomorrow\'s Miami to New York flight?',
        description: 'Check real-time fleet availability',
        icon: IconPlane,
        iconColor: 'text-brand',
    },
    {
        id: 'jet-2',
        category: 'apollo',
        title: 'Empty Legs',
        prompt: 'Show me empty leg opportunities for this weekend',
        description: 'Find discounted repositioning flights',
        icon: IconPlane,
        iconColor: 'text-brand',
    },
    {
        id: 'jet-3',
        category: 'apollo',
        title: 'Fleet Utilization',
        prompt: 'What\'s our fleet utilization rate this month?',
        description: 'Monitor aircraft usage metrics',
        icon: IconPlane,
        iconColor: 'text-brand',
    },
    {
        id: 'jet-4',
        category: 'apollo',
        title: 'Heavy Jet Search',
        prompt: 'Find me a heavy jet for 12 passengers to London next Tuesday',
        description: 'Search for specific aircraft types',
        icon: IconPlane,
        iconColor: 'text-brand',
    },

    // Apollo Campaign Prompts
    {
        id: 'apollo-1',
        category: 'apollo',
        title: 'Weekly Conversions',
        prompt: 'How many prospects converted to bookings this week?',
        description: 'Track conversion metrics',
        icon: IconRocket,
        iconColor: 'text-purple-600',
    },
    {
        id: 'apollo-2',
        category: 'apollo',
        title: 'EA Engagement',
        prompt: 'Which executive assistants opened our emails the most?',
        description: 'Analyze engagement patterns',
        icon: IconRocket,
        iconColor: 'text-purple-600',
    },
    {
        id: 'apollo-3',
        category: 'apollo',
        title: 'Finance Campaigns',
        prompt: 'Show me response rates for my finance industry campaigns',
        description: 'Industry-specific metrics',
        icon: IconRocket,
        iconColor: 'text-purple-600',
    },
    {
        id: 'apollo-4',
        category: 'apollo',
        title: 'VIP Campaign',
        prompt: 'Create a VIP campaign for our hottest prospects',
        description: 'Launch targeted campaigns',
        icon: IconRocket,
        iconColor: 'text-purple-600',
    },

    // Travel Planning Prompts
    {
        id: 'travel-1',
        category: 'apollo',
        title: 'Multi-City Planning',
        prompt: 'Plan a multi-city roadshow for our tech executive client',
        description: 'Complex itinerary management',
        icon: IconCalendar,
        iconColor: 'text-orange-600',
    },
    {
        id: 'travel-2',
        category: 'apollo',
        title: 'Weather Routes',
        prompt: 'What are the best routes for avoiding weather delays this week?',
        description: 'Weather-optimized routing',
        icon: IconCalendar,
        iconColor: 'text-orange-600',
    },
    {
        id: 'travel-3',
        category: 'apollo',
        title: 'Industry Patterns',
        prompt: 'Show me seasonal travel patterns for entertainment industry',
        description: 'Analyze travel trends',
        icon: IconCalendar,
        iconColor: 'text-orange-600',
    },
    {
        id: 'travel-4',
        category: 'apollo',
        title: 'Ground Transport',
        prompt: 'Coordinate ground transportation for tomorrow\'s charter',
        description: 'End-to-end travel coordination',
        icon: IconCalendar,
        iconColor: 'text-orange-600',
    },

    // Lead Generation Prompts
    {
        id: 'lead-1',
        category: 'apollo',
        title: 'PE Assistants',
        prompt: 'Find 20 executive assistants at NYC private equity firms',
        description: 'Target high-value segments',
        icon: IconUsers,
        iconColor: 'text-blue-600',
    },
    {
        id: 'lead-2',
        category: 'apollo',
        title: 'Job Changes',
        prompt: 'Who changed jobs in our target market last 30 days?',
        description: 'Track career transitions',
        icon: IconUsers,
        iconColor: 'text-blue-600',
    },
    {
        id: 'lead-3',
        category: 'apollo',
        title: 'Decision Makers',
        prompt: 'Identify decision makers at Fortune 500 companies',
        description: 'Executive targeting',
        icon: IconUsers,
        iconColor: 'text-blue-600',
    },
    {
        id: 'lead-4',
        category: 'apollo',
        title: 'Web Visitors',
        prompt: 'Which prospects visited our pricing page this week?',
        description: 'Intent-based lead scoring',
        icon: IconUsers,
        iconColor: 'text-blue-600',
    },

    // Analytics Prompts
    {
        id: 'analytics-1',
        category: 'apollo',
        title: 'Conversion Trends',
        prompt: 'What\'s our conversion rate compared to last quarter?',
        description: 'Performance benchmarking',
        icon: IconChartBar,
        iconColor: 'text-green-600',
    },
    {
        id: 'analytics-2',
        category: 'apollo',
        title: 'Campaign ROI',
        prompt: 'Show me ROI by campaign type and industry',
        description: 'Revenue attribution analysis',
        icon: IconChartBar,
        iconColor: 'text-green-600',
    },
    {
        id: 'analytics-3',
        category: 'apollo',
        title: 'Message Performance',
        prompt: 'Which message templates get the best response rates?',
        description: 'Content optimization',
        icon: IconChartBar,
        iconColor: 'text-green-600',
    },
    {
        id: 'analytics-4',
        category: 'apollo',
        title: 'Executive Briefing',
        prompt: 'Generate my Monday morning executive briefing',
        description: 'Automated reporting',
        icon: IconChartBar,
        iconColor: 'text-green-600',
    },
    
    // Avinode Operations Cards
    {
        id: 'avinode-1',
        category: 'avinode',
        title: 'Aircraft Availability',
        prompt: 'Check real-time availability of Gulfstream G650 aircraft for NYC to London next week',
        description: 'Query Avinode inventory system',
        icon: IconPlane,
        iconColor: 'text-brand',
    },
    {
        id: 'avinode-2',
        category: 'avinode',
        title: 'Empty Leg Search',
        prompt: 'Find all empty leg flights from Miami to New York in the next 7 days',
        description: 'Search Avinode empty positioning flights',
        icon: IconSearch,
        iconColor: 'text-cyan-600',
    },
    {
        id: 'avinode-3',
        category: 'avinode',
        title: 'Fleet Management',
        prompt: 'Show me the current status and location of all aircraft in our managed fleet',
        description: 'Avinode fleet tracking',
        icon: IconDatabase,
        iconColor: 'text-indigo-600',
    },
    {
        id: 'avinode-4',
        category: 'avinode',
        title: 'Schedule Optimization',
        prompt: 'Optimize the flight schedule for our heavy jets this month to minimize repositioning costs',
        description: 'Avinode scheduling analysis',
        icon: IconCalendar,
        iconColor: 'text-teal-600',
    },
    
    // Integration Cards
    {
        id: 'integration-1',
        category: 'integration',
        title: 'Sync Lead Data',
        prompt: 'Sync high-value Apollo.io leads with Avinode booking requests for targeted offers',
        description: 'Cross-platform data integration',
        icon: IconApi,
        iconColor: 'text-red-600',
    },
    {
        id: 'integration-2',
        category: 'integration',
        title: 'System Health',
        prompt: 'Check the status of Apollo.io API connections and Avinode server uptime',
        description: 'Monitor integration health',
        icon: IconSettings,
        iconColor: 'text-gray-600',
    },
    {
        id: 'integration-3',
        category: 'integration',
        title: 'Automated Workflows',
        prompt: 'Show me all active n8n workflows connecting Apollo.io campaigns to Avinode bookings',
        description: 'Workflow automation status',
        icon: IconCloudComputing,
        iconColor: 'text-yellow-600',
    },
];

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
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            className={cn("w-full", className)}
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Category Headers */}
            <div className="mb-6 space-y-8">
                {/* Quick Access Prompts Section */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <IconRocket size={20} className="text-brand" />
                        <h3 className="text-lg font-semibold text-foreground">Quick Access Prompts</h3>
                        <span className="text-sm text-muted-foreground">— Click to send predefined prompts to the agent</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {promptCards
                            .filter(card => card.category === 'apollo')
                            .map((card) => (
                                <motion.div
                                    key={card.id}
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <button
                                        onClick={() => onSelectPrompt(card.prompt)}
                                        className="group relative w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-brand/50 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "rounded-md p-2 transition-colors",
                                                "bg-secondary group-hover:bg-brand/10"
                                            )}>
                                                <card.icon size={20} className={cn(card.iconColor, "transition-colors group-hover:text-brand")} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h4 className="font-medium text-foreground group-hover:text-brand">
                                                    {card.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                </motion.div>
                            ))}
                    </div>
                </div>

                {/* Avinode Section */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <IconPlane size={20} className="text-brand" />
                        <h3 className="text-lg font-semibold text-foreground">Avinode Operations</h3>
                        <span className="text-sm text-muted-foreground">— Aircraft availability & fleet management</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {promptCards
                            .filter(card => card.category === 'avinode')
                            .map((card) => (
                                <motion.div
                                    key={card.id}
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <button
                                        onClick={() => onSelectPrompt(card.prompt)}
                                        className="group relative w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-brand/50 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "rounded-md p-2 transition-colors",
                                                "bg-secondary group-hover:bg-brand/10"
                                            )}>
                                                <card.icon size={20} className={cn(card.iconColor, "transition-colors group-hover:text-brand")} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h4 className="font-medium text-foreground group-hover:text-brand">
                                                    {card.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                </motion.div>
                            ))}
                    </div>
                </div>

                {/* Integration Section */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <IconApi size={20} className="text-brand" />
                        <h3 className="text-lg font-semibold text-foreground">System Integration</h3>
                        <span className="text-sm text-muted-foreground">— Cross-platform operations & automation</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {promptCards
                            .filter(card => card.category === 'integration')
                            .map((card) => (
                                <motion.div
                                    key={card.id}
                                    variants={item}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <button
                                        onClick={() => onSelectPrompt(card.prompt)}
                                        className="group relative w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-brand/50 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "rounded-md p-2 transition-colors",
                                                "bg-secondary group-hover:bg-brand/10"
                                            )}>
                                                <card.icon size={20} className={cn(card.iconColor, "transition-colors group-hover:text-brand")} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h4 className="font-medium text-foreground group-hover:text-brand">
                                                    {card.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                </motion.div>
                            ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};