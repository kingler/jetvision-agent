'use client';

import React from 'react';
import { ChatInput } from '@repo/common/components/chat-input/input';
import { PromptCards } from '@repo/common/components/jetvision/PromptCards';
import { scrollToChatInputWithFocus } from '@repo/common/utils';

export default function TestScrollPage() {
    const handlePromptSelect = (prompt: string) => {
        console.log('Selected prompt:', prompt);
        // Simulate the prompt being inserted into the chat input
        // In a real scenario, this would be handled by the editor
        
        // Trigger the scroll behavior
        scrollToChatInputWithFocus(300);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b p-4">
                <h1 className="text-2xl font-bold">Scroll Functionality Test</h1>
                <p className="text-muted-foreground">
                    Click on any prompt card below to test the smooth scroll to chat input functionality.
                </p>
            </div>

            {/* Content with lots of space to demonstrate scrolling */}
            <div className="space-y-8 p-6">
                {/* Prompt Cards Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Prompt Cards</h2>
                    <p className="text-muted-foreground">
                        These cards should trigger smooth scrolling to the chat input when clicked.
                    </p>
                    <PromptCards onSelectPrompt={handlePromptSelect} />
                </div>

                {/* Spacer to create scroll distance */}
                <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Spacer content to create scroll distance</p>
                </div>

                {/* Another spacer */}
                <div className="h-96 bg-muted/10 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">More spacer content</p>
                </div>

                {/* Chat Input Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Chat Input (Scroll Target)</h2>
                    <p className="text-muted-foreground">
                        This is the target that should come into view when a prompt card is clicked.
                    </p>
                    <ChatInput showGreeting={false} />
                </div>

                {/* Bottom spacer */}
                <div className="h-96 bg-muted/5 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Bottom spacer content</p>
                </div>
            </div>
        </div>
    );
}
