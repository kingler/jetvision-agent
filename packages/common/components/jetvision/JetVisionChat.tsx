'use client';
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@repo/ui';
import { useChatEditor, useAgentStream } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ChatEditor } from '../chat-input/chat-editor';
import { PromptCards } from './PromptCards';
import { Thread, TableOfMessages } from '@repo/common/components';
import { IconSend, IconLoader2, IconSparkles, IconPlane, IconCommand } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@repo/ui';
import { scrollToChatInputWithFocus } from '@repo/common/utils';
import { useParams, useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';

interface JetVisionChatProps {
    className?: string;
    sessionId?: string;
    userId?: string;
}

export const JetVisionChat: React.FC<JetVisionChatProps> = ({ className, sessionId, userId }) => {
    const [prompt, setPrompt] = useState('');
    const [showCards, setShowCards] = useState(true);
    const router = useRouter();
    const { threadId } = useParams();
    const currentThreadId = threadId?.toString() ?? '';

    // Use main chat store and agent stream
    const { handleSubmit: handleAgentSubmit } = useAgentStream();
    const {
        isGenerating,
        switchThread,
        createThread,
        editor: storeEditor,
        setEditor,
    } = useChatStore(
        useShallow(state => ({
            isGenerating: state.isGenerating,
            switchThread: state.switchThread,
            createThread: state.createThread,
            editor: state.editor,
            setEditor: state.setEditor,
        }))
    );

    const { editor } = useChatEditor({
        placeholder: 'Ask about Apollo.io campaigns, Avinode availability, or system operations...',
        onInit: ({ editor }) => {
            // Set editor in store for integration with main chat system
            setEditor(editor);
        },
        onUpdate: ({ editor }) => {
            setPrompt(editor.getText());
            // Hide cards when user starts typing
            if (editor.getText().length > 0 && showCards) {
                setShowCards(false);
            }
        },
    });

    // Handle prompt selection from cards with enhanced parameters support
    const handlePromptSelect = (
        displayPrompt: string,
        fullPrompt: string,
        parameters?: Record<string, any>
    ) => {
        if (editor) {
            // Clear existing content
            editor.commands.clearContent();
            // Use the clean display prompt for user interface
            editor.commands.insertContent(displayPrompt);
            setPrompt(displayPrompt);
            setShowCards(false);

            // Store the full prompt and parameters for processing
            if (parameters) {
                // Store parameters in session storage for n8n processing
                sessionStorage.setItem('promptParameters', JSON.stringify(parameters));
            }
            // Store the full prompt for backend processing
            sessionStorage.setItem('fullPrompt', fullPrompt);

            // Focus the editor with animation and scroll to chat input
            setTimeout(() => {
                editor.commands.focus('end');
                // Trigger smooth scroll to chat input
                scrollToChatInputWithFocus(200);
            }, 100);
        }
    };

    // Handle form submission using main chat system
    const handleSubmit = async () => {
        if (!prompt.trim() || isGenerating) return;

        try {
            // Create or switch to thread if needed
            let activeThreadId = currentThreadId;
            if (!activeThreadId) {
                const newThread = await createThread(nanoid());
                activeThreadId = newThread.id;
                // Navigate to the new thread
                router.push(`/chat/${activeThreadId}`);
            }

            // Prepare form data for agent stream
            const formData = new FormData();
            formData.append('query', prompt.trim());

            // Add parameters from session storage if available
            const storedParameters = sessionStorage.getItem('promptParameters');
            if (storedParameters) {
                formData.append('parameters', storedParameters);
                // Clear parameters after use
                sessionStorage.removeItem('promptParameters');
            }

            // Submit using main agent stream handler
            await handleAgentSubmit({
                formData,
                useWebSearch: false, // JetVision uses n8n, not web search
            });

            // Clear the input and hide cards
            if (editor) {
                editor.commands.clearContent();
                setPrompt('');
            }
            setShowCards(false);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An unexpected error occurred';
            toast({
                title: 'Connection Error',
                description: errorMessage,
                variant: 'destructive',
            });
        }
    };

    // Check if we have an active thread with messages
    const hasActiveThread = currentThreadId && currentThreadId.length > 0;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Submit on Cmd/Ctrl + Enter
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
            // Show/hide cards on Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowCards(!showCards);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prompt, showCards]);

    return (
        <div className={cn('relative flex h-full w-full flex-col', className)}>
            {/* Header */}
            <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <IconPlane size={24} className="text-brand" />
                            <h1 className="text-foreground text-xl font-semibold">
                                JetVision Agent
                            </h1>
                        </div>
                        <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs font-medium">
                            Apollo.io + Avinode
                        </span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <kbd className="border-border bg-secondary rounded border px-1.5 py-0.5 font-mono">
                            ⌘K
                        </kbd>
                        <span>Show prompts</span>
                        <span className="mx-2">•</span>
                        <kbd className="border-border bg-secondary rounded border px-1.5 py-0.5 font-mono">
                            ⌘↵
                        </kbd>
                        <span>Submit</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-6">
                    {/* Show prompt cards when no active thread */}
                    {!hasActiveThread && (
                        <>
                            {/* Welcome Message */}
                            <AnimatePresence>
                                {showCards && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="mb-8 text-center"
                                    >
                                        <div className="mb-2 flex items-center justify-center gap-2">
                                            <IconSparkles size={20} className="text-brand" />
                                            <h2 className="text-foreground text-lg font-medium">
                                                How can JetVision Agent assist you today?
                                            </h2>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Select a prompt card or type your own query about
                                            Apollo.io campaigns or Avinode operations
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Prompt Cards */}
                            <AnimatePresence>
                                {showCards && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <PromptCards onSelectPrompt={handlePromptSelect} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}

                    {/* Show Thread when we have an active conversation */}
                    {hasActiveThread && (
                        <div className="w-full">
                            <Thread />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div
                className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur"
                data-chat-input="true"
            >
                <div className="mx-auto max-w-4xl p-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <div className="border-border bg-background focus-within:border-brand/50 rounded-lg border shadow-sm transition-all focus-within:shadow-md">
                                <ChatEditor
                                    editor={editor}
                                    sendMessage={handleSubmit}
                                    className="px-4 py-3"
                                />
                                {prompt.length > 0 && (
                                    <div className="text-muted-foreground absolute bottom-2 right-2 text-xs">
                                        {prompt.length} characters
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isGenerating}
                            className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-lg transition-all',
                                'bg-brand text-brand-foreground hover:bg-brand/90',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                isGenerating && 'animate-pulse'
                            )}
                        >
                            {isGenerating ? (
                                <IconLoader2 size={20} className="animate-spin" />
                            ) : (
                                <IconSend size={20} />
                            )}
                        </button>
                    </div>
                    {!showCards && !hasActiveThread && (
                        <button
                            onClick={() => setShowCards(true)}
                            className="text-muted-foreground hover:text-brand mt-2 flex items-center gap-1 text-xs"
                        >
                            <IconCommand size={12} />
                            <span>Show prompt suggestions</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table of Messages for navigation */}
            {hasActiveThread && <TableOfMessages />}
        </div>
    );
};
