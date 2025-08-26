'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import {
    ImageAttachment,
    ImageDropzoneRoot,
    MessagesRemainingBadge,
} from '@repo/common/components';
import { useImageAttachment } from '@repo/common/hooks';
import { ChatModeConfig } from '@repo/shared/config';
import { cn, Flex } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStream } from '../../hooks/agent-provider';
import { useChatEditor } from '../../hooks/use-editor';
import { useChatStore } from '../../store';
import { ExamplePrompts } from '../exmaple-prompts';
import { ChatFooter } from '../chat-footer';
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
    const { editor } = useChatEditor({
        placeholder: isFollowUp ? 'Ask a follow-up question about your flight' : 'Ask about executive travel, jet charter, or Apollo.io campaigns',
        onInit: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp && !isSignedIn) {
                const draftMessage = window.localStorage.getItem('draft-message');
                if (draftMessage) {
                    editor.commands.setContent(draftMessage, true, { preserveWhitespace: true });
                }
            }
        },
        onUpdate: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp) {
                window.localStorage.setItem('draft-message', editor.getText());
            }
        },
    });
    const size = currentThreadId ? 'base' : 'sm';
    const getThreadItems = useChatStore(state => state.getThreadItems);
    const threadItemsLength = useChatStore(useShallow(state => state.threadItems.length));
    const { handleSubmit } = useAgentStream();
    const createThread = useChatStore(state => state.createThread);
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const isGenerating = useChatStore(state => state.isGenerating);
    const isChatPage = usePathname().startsWith('/chat');
    const imageAttachment = useChatStore(state => state.imageAttachment);
    const clearImageAttachment = useChatStore(state => state.clearImageAttachment);
    const stopGeneration = useChatStore(state => state.stopGeneration);
    const hasTextInput = !!editor?.getText();
    const { dropzonProps, handleImageUpload } = useImageAttachment();
    const { push } = useRouter();
    const chatMode = useChatStore(state => state.chatMode);
    const sendMessage = async () => {
        if (
            !isSignedIn &&
            !!ChatModeConfig[chatMode as keyof typeof ChatModeConfig]?.isAuthRequired
        ) {
            push('/sign-in');
            return;
        }

        if (!editor?.getText()) {
            return;
        }

        let threadId = currentThreadId?.toString();

        if (!threadId) {
            const optimisticId = uuidv4();
            push(`/chat/${optimisticId}`);
            createThread(optimisticId, {
                title: editor?.getText(),
            });
            threadId = optimisticId;
        }

        // First submit the message
        const formData = new FormData();
        formData.append('query', editor.getText());
        imageAttachment?.base64 && formData.append('imageAttachment', imageAttachment?.base64);
        const threadItems = currentThreadId ? await getThreadItems(currentThreadId.toString()) : [];

        console.log('threadItems', threadItems);

        handleSubmit({
            formData,
            newThreadId: threadId,
            messages: threadItems.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
            useWebSearch,
            useN8n: true, // Force n8n webhook usage
        });
        window.localStorage.removeItem('draft-message');
        editor.commands.clearContent();
        clearImageAttachment();
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
                            {editor?.isEditable ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="w-full"
                                >
                                    <ImageAttachment />
                                    <Flex className="flex w-full flex-row items-end gap-0">
                                        <ChatEditor
                                            sendMessage={sendMessage}
                                            editor={editor}
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
            <MessagesRemainingBadge key="remaining-messages" />
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
                    'w-full h-full overflow-y-auto',
                    currentThreadId
                        ? 'absolute bottom-0 bg-secondary'
                        : 'flex flex-col'
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
                                    <MessagesRemainingBadge key="remaining-messages" />
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
                    // Thread view - existing layout
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-8">
                        <Flex
                            items="start"
                            justify="start"
                            direction="col"
                            className="w-full pb-4 mb-0"
                        >
                            {renderChatBottom()}
                        </Flex>
                    </div>
                )}
            </div>
            {!currentThreadId && <ChatFooter />}
        </>
    );
});

ChatInput.displayName = 'ChatInput';

type AnimatedTitlesProps = {
    titles?: string[];
};

const AnimatedTitles = ({ titles = [] }: AnimatedTitlesProps) => {
    const [greeting, setGreeting] = React.useState<string>('');
    const { user, isLoaded } = useUser();

    React.useEffect(() => {
        const getTimeBasedGreeting = () => {
            const hour = new Date().getHours();
            let baseGreeting = '';

            if (hour >= 5 && hour < 12) {
                baseGreeting = 'Good morning';
            } else if (hour >= 12 && hour < 18) {
                baseGreeting = 'Good afternoon';
            } else {
                baseGreeting = 'Good evening';
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
            className="relative h-[60px] w-full items-center justify-center overflow-hidden"
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
                    className="from-muted-foreground/50 via-muted-foreground/40 to-muted-foreground/20 bg-gradient-to-r bg-clip-text text-center text-[32px] font-semibold tracking-tight text-transparent"
                >
                    {greeting}
                </motion.h1>
            </AnimatePresence>
        </Flex>
    );
};
