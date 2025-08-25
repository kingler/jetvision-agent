'use client';

import { PromptCards, JetVisionFooterButton } from '@repo/common/components/jetvision';
import { useChatStore } from '@repo/common/store';
import { IconPlane, IconSparkles } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

const ChatPage = () => {
    const [showCards, setShowCards] = useState(true);
    const editor = useChatStore(state => state.editor);
    const threadItems = useChatStore(state => state.threadItems);
    const { user } = useUser();
    
    // Get appropriate greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };
    
    // Hide cards when there are messages in the thread
    useEffect(() => {
        if (threadItems && threadItems.length > 0) {
            setShowCards(false);
        }
    }, [threadItems]);

    const handlePromptSelect = (prompt: string) => {
        if (editor) {
            // Clear existing content
            editor.commands.clearContent();
            // Set the new prompt
            editor.commands.insertContent(prompt);
            // Hide cards
            setShowCards(false);
            
            // Focus the editor
            setTimeout(() => {
                editor.commands.focus('end');
            }, 100);
        }
    };

    return (
        <>
            {/* JetVision Welcome Section */}
            <AnimatePresence>
                {showCards && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex-1 overflow-y-auto px-4 pb-20 pt-16"
                    >
                        <div className="mx-auto max-w-4xl">
                            {/* Personalized Greeting */}
                            <div className="mb-4 text-center">
                                <h2 className="text-2xl font-medium text-muted-foreground">
                                    {getGreeting()}
                                    {user?.firstName && (
                                        <span className="text-foreground font-semibold"> {user.firstName}</span>
                                    )}
                                </h2>
                            </div>
                            
                            {/* JetVision Header */}
                            <div className="mb-8 text-center">
                                <div className="mb-4 flex items-center justify-center gap-3">
                                    <IconPlane size={32} className="text-brand" />
                                    <h1 className="text-3xl font-bold text-foreground">
                                        JetVision Agent
                                    </h1>
                                    <IconPlane size={32} className="text-brand scale-x-[-1]" />
                                </div>
                                <p className="text-lg text-muted-foreground">
                                    Powered by Apollo.io & Avinode Intelligence
                                </p>
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
                                        Lead Generation
                                    </span>
                                    <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                                        Fleet Management
                                    </span>
                                    <span className="rounded-full bg-green-600/10 px-3 py-1 text-sm font-medium text-green-600">
                                        n8n Automation
                                    </span>
                                </div>
                            </div>

                            {/* Welcome Message */}
                            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
                                <div className="mb-2 flex items-center justify-center gap-2">
                                    <IconSparkles size={20} className="text-brand" />
                                    <h2 className="text-xl font-semibold text-foreground">
                                        How can I assist you today?
                                    </h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Select a prompt below or type your own query about Apollo.io campaigns, 
                                    Avinode operations, or system integrations.
                                </p>
                            </div>

                            {/* Prompt Cards */}
                            <PromptCards onSelectPrompt={handlePromptSelect} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* JetVision Footer Button - Always visible at bottom */}
            <div className="absolute bottom-0 z-10 flex w-full flex-col">
                <JetVisionFooterButton />
            </div>
        </>
    );
};

export default ChatPage;