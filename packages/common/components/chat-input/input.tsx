'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import {
    ImageAttachment,
    ImageDropzoneRoot,
} from '@repo/common/components';
import { useImageAttachment } from '@repo/common/hooks';
import { ChatModeConfig } from '@repo/shared/config';
import { cn, Flex } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStream } from '../../hooks/agent-provider';
import { useChatEditor } from '../../hooks/use-editor';
import { useChatStore } from '../../store';
import { detectIntent } from '../../utils/intent-detection';
import { ExamplePrompts } from '../exmaple-prompts';
// import { ChatFooter } from '../chat-footer'; // Removed JetVision footer
import { ChatModeButton, GeneratingStatus, SendStopButton, WebSearchButton } from './chat-actions';
import { ChatEditor } from './chat-editor';
import { ImageUpload } from './image-upload';

// Scroll utility function
const scrollToChatInput = (element: HTMLElement) => {
    if (!element) return;

    // Calculate optimal scroll position (not at the very top)
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle = absoluteElementTop - (window.innerHeight / 3); // Position at 1/3 from top

    window.scrollTo({
        top: Math.max(0, middle),
        behavior: 'smooth'
    });
};

// Export interface for ref
export interface ChatInputRef {
    scrollIntoView: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, {
    showGreeting?: boolean;
    showBottomBar?: boolean;
    isFollowUp?: boolean;
}>(({
    showGreeting = true,
    showBottomBar = true,
    isFollowUp = false,
}, ref) => {
    const { isSignedIn } = useAuth();
    const chatInputRef = useRef<HTMLDivElement>(null);

    // Expose scroll method via ref
    useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (chatInputRef.current) {
                scrollToChatInput(chatInputRef.current);
            }
        }
    }));

    const { threadId: currentThreadId } = useParams();
    const { editor, isInitialized } = useChatEditor({
        placeholder: isFollowUp ? 'Ask a follow-up question about your flight' : 'Ask about executive travel, jet charter, or Apollo.io campaigns',
        onInit: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp && !isSignedIn) {
                // Clear the draft on page reload to prevent stale content
                const draftMessage = window.localStorage.getItem('draft-message');
                // Only load draft if it's not the placeholder text
                if (draftMessage && 
                    draftMessage !== 'Ask about executive travel, jet charter, or Apollo.io campaigns' &&
                    draftMessage !== 'Ask a follow-up question about your flight') {
                    editor.commands.setContent(draftMessage);
                } else {
                    // Clear any stale draft
                    window.localStorage.removeItem('draft-message');
                }
            }
        },
        onUpdate: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp) {
                const text = editor.getText();
                // Only save to localStorage if it's actual user content
                if (text && 
                    text !== 'Ask about executive travel, jet charter, or Apollo.io campaigns' &&
                    text !== 'Ask a follow-up question about your flight') {
                    window.localStorage.setItem('draft-message', text);
                } else {
                    // Remove draft if it's empty or placeholder
                    window.localStorage.removeItem('draft-message');
                }
            }
        },
    });
    const size = currentThreadId ? 'base' : 'sm';
    const getThreadItems = useChatStore(state => state.getThreadItems);
    const threadItemsLength = useChatStore(useShallow(state => state.threadItems.length));
    const { handleSubmit } = useAgentStream();
    const createThread = useChatStore(state => state.createThread);
    const createThreadItem = useChatStore(state => state.createThreadItem);
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const isGenerating = useChatStore(state => state.isGenerating);
    const setIsGenerating = useChatStore(state => state.setIsGenerating);
    const isChatPage = usePathname().startsWith('/chat');
    const imageAttachment = useChatStore(state => state.imageAttachment);
    const clearImageAttachment = useChatStore(state => state.clearImageAttachment);
    const stopGeneration = useChatStore(state => state.stopGeneration);
    
    const hasTextInput = !!editor?.getText();
    
    const { dropzonProps, handleImageUpload } = useImageAttachment();
    const { push } = useRouter();
    const chatMode = useChatStore(state => state.chatMode);
    const sendMessage = async (customPrompt?: string, parameters?: Record<string, any>) => {
        console.log('[SendMessage] Starting - isSignedIn:', isSignedIn, 'chatMode:', chatMode);
        
        // Get the current text from the editor
        const currentText = editor?.getText()?.trim();
        console.log('[SendMessage] Current editor text:', currentText, 'Custom prompt:', customPrompt);
        
        if (
            !isSignedIn &&
            !!ChatModeConfig[chatMode as keyof typeof ChatModeConfig]?.isAuthRequired
        ) {
            console.log('[SendMessage] Redirecting to sign-in');
            push('/sign-in');
            return;
        }
        
        if (!currentText && !customPrompt) {
            console.log('[SendMessage] No text to send - aborting');
            return;
        }
        
        console.log('[SendMessage] Setting isGenerating to true');
        // Show immediate loading feedback
        setIsGenerating(true);
        
        // Create optimistic UI update for immediate feedback
        const optimisticItemId = uuidv4();

        let threadId = currentThreadId?.toString();

        if (!threadId) {
            const optimisticId = uuidv4();
            push(`/chat/${optimisticId}`);
            createThread(optimisticId, {
                title: editor?.getText(),
            });
            threadId = optimisticId;
        }

        // Get the message text
        const messageText = customPrompt || currentText;
        
        // Create optimistic thread item for immediate visual feedback
        const optimisticThreadItem = {
            id: optimisticItemId,
            threadId: threadId,
            query: messageText,
            status: 'PENDING' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            mode: 'jetvision-agent' as any,
            answer: undefined,
            sources: [],
        };
        
        createThreadItem(optimisticThreadItem);
        
        // Clear input immediately for better UX
        window.localStorage.removeItem('draft-message');
        if (editor && editor.commands) {
            editor.commands.clearContent();
        }
        clearImageAttachment();
        
        // Smooth scroll to bottom after a brief delay to allow DOM update
        setTimeout(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
        
        // Retrieve stored parameters if not provided directly
        let promptParams = parameters;
        if (!promptParams) {
            const storedParams = sessionStorage.getItem('promptParameters');
            if (storedParams) {
                promptParams = JSON.parse(storedParams);
                sessionStorage.removeItem('promptParameters'); // Clean up after use
            }
        }
        
        // Create structured JSON payload for n8n webhook
        const jsonPayload = {
            prompt: messageText,
            message: messageText,
            threadId: threadId,
            threadItemId: optimisticItemId,
            context: {
                source: 'jetvision-agent',
                timestamp: new Date().toISOString(),
                useWebSearch: useWebSearch,
                hasImageAttachment: !!imageAttachment?.base64,
                parameters: promptParams || {},
            },
            intent: detectIntent(messageText),
            expectedOutput: {
                format: 'structured',
                includeVisualization: messageText.toLowerCase().includes('chart') || messageText.toLowerCase().includes('graph'),
                includeRecommendations: true
            }
        };
        
        // Log the structured payload for debugging
        console.log('Sending structured JSON to n8n:', jsonPayload);
        
        // Create FormData with the structured JSON
        const formData = new FormData();
        formData.append('query', JSON.stringify(jsonPayload));
        imageAttachment?.base64 && formData.append('imageAttachment', imageAttachment?.base64);
        const threadItems = currentThreadId ? await getThreadItems(currentThreadId.toString()) : [];

        handleSubmit({
            formData,
            newThreadId: threadId,
            messages: threadItems.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
            useWebSearch,
            useN8n: true, // Force n8n webhook usage
        });
    };

    const renderChatInput = () => (
        <AnimatePresence>
            <motion.div
                ref={chatInputRef}
                data-chat-input="true"
                className="w-full px-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`chat-input`}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                <Flex
                    direction="col"
                    className={cn(
                        'bg-background border-hard/50 shadow-subtle-sm relative z-10 w-full rounded-xl border'
                    )}
                >
                    <ImageDropzoneRoot dropzoneProps={dropzonProps}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="flex w-full flex-shrink-0 overflow-hidden rounded-lg"
                        >
                            {(editor?.isEditable && isInitialized) || (!editor && !isInitialized) ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="w-full"
                                >
                                    <ImageAttachment />
                                    <Flex className="flex w-full flex-row items-end gap-0">
                                        <ChatEditor
                                            sendMessage={() => sendMessage()}
                                            editor={editor}
                                            isInitialized={isInitialized}
                                            className="px-3 pt-3"
                                        />
                                    </Flex>

                                    <Flex
                                        className="border-border w-full gap-0 border-t border-dashed px-2 py-2"
                                        gap="none"
                                        items="center"
                                        justify="between"
                                    >
                                        {isGenerating && !isChatPage ? (
                                            <GeneratingStatus />
                                        ) : (
                                            <Flex gap="xs" items="center" className="shrink-0">
                                                {/* Model selection removed - using n8n LangChain Agent */}
                                                {/* <ChatModeButton /> */}
                                                {/* <AttachmentButton /> */}
                                                <WebSearchButton />
                                                {/* <ToolsMenu /> */}
                                                <ImageUpload
                                                    id="image-attachment"
                                                    label="Image"
                                                    tooltip="Image Attachment"
                                                    showIcon={true}
                                                    handleImageUpload={handleImageUpload}
                                                />
                                            </Flex>
                                        )}

                                        <Flex gap="md" items="center">
                                            <SendStopButton
                                                isGenerating={isGenerating}
                                                isChatPage={isChatPage}
                                                stopGeneration={stopGeneration}
                                                hasTextInput={hasTextInput}
                                                sendMessage={sendMessage}
                                            />
                                        </Flex>
                                    </Flex>
                                </motion.div>
                            ) : (
                                <motion.div
                                    className="flex h-24 w-full items-center justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="animate-pulse">Loading editor...</div>
                                </motion.div>
                            )}
                        </motion.div>
                    </ImageDropzoneRoot>
                </Flex>
            </motion.div>
        </AnimatePresence>
    );

    const renderChatBottom = () => (
        <>
            <Flex items="center" justify="center" gap="sm">
                {/* <ScrollToBottomButton /> */}
            </Flex>
            {renderChatInput()}
        </>
    );

    useEffect(() => {
        editor?.commands.focus('end');
    }, [currentThreadId]);

    return (
        <>
            <div
                className={cn(
                    'w-full',
                    currentThreadId
                        ? 'sticky bottom-0 z-10 bg-secondary border-t border-border'
                        : 'flex flex-col h-full overflow-y-auto'
                )}
            >
                {!currentThreadId ? (
                    <div className="flex flex-col min-h-full">
                        {/* Centered Chat Section */}
                        <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
                            <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-8">
                                <Flex
                                    items="start"
                                    justify="start"
                                    direction="col"
                                    className="w-full pb-4"
                                >
                                    {showGreeting && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                            className="mb-4 flex w-full flex-col items-center gap-1"
                                        >
                                            <AnimatedTitles />
                                        </motion.div>
                                    )}

                                    {renderChatInput()}
                                </Flex>
                            </div>
                        </div>
                        
                        {/* Scrollable Prompts Section */}
                        {showGreeting && (
                            <div className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-8 pb-20">
                                <div className="max-w-6xl mx-auto px-8">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                            Quick Start Prompts
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Select a prompt to get started or type your own question
                                        </p>
                                    </div>
                                    <ExamplePrompts />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Thread view - chat input at bottom
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-4">
                        {renderChatInput()}
                    </div>
                )}
            </div>
            {/* {!currentThreadId && <ChatFooter />} // Removed JetVision footer */}
        </>
    );
});

ChatInput.displayName = 'ChatInput';


type AnimatedTitlesProps = {
    titles?: string[];
};

const AnimatedTitles = ({ }: AnimatedTitlesProps) => {
    const [greeting, setGreeting] = React.useState<string>('');
    const { user, isLoaded } = useUser();

    React.useEffect(() => {
        const getTimeBasedGreeting = () => {
            const hour = new Date().getHours();
            let baseGreeting = '';

            if (hour >= 5 && hour < 12) {
                baseGreeting = 'JetVision Agent\nGood morning';
            } else if (hour >= 12 && hour < 18) {
                baseGreeting = 'JetVision Agent\nGood afternoon';
            } else {
                baseGreeting = 'JetVision Agent\nGood evening';
            }

            // Add user's name to the greeting
            if (isLoaded && user?.firstName) {
                return `${baseGreeting} ${user.firstName}!`;
            } else {
                // Default to "Kham Lam" for testing purposes as requested
                return `${baseGreeting} Kham Lam!`;
            }
        };

        setGreeting(getTimeBasedGreeting());

        // Update the greeting if the component is mounted during a time transition
        const interval = setInterval(() => {
            const newGreeting = getTimeBasedGreeting();
            if (newGreeting !== greeting) {
                setGreeting(newGreeting);
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [greeting, user, isLoaded]);

    return (
        <Flex
            direction="col"
            className="relative h-[100px] w-full items-center justify-center overflow-hidden"
        >
            <AnimatePresence mode="wait">
                <motion.h1
                    key={greeting}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeInOut',
                    }}
                    className="from-muted-foreground/50 via-muted-foreground/40 to-muted-foreground/20 bg-gradient-to-r bg-clip-text text-center text-[32px] font-semibold tracking-tight text-transparent whitespace-pre-line"
                >
                    {greeting}
                </motion.h1>
            </AnimatePresence>
        </Flex>
    );
};
