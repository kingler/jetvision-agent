'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { ImageAttachment, ImageDropzoneRoot } from '@repo/common/components';
import { useImageAttachment } from '@repo/common/hooks';
import { ChatModeConfig } from '@repo/shared/config';
import { cn, Flex } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
    useState,
    useCallback,
    useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStream } from '../../hooks/agent-provider';
import { useChatEditor } from '../../hooks/use-editor';
import { useChatStore } from '../../store';
import { detectIntent } from '../../utils/intent-detection';
import { debounce, deduplicate, batchStateUpdates } from '../../utils/debounce';
import { routeMessage, type RoutingDecision } from '../../utils/agent-router';
import { isAviationMessage } from '../../utils/aviation-classifier';
import { ExamplePrompts } from '../exmaple-prompts';
// import { ChatFooter } from '../chat-footer'; // Removed JetVision footer
// DISABLED: Model selection now handled by n8n workflow
// import { ChatModeButton, GeneratingStatus, SendStopButton, WebSearchButton } from './chat-actions';
import { GeneratingStatus, SendStopButton, WebSearchButton } from './chat-actions';
// import { PromptCardsButton, PromptCard } from '../prompt-cards'; // Temporarily disabled for build
import { ChatEditor } from './chat-editor';
import { ImageUpload } from './image-upload';

// Scroll utility function
const scrollToChatInput = (element: HTMLElement) => {
    if (!element) return;

    // Calculate optimal scroll position (not at the very top)
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle = absoluteElementTop - window.innerHeight / 3; // Position at 1/3 from top

    window.scrollTo({
        top: Math.max(0, middle),
        behavior: 'smooth',
    });
};

// Export interface for ref
export interface ChatInputRef {
    scrollIntoView: () => void;
}

export const ChatInput = forwardRef<
    ChatInputRef,
    {
        showGreeting?: boolean;
        showBottomBar?: boolean;
        isFollowUp?: boolean;
    }
>(({ showGreeting = true, showBottomBar = true, isFollowUp = false }, ref) => {
    const { isSignedIn } = useAuth();
    const chatInputRef = useRef<HTMLDivElement>(null);

    // Expose scroll method via ref
    useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (chatInputRef.current) {
                scrollToChatInput(chatInputRef.current);
            }
        },
    }));

    const { threadId: currentThreadId } = useParams();
    const { editor, isInitialized } = useChatEditor({
        placeholder: isFollowUp
            ? 'Ask a follow-up question about your flight'
            : 'Ask about executive travel, jet charter, or Apollo.io campaigns',
        onInit: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp && !isSignedIn) {
                // Clear the draft on page reload to prevent stale content
                const draftMessage = window.localStorage.getItem('draft-message');
                // Only load draft if it's not the placeholder text
                if (
                    draftMessage &&
                    draftMessage !==
                        'Ask about executive travel, jet charter, or Apollo.io campaigns' &&
                    draftMessage !== 'Ask a follow-up question about your flight'
                ) {
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
                if (
                    text &&
                    text !== 'Ask about executive travel, jet charter, or Apollo.io campaigns' &&
                    text !== 'Ask a follow-up question about your flight'
                ) {
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
    const threadItemsLength = useChatStore(useShallow(state => state?.threadItems?.length || 0));
    const getStoreState = useChatStore.getState;
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
    // DISABLED: Model selection now handled by n8n workflow - using default mode
    // const chatMode = useChatStore(state => state.chatMode);
    const chatMode = 'gpt-4o-mini'; // Default mode since n8n workflow handles model selection

    // Handle prompt selection from prompt cards
    // const handlePromptSelect = useCallback((prompt: PromptCard) => {
    //     if (editor && editor.commands) {
    //         editor.commands.setContent(prompt.prompt);
    //         editor.commands.focus('end');
    //     }
    // }, [editor]);

    // Add loading state for send button
    const [isSending, setIsSending] = useState(false);

    // Edit functionality state
    const [isEditingLast, setIsEditingLast] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Routing decision state
    const [lastRoutingDecision, setLastRoutingDecision] = useState<RoutingDecision | null>(null);

    // Create debounced and deduplicated sendMessage function
    const sendMessageCore = useCallback(
        async (customPrompt?: string, parameters?: Record<string, any>) => {
            const performanceStart = performance.now();
            console.log(
                '[SendMessage] Starting - isSignedIn:',
                isSignedIn,
                'chatMode:',
                chatMode,
                'timestamp:',
                new Date().toISOString()
            );

            // Prevent multiple concurrent sends
            if (isSending) {
                console.log('[SendMessage] Already sending, ignoring request');
                return;
            }

            // Get the current text from the editor
            const currentText = editor?.getText()?.trim();
            console.log(
                '[SendMessage] Current editor text:',
                currentText,
                'Custom prompt:',
                customPrompt
            );

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
            // Show immediate loading feedback with batched state updates
            batchStateUpdates([() => setIsGenerating(true), () => setIsSending(true)]);

            // Create optimistic UI update for immediate feedback
            const optimisticItemId = uuidv4();

            let threadId = currentThreadId?.toString();

            if (!threadId) {
                const optimisticId = uuidv4();
                push(`/chat/${optimisticId}`);
                createThread(optimisticId, {
                    title: editor?.getText() || 'New Thread',
                });
                threadId = optimisticId;
            }

            // Get the message text - ensure it's never undefined
            const messageText = customPrompt || currentText || '';

            // Get previous messages for context from the store state (avoid async call during render)
            const storeThreadItems = getStoreState().threadItems || [];
            const threadItems = currentThreadId
                ? storeThreadItems.filter(item => item.threadId === currentThreadId.toString())
                : [];
            const previousMessages = threadItems
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .slice(-5) // Last 5 messages
                .map(item => ({
                    role: 'user',
                    content: item.query,
                }));

            // Route the message using the routing system
            const routingDecision = routeMessage(messageText, chatMode, {
                threadId: threadId,
                previousMessages,
            });

            setLastRoutingDecision(routingDecision);

            console.log('[SendMessage] Routing decision:', {
                strategy: routingDecision.routingStrategy,
                useOpenAI: routingDecision.useOpenAI,
                useN8N: routingDecision.useN8N,
                reasoning: routingDecision.reasoning,
            });

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

            // Clear input immediately for better UX - batch these operations
            batchStateUpdates([
                () => {
                    window.localStorage.removeItem('draft-message');
                    if (editor && editor.commands) {
                        editor.commands.clearContent();
                    }
                    clearImageAttachment();
                },
            ]);

            // Smooth scroll to bottom after a brief delay to allow DOM update
            setTimeout(() => {
                window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: 'smooth',
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

            // Create structured JSON payload based on routing decision
            const jsonPayload = routingDecision.useN8N
                ? routingDecision.instructions.n8nPayload || {
                      prompt: messageText,
                      message: messageText,
                      threadId: threadId,
                      threadItemId: optimisticItemId,
                      context: {
                          source: 'openai-frontend-agent',
                          timestamp: new Date().toISOString(),
                          useWebSearch: useWebSearch,
                          hasImageAttachment: !!imageAttachment?.base64,
                          parameters: promptParams || {},
                          chatMode: chatMode,
                      },
                      routing: {
                          strategy: routingDecision.routingStrategy,
                          reasoning: routingDecision.reasoning,
                          aviationClassification: routingDecision.aviationContext?.classification,
                      },
                      intent: detectIntent(messageText),
                      expectedOutput: {
                          format: 'structured',
                          includeVisualization:
                              messageText.toLowerCase().includes('chart') ||
                              messageText.toLowerCase().includes('graph'),
                          includeRecommendations: true,
                      },
                  }
                : {
                      prompt: routingDecision.instructions.openaiPrompt || messageText,
                      message: messageText,
                      threadId: threadId,
                      threadItemId: optimisticItemId,
                      context: {
                          source: 'openai-direct',
                          timestamp: new Date().toISOString(),
                          useWebSearch: useWebSearch,
                          chatMode: chatMode,
                          routing: routingDecision,
                      },
                  };

            // Log the structured payload for debugging
            console.log('Sending structured JSON to n8n:', jsonPayload);

            // Create FormData with the structured JSON
            const formData = new FormData();
            formData.append('query', JSON.stringify(jsonPayload));
            imageAttachment?.base64 && formData.append('imageAttachment', imageAttachment?.base64);

            try {
                const submitStart = performance.now();
                console.log(
                    '[SendMessage] Submitting to handleSubmit - elapsed:',
                    (submitStart - performanceStart).toFixed(2) + 'ms'
                );

                await handleSubmit({
                    formData,
                    newThreadId: threadId,
                    existingThreadItemId: optimisticItemId, // Pass the same ID to prevent duplicates
                    messages: previousMessages.map((msg, index) => ({
                        id: `msg-${index}`,
                        threadId: threadId,
                        query: msg.content,
                        status: 'COMPLETED' as const,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        mode: chatMode as any,
                        answer: undefined,
                        sources: [],
                    })),
                    useWebSearch,
                    useN8n: routingDecision.useN8N, // Use routing decision
                });

                const totalTime = performance.now() - performanceStart;
                console.log(
                    '[SendMessage] Successfully completed - total time:',
                    totalTime.toFixed(2) + 'ms'
                );
            } catch (error) {
                const totalTime = performance.now() - performanceStart;
                console.error('[SendMessage] Error after', totalTime.toFixed(2) + 'ms:', error);

                // Reset loading states on error
                batchStateUpdates([() => setIsGenerating(false), () => setIsSending(false)]);
            } finally {
                setIsSending(false);
            }
        },
        [
            isSignedIn,
            chatMode,
            editor,
            currentThreadId,
            getThreadItems,
            handleSubmit,
            useWebSearch,
            imageAttachment,
            createThread,
            createThreadItem,
            clearImageAttachment,
            setIsGenerating,
            isSending,
        ]
    );

    // Create debounced and deduplicated version of sendMessage
    const sendMessage = useMemo(() => {
        const debouncedSend = debounce(sendMessageCore, 300);
        // Wrap in async function for deduplicate utility
        const asyncWrapper = async (customPrompt?: string, parameters?: Record<string, any>) => {
            return await debouncedSend(customPrompt, parameters);
        };
        return deduplicate(
            asyncWrapper,
            (customPrompt, parameters) =>
                `${customPrompt || editor?.getText()?.trim() || ''}-${JSON.stringify(parameters || {})}`,
            1000
        );
    }, [sendMessageCore, editor]);

    // Edit functionality
    const handleEditLastMessage = useCallback(async () => {
        if (!currentThreadId) return;

        // Get the last user message from the thread from store state (avoid async call)
        const storeThreadItems = getStoreState().threadItems || [];
        const threadItems = storeThreadItems.filter(
            item => item.threadId === currentThreadId.toString()
        );
        const lastUserMessage = (threadItems || [])
            .filter(item => item.query) // Only user messages
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (lastUserMessage && editor) {
            setIsEditingLast(true);
            setEditingMessageId(lastUserMessage.id);

            // Populate editor with the last message
            editor.commands.setContent(lastUserMessage.query);
            editor.commands.focus('end');
        }
    }, [currentThreadId, getThreadItems, editor]);

    const threadItems = useChatStore(useShallow(state => state?.threadItems || []));

    const canEditLast = useCallback(() => {
        if (!currentThreadId || isGenerating) return false;

        if (!Array.isArray(threadItems)) return false;

        const lastUserMessage = (threadItems || [])
            .filter(item => item.query && item.threadId === currentThreadId.toString())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return !!lastUserMessage;
    }, [currentThreadId, isGenerating, threadItems]);

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
                        'bg-background border-hard/50 shadow-medium relative z-10 w-full rounded-xl border'
                    )}
                >
                    <ImageDropzoneRoot dropzoneProps={dropzonProps}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="flex w-full flex-shrink-0 overflow-hidden rounded-lg"
                        >
                            {(editor?.isEditable && isInitialized) ||
                            (!editor && !isInitialized) ? (
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
                                                {/* DISABLED: Model selection now handled by n8n workflow */}
                                                {/* <ChatModeButton /> */}
                                                {/* <AttachmentButton /> */}
                                                {/* <PromptCardsButton onSelectPrompt={handlePromptSelect} /> */}
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
                                                editLastMessage={handleEditLastMessage}
                                                canEditLast={canEditLast()}
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
                        ? 'bg-secondary border-border sticky bottom-0 z-10 border-t'
                        : 'flex h-full flex-col overflow-y-auto'
                )}
            >
                {!currentThreadId ? (
                    <div className="flex min-h-full flex-col">
                        {/* Centered Chat Section */}
                        <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center">
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
                            <div className="border-t border-gray-200 bg-gray-50 py-8 pb-20 dark:border-gray-800 dark:bg-gray-950">
                                <div className="mx-auto max-w-6xl px-8">
                                    <div className="mb-6">
                                        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
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

const AnimatedTitles = ({}: AnimatedTitlesProps) => {
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
                return `${baseGreeting}`;
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
                    className="whitespace-pre-line bg-clip-text text-center text-[32px] font-semibold tracking-tight text-transparent"
                    style={{
                        background: 'linear-gradient(270deg, #A8A8A8 -1.16%, #343232 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                    }}
                >
                    {greeting}
                </motion.h1>
            </AnimatePresence>
        </Flex>
    );
};
