'use client';
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@repo/ui';
import { useChatEditor } from '@repo/common/hooks';
import { ChatEditor } from '../chat-input/chat-editor';
import { PromptCards } from './PromptCards';
import { SearchResultsPanel, SearchResult } from './SearchResultsPanel';
import { n8nWebhook, N8nWebhookRequest } from '../../services/n8n-webhook.service';
import { 
    IconSend, 
    IconLoader2, 
    IconSparkles,
    IconPlane,
    IconCommand
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@repo/ui';

interface JetVisionChatProps {
    className?: string;
    sessionId?: string;
    userId?: string;
}

export const JetVisionChat: React.FC<JetVisionChatProps> = ({ 
    className,
    sessionId,
    userId 
}) => {
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showCards, setShowCards] = useState(true);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { editor } = useChatEditor({
        placeholder: 'Ask about Apollo.io campaigns, Avinode availability, or system operations...',
        onUpdate: ({ editor }) => {
            setPrompt(editor.getText());
            // Hide cards when user starts typing
            if (editor.getText().length > 0 && showCards) {
                setShowCards(false);
            }
        },
    });

    // Handle prompt selection from cards
    const handlePromptSelect = (selectedPrompt: string) => {
        if (editor) {
            // Clear existing content
            editor.commands.clearContent();
            // Set the new prompt
            editor.commands.insertContent(selectedPrompt);
            setPrompt(selectedPrompt);
            setShowCards(false);
            
            // Focus the editor with animation
            setTimeout(() => {
                editor.commands.focus('end');
                // Add visual feedback
                const editorElement = document.querySelector('.ProseMirror');
                if (editorElement) {
                    editorElement.classList.add('animate-pulse');
                    setTimeout(() => {
                        editorElement.classList.remove('animate-pulse');
                    }, 500);
                }
            }, 100);
        }
    };

    // Submit prompt to n8n webhook
    const handleSubmit = async () => {
        if (!prompt.trim() || isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setShowResults(true);

        const request: N8nWebhookRequest = {
            prompt: prompt.trim(),
            context: {
                userId,
                sessionId,
                timestamp: new Date().toISOString(),
                source: detectSource(prompt),
            },
        };

        try {
            const response = await n8nWebhook.sendPrompt(request);

            if (response.success) {
                const results = n8nWebhook.transformToSearchResults(response.data);
                setSearchResults(results);
                
                // Show success toast
                toast({
                    title: "Query Processed",
                    description: `Found ${results.length} results from ${request.context?.source || 'JetVision'} system`,
                });
            } else {
                setError(response.error || 'Failed to process request');
                toast({
                    title: "Error",
                    description: response.error || 'Failed to process request',
                    variant: "destructive",
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            toast({
                title: "Connection Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Detect source based on prompt content
    const detectSource = (text: string): 'apollo' | 'avinode' | 'integration' => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('apollo') || lowerText.includes('campaign') || lowerText.includes('lead') || lowerText.includes('executive')) {
            return 'apollo';
        }
        if (lowerText.includes('avinode') || lowerText.includes('aircraft') || lowerText.includes('fleet') || lowerText.includes('flight')) {
            return 'avinode';
        }
        return 'integration';
    };

    // Handle result selection
    const handleResultSelect = (result: SearchResult) => {
        // You can implement detailed view or action based on result type
        console.log('Selected result:', result);
        toast({
            title: "Result Selected",
            description: `Viewing details for ${result.title}`,
        });
    };

    // Refresh results
    const handleRefresh = () => {
        if (prompt.trim()) {
            handleSubmit();
        }
    };

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
        <div className={cn("relative flex h-full w-full flex-col", className)}>
            {/* Header */}
            <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <IconPlane size={24} className="text-brand" />
                            <h1 className="text-xl font-semibold text-foreground">JetVision Agent</h1>
                        </div>
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                            Apollo.io + Avinode
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">⌘K</kbd>
                        <span>Show prompts</span>
                        <span className="mx-2">•</span>
                        <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">⌘↵</kbd>
                        <span>Submit</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-6">
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
                                    <h2 className="text-lg font-medium text-foreground">
                                        How can JetVision Agent assist you today?
                                    </h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Select a prompt card or type your own query about Apollo.io campaigns or Avinode operations
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
                </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto max-w-4xl p-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <div className="rounded-lg border border-border bg-background shadow-sm transition-all focus-within:border-brand/50 focus-within:shadow-md">
                                <ChatEditor
                                    editor={editor}
                                    sendMessage={handleSubmit}
                                    className="px-4 py-3"
                                />
                                {prompt.length > 0 && (
                                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                        {prompt.length} characters
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isProcessing}
                            className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-lg transition-all",
                                "bg-brand text-brand-foreground hover:bg-brand/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                isProcessing && "animate-pulse"
                            )}
                        >
                            {isProcessing ? (
                                <IconLoader2 size={20} className="animate-spin" />
                            ) : (
                                <IconSend size={20} />
                            )}
                        </button>
                    </div>
                    {!showCards && (
                        <button
                            onClick={() => setShowCards(true)}
                            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
                        >
                            <IconCommand size={12} />
                            <span>Show prompt suggestions</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Results Panel */}
            <SearchResultsPanel
                isOpen={showResults}
                onClose={() => setShowResults(false)}
                results={searchResults}
                loading={isProcessing}
                error={error || undefined}
                onRefresh={handleRefresh}
                onSelectResult={handleResultSelect}
            />
        </div>
    );
};