'use client';
import { ExamplePrompts } from '@repo/common/components';
import { motion } from 'framer-motion';

const ChatPage = () => {
    return (
        <div className="flex w-full flex-1 flex-col items-center overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
                {/* Welcome Message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 text-center"
                >
                    <h1 className="text-3xl font-bold mb-2">Welcome to JetVision Agent</h1>
                    <p className="text-muted-foreground">
                        Your AI-powered assistant for Apollo.io campaigns and Avinode operations
                    </p>
                </motion.div>

                {/* The ChatInput is rendered by the layout.tsx file */}
                {/* Just need to ensure the prompts section shows */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Quick Start Prompts</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Select a prompt to get started or type your own question
                    </p>
                    <ExamplePrompts />
                </div>
            </div>
        </div>
    );
};

export default ChatPage;