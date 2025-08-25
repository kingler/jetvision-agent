import { useChatStore } from '@repo/common/store';
import { Button } from '@repo/ui';
import {
    IconBook,
    IconBulb,
    IconChartBar,
    IconPencil,
    IconQuestionMark,
    IconPlane,
    IconRocket,
    IconMapPin,
    IconUsers,
    IconTrendingUp,
} from '@tabler/icons-react';
import { Editor } from '@tiptap/react';

export const examplePrompts = {
    jetCharter: [
        'What type of private jet is best for a New York to London flight?',
        'Compare light jets vs midsize jets for a 4-person business trip',
        'What are empty leg flights and how can I save money with them?',
        'How far in advance should I book a private jet charter?',
    ],

    apolloCampaigns: [
        'Find executive assistants at Fortune 500 companies in California',
        'Show me my campaign conversion rates for this week',
        'Launch a campaign targeting private equity firms for year-end travel',
        'What is my cost per lead for luxury travel prospects?',
    ],

    travelPlanning: [
        'Plan a multi-city executive trip: NYC → London → Dubai → Singapore',
        'What are the best private terminals at major US airports?',
        'Arrange ground transportation and concierge services in Miami',
        'Schedule a jet for the Cannes Film Festival with 8 passengers',
    ],

    leadGeneration: [
        'Find companies that recently raised Series B funding',
        'Identify executive assistants who changed jobs in the last 30 days',
        'Which prospects visited our pricing page multiple times?',
        'Show me high-value leads in the entertainment industry',
    ],

    analytics: [
        'Analyze response rates by industry for jet charter campaigns',
        'Compare ROI between email sequences and LinkedIn outreach',
        'What time do executive assistants typically open our emails?',
        'Show seasonal trends in private jet demand by region',
    ],
};

export const getRandomPrompt = (category?: keyof typeof examplePrompts) => {
    if (category && examplePrompts[category]) {
        const prompts = examplePrompts[category];
        return prompts[Math.floor(Math.random() * prompts.length)];
    }

    // If no category specified or invalid category, return a random prompt from any category
    const categories = Object.keys(examplePrompts) as Array<keyof typeof examplePrompts>;
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const prompts = examplePrompts[randomCategory];
    return prompts[Math.floor(Math.random() * prompts.length)];
};

// Map of category to icon component - JetVision themed
const categoryIcons = {
    jetCharter: { name: 'Jet Charter', icon: IconPlane, color: '!text-brand' },
    apolloCampaigns: { name: 'Apollo Campaigns', icon: IconRocket, color: '!text-accent' },
    travelPlanning: { name: 'Travel Planning', icon: IconMapPin, color: '!text-blue-700' },
    leadGeneration: { name: 'Lead Generation', icon: IconUsers, color: '!text-green-700' },
    analytics: { name: 'Analytics', icon: IconTrendingUp, color: '!text-purple-700' },
};

export const ExamplePrompts = () => {
    const editor: Editor | undefined = useChatStore(state => state.editor);
    const handleCategoryClick = (category: keyof typeof examplePrompts) => {
        console.log('editor', editor);
        if (!editor) return;
        const randomPrompt = getRandomPrompt(category);
        editor.commands.clearContent();
        editor.commands.insertContent(randomPrompt);
    };

    if (!editor) return null;

    return (
        <div className="animate-fade-in mb-8 flex w-full flex-wrap justify-center gap-2 p-6 duration-[1000ms]">
            {Object.entries(categoryIcons).map(([category, value], index) => (
                <Button
                    key={index}
                    variant="bordered"
                    rounded="full"
                    size="sm"
                    onClick={() => handleCategoryClick(category as keyof typeof examplePrompts)}
                >
                    <value.icon size={16} className={'text-muted-foreground/50'} />
                    {value.name}
                </Button>
            ))}
        </div>
    );
};
