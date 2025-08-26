'use client';
import { useRootContext } from '@repo/common/context';
import { useAppStore, useChatStore } from '@repo/common/store';
import {
    cn,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    Kbd,
} from '@repo/ui';
import {
    IconCommand,
    IconKey,
    IconMessageCircleFilled,
    IconPlus,
    IconTrash,
    IconPlane,
    IconChartBar,
    IconUsers,
    IconRocket,
    IconTarget,
    IconBrandCampaignmonitor,
    IconCalendar,
    IconTrendingUp,
} from '@tabler/icons-react';
import moment from 'moment';
import { useTheme } from 'next-themes';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const CommandSearch = () => {
    const { threadId: currentThreadId } = useParams();
    const { isCommandSearchOpen, setIsCommandSearchOpen } = useRootContext();
    const threads = useChatStore(state => state.threads);
    const getThread = useChatStore(state => state.getThread);
    const removeThread = useChatStore(state => state.deleteThread);
    const switchThread = useChatStore(state => state.switchThread);
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const clearThreads = useChatStore(state => state.clearAllThreads);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const setSettingTab = useAppStore(state => state.setSettingTab);
    const groupedThreads: Record<string, typeof threads> = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        previousMonths: [],
    };

    const groupsNames = {
        today: 'Today',
        yesterday: 'Yesterday',
        last7Days: 'Last 7 Days',
        last30Days: 'Last 30 Days',
        previousMonths: 'Previous Months',
    };

    threads.forEach(thread => {
        const createdAt = moment(thread.createdAt);
        const now = moment();
        if (createdAt.isSame(now, 'day')) {
            groupedThreads.today.push(thread);
        } else if (createdAt.isSame(now.clone().subtract(1, 'day'), 'day')) {
            groupedThreads.yesterday.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(7, 'days'))) {
            groupedThreads.last7Days.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(30, 'days'))) {
            groupedThreads.last30Days.push(thread);
        } else {
            groupedThreads.previousMonths.push(thread);
        }
    });

    useEffect(() => {
        router.prefetch('/chat');
    }, [isCommandSearchOpen, threads, router]);

    useEffect(() => {
        if (isCommandSearchOpen) {
        }
    }, [isCommandSearchOpen]);

    const onClose = () => setIsCommandSearchOpen(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandSearchOpen(true);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const actions = [
        {
            name: 'New Thread',
            icon: IconPlus,
            action: () => {
                router.push('/chat');
                onClose();
            },
        },
        {
            name: 'Delete Thread',
            icon: IconTrash,
            action: async () => {
                const thread = await getThread(currentThreadId as string);
                if (thread) {
                    removeThread(thread.id);
                    router.push('/chat');
                    onClose();
                }
            },
        },
        {
            name: 'Use your own API key',
            icon: IconKey,
            action: () => {
                setIsSettingsOpen(true);
                setSettingTab('api-keys');
                onClose();
            },
        },
        {
            name: 'Remove All Threads',
            icon: IconTrash,
            action: () => {
                clearThreads();
                router.push('/chat');
                onClose();
            },
        },
    ];

    // Helper function to set prompt in chat input
    const setPromptInEditor = (prompt: string) => {
        const editor = useChatStore.getState().editor;
        if (editor) {
            editor.commands.clearContent();
            editor.commands.insertContent(prompt);
            router.push('/chat');
            onClose();
        }
    };

    // Jet Charter Operations
    const jetCharterActions = [
        {
            name: 'Aircraft Availability',
            icon: IconPlane,
            description: 'Check real-time fleet availability',
            prompt: "Which aircraft are available for tomorrow's Miami to New York flight?",
            action: () => setPromptInEditor("Which aircraft are available for tomorrow's Miami to New York flight?"),
        },
        {
            name: 'Empty Legs',
            icon: IconPlane,
            description: 'Find discounted repositioning flights',
            prompt: 'What empty leg opportunities are available from Los Angeles this week?',
            action: () => setPromptInEditor('What empty leg opportunities are available from Los Angeles this week?'),
        },
        {
            name: 'Fleet Utilization',
            icon: IconPlane,
            description: 'Monitor aircraft usage metrics',
            prompt: "How can we improve fleet utilization for our Gulfstream G650 aircraft?",
            action: () => setPromptInEditor("How can we improve fleet utilization for our Gulfstream G650 aircraft?"),
        },
        {
            name: 'Heavy Jet Search',
            icon: IconPlane,
            description: 'Search for specific aircraft types',
            prompt: 'Find available heavy jets for a 10-passenger transatlantic flight next month',
            action: () => setPromptInEditor('Find available heavy jets for a 10-passenger transatlantic flight next month'),
        },
    ];

    // Apollo Campaigns
    const apolloCampaignActions = [
        {
            name: 'Weekly Conversions',
            icon: IconChartBar,
            description: 'Track conversion metrics',
            prompt: 'What were our Apollo.io email campaign conversion rates last week?',
            action: () => setPromptInEditor('What were our Apollo.io email campaign conversion rates last week?'),
        },
        {
            name: 'EA Engagement',
            icon: IconUsers,
            description: 'Analyze engagement patterns',
            prompt: 'Which executive assistants have the highest engagement rates with our campaigns?',
            action: () => setPromptInEditor('Which executive assistants have the highest engagement rates with our campaigns?'),
        },
        {
            name: 'Finance Campaigns',
            icon: IconBrandCampaignmonitor,
            description: 'Industry-specific metrics',
            prompt: 'How did our financial services jet charter campaigns perform last quarter?',
            action: () => setPromptInEditor('How did our financial services jet charter campaigns perform last quarter?'),
        },
        {
            name: 'VIP Campaign',
            icon: IconRocket,
            description: 'Launch targeted campaigns',
            prompt: 'Create a VIP jet charter campaign for Fortune 500 CEOs',
            action: () => setPromptInEditor('Create a VIP jet charter campaign for Fortune 500 CEOs'),
        },
    ];

    // Travel Planning
    const travelPlanningActions = [
        {
            name: 'Multi-City Planning',
            icon: IconCalendar,
            description: 'Complex itinerary management',
            prompt: 'Plan a multi-city European tour: London, Paris, Geneva, ending in Monaco',
            action: () => setPromptInEditor('Plan a multi-city European tour: London, Paris, Geneva, ending in Monaco'),
        },
        {
            name: 'Weather Routes',
            icon: IconCalendar,
            description: 'Weather-optimized routing',
            prompt: 'What are the best weather-optimized routes for Caribbean flights this hurricane season?',
            action: () => setPromptInEditor('What are the best weather-optimized routes for Caribbean flights this hurricane season?'),
        },
        {
            name: 'Industry Patterns',
            icon: IconCalendar,
            description: 'Analyze travel trends',
            prompt: 'What are the peak travel patterns for tech executives to Austin?',
            action: () => setPromptInEditor('What are the peak travel patterns for tech executives to Austin?'),
        },
        {
            name: 'Ground Transport',
            icon: IconCalendar,
            description: 'End-to-end travel coordination',
            prompt: 'Coordinate ground transportation for our Teterboro to Manhattan clients',
            action: () => setPromptInEditor('Coordinate ground transportation for our Teterboro to Manhattan clients'),
        },
    ];

    // Lead Generation
    const leadGenerationActions = [
        {
            name: 'Series B Funding',
            icon: IconTrendingUp,
            description: 'Target funded companies',
            prompt: 'Find companies that recently raised Series B funding and may need charter services',
            action: () => setPromptInEditor('Find companies that recently raised Series B funding and may need charter services'),
        },
        {
            name: 'EA Database',
            icon: IconUsers,
            description: 'Executive assistant targeting',
            prompt: 'Build a list of executive assistants at private equity firms in New York',
            action: () => setPromptInEditor('Build a list of executive assistants at private equity firms in New York'),
        },
        {
            name: 'Tech Executives',
            icon: IconTarget,
            description: 'Industry-specific leads',
            prompt: 'Identify Bay Area tech executives who frequently travel to Asia',
            action: () => setPromptInEditor('Identify Bay Area tech executives who frequently travel to Asia'),
        },
        {
            name: 'Event Travel',
            icon: IconUsers,
            description: 'Event-based opportunities',
            prompt: 'Which companies are sending large teams to CES Las Vegas?',
            action: () => setPromptInEditor('Which companies are sending large teams to CES Las Vegas?'),
        },
    ];

    // Analytics & Insights
    const analyticsActions = [
        {
            name: 'ROI Analysis',
            icon: IconChartBar,
            description: 'Campaign return metrics',
            prompt: 'Calculate the ROI of our Apollo.io campaigns versus traditional marketing',
            action: () => setPromptInEditor('Calculate the ROI of our Apollo.io campaigns versus traditional marketing'),
        },
        {
            name: 'Best Times',
            icon: IconTarget,
            description: 'Optimal engagement timing',
            prompt: 'When do executive assistants typically respond to charter inquiries?',
            action: () => setPromptInEditor('When do executive assistants typically respond to charter inquiries?'),
        },
        {
            name: 'Competitor Analysis',
            icon: IconChartBar,
            description: 'Market comparison',
            prompt: 'How do our charter rates compare to NetJets and Flexjet?',
            action: () => setPromptInEditor('How do our charter rates compare to NetJets and Flexjet?'),
        },
        {
            name: 'Revenue Forecast',
            icon: IconTrendingUp,
            description: 'Predictive analytics',
            prompt: 'Forecast Q4 charter revenue based on current Apollo.io pipeline',
            action: () => setPromptInEditor('Forecast Q4 charter revenue based on current Apollo.io pipeline'),
        },
    ];

    return (
        <CommandDialog open={isCommandSearchOpen} onOpenChange={setIsCommandSearchOpen}>
            <div className="flex w-full flex-row items-center gap-2 p-0.5">
                <CommandInput placeholder="Search..." className="w-full" />
                <div className="flex shrink-0 items-center gap-1 px-2">
                    <Kbd className="h-5 w-5">
                        <IconCommand size={12} strokeWidth={2} className="shrink-0" />
                    </Kbd>
                    <Kbd className="h-5 w-5">K</Kbd>
                </div>
            </div>
            <div className="w-full">
                <div className="border-border h-[1px] w-full border-b" />
            </div>
            <CommandList className="max-h-[420px] overflow-y-auto p-0.5 pt-1.5">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="General">
                    {actions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-muted-foreground flex-shrink-0"
                            />
                            {action.name}
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Jet Charter Operations">
                    {jetCharterActions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-2"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-brand flex-shrink-0"
                            />
                            <div className="flex flex-col">
                                <span>{action.name}</span>
                                <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Apollo Campaigns">
                    {apolloCampaignActions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-2"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-purple-600 flex-shrink-0"
                            />
                            <div className="flex flex-col">
                                <span>{action.name}</span>
                                <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Travel Planning">
                    {travelPlanningActions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-2"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-orange-600 flex-shrink-0"
                            />
                            <div className="flex flex-col">
                                <span>{action.name}</span>
                                <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Lead Generation">
                    {leadGenerationActions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-2"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-blue-600 flex-shrink-0"
                            />
                            <div className="flex flex-col">
                                <span>{action.name}</span>
                                <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Analytics & Insights">
                    {analyticsActions.map(action => (
                        <CommandItem
                            key={action.name}
                            className="gap-2"
                            value={action.name}
                            onSelect={action.action}
                        >
                            <action.icon
                                size={14}
                                strokeWidth="2"
                                className="text-green-600 flex-shrink-0"
                            />
                            <div className="flex flex-col">
                                <span>{action.name}</span>
                                <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
                {Object.entries(groupedThreads).map(
                    ([key, threads]) =>
                        threads.length > 0 && (
                            <CommandGroup
                                key={key}
                                heading={groupsNames[key as keyof typeof groupsNames]}
                            >
                                {threads.map(thread => (
                                    <CommandItem
                                        key={thread.id}
                                        value={`${thread.id}/${thread.title}`}
                                        className={cn('w-full gap-3')}
                                        onSelect={() => {
                                            switchThread(thread.id);
                                            router.push(`/chat/${thread.id}`);
                                            onClose();
                                        }}
                                    >
                                        <IconMessageCircleFilled
                                            size={16}
                                            strokeWidth={2}
                                            className="text-muted-foreground/50"
                                        />
                                        <span className="w-full truncate font-normal">
                                            {thread.title}
                                        </span>
                                        {/* <span className="text-muted-foreground flex-shrink-0 pl-4 text-xs !font-normal">
                                            {moment(thread.createdAt).fromNow(true)}
                                        </span> */}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )
                )}
            </CommandList>
        </CommandDialog>
    );
};
