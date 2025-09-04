'use client';
import { useUser } from '@clerk/nextjs';
import { DotSpinner } from '@repo/common/components';
import { useApiKeysStore, useChatStore } from '@repo/common/store';
import { CHAT_MODE_CREDIT_COSTS, ChatMode, ChatModeConfig } from '@repo/shared/config';
import {
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Kbd,
} from '@repo/ui';
import {
    IconArrowUp,
    IconAtom,
    IconChevronDown,
    IconEdit,
    IconNorthStar,
    IconPaperclip,
    IconPlayerStopFilled,
    IconWorld,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BYOKIcon, NewIcon } from '../icons';

export const chatOptions = [
    // No special chat options - all OpenAI models handle aviation routing
];

export const modelOptions = [
    {
        label: 'GPT-4o (Aviation Agent)',
        description: 'Most capable OpenAI model with aviation routing',
        value: ChatMode.GPT_4o,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4o],
    },
    {
        label: 'GPT-4o Mini (Aviation Agent)',
        description: 'Fast and efficient with aviation routing',
        value: ChatMode.GPT_4o_Mini,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4o_Mini],
    },
    {
        label: 'GPT-4.1 (Aviation Agent)',
        description: 'Advanced reasoning with aviation routing',
        value: ChatMode.GPT_4_1,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1],
    },
    {
        label: 'GPT-4.1 Mini (Aviation Agent)',
        description: 'Balanced performance with aviation routing',
        value: ChatMode.GPT_4_1_Mini,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Mini],
    },
    {
        label: 'GPT-4.1 Nano (Aviation Agent)',
        description: 'Cost-effective with aviation routing',
        value: ChatMode.GPT_4_1_Nano,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Nano],
    },
    {
        label: 'O4 Mini (Aviation Agent)',
        description: 'Specialized reasoning with aviation routing',
        value: ChatMode.O4_Mini,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.O4_Mini],
    },
];

export const AttachmentButton = () => {
    return (
        <Button
            size="icon"
            tooltip="Attachment (coming soon)"
            variant="ghost"
            className="gap-2"
            rounded="full"
            disabled
        >
            <IconPaperclip size={18} strokeWidth={2} className="text-muted-foreground" />
        </Button>
    );
};

// OpenAI Frontend Agent Selection Button
export const ChatModeButton = () => {
    const chatMode = useChatStore(state => state.chatMode);
    const setChatMode = useChatStore(state => state.setChatMode);
    const [isChatModeOpen, setIsChatModeOpen] = useState(false);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const isChatPage = usePathname().startsWith('/chat');

    const selectedOption = modelOptions.find(option => option.value === chatMode) ?? modelOptions[1]; // Default to GPT-4o Mini

    return (
        <DropdownMenu open={isChatModeOpen} onOpenChange={setIsChatModeOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={'secondary'} size="xs">
                    {selectedOption?.icon}
                    <span className="max-w-[120px] truncate">{selectedOption?.label?.replace(' (Aviation Agent)', '')}</span>
                    <IconChevronDown size={14} strokeWidth={2} />
                </Button>
            </DropdownMenuTrigger>
            <ChatModeOptions chatMode={chatMode} setChatMode={setChatMode} />
        </DropdownMenu>
    );
};

export const WebSearchButton = () => {
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const setUseWebSearch = useChatStore(state => state.setUseWebSearch);
    const chatMode = useChatStore(state => state.chatMode);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);

    if (!ChatModeConfig[chatMode]?.webSearch && !hasApiKeyForChatMode(chatMode)) return null;

    return (
        <Button
            size={useWebSearch ? 'sm' : 'icon-sm'}
            tooltip="Web Search"
            variant={useWebSearch ? 'secondary' : 'ghost'}
            className={cn('gap-2', useWebSearch && 'bg-blue-500/10 text-blue-500')}
            onClick={() => setUseWebSearch(!useWebSearch)}
        >
            <IconWorld
                size={16}
                strokeWidth={2}
                className={cn(useWebSearch ? '!text-blue-500' : 'text-muted-foreground')}
            />
            {useWebSearch && <p className="text-xs">Web</p>}
        </Button>
    );
};

export const NewLineIndicator = () => {
    const editor = useChatStore(state => state.editor);
    const hasTextInput = !!editor?.getText();

    if (!hasTextInput) return null;

    return (
        <p className="flex flex-row items-center gap-1 text-xs text-gray-500">
            use <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for new line
        </p>
    );
};

export const GeneratingStatus = () => {
    return (
        <div className="text-muted-foreground flex flex-row items-center gap-1 px-2 text-xs">
            <DotSpinner /> Generating...
        </div>
    );
};

export const ChatModeOptions = ({
    chatMode,
    setChatMode,
    isRetry = false,
}: {
    chatMode: ChatMode;
    setChatMode: (chatMode: ChatMode) => void;
    isRetry?: boolean;
}) => {
    const { isSignedIn } = useUser();
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const isChatPage = usePathname().startsWith('/chat');
    const { push } = useRouter();
    return (
        <DropdownMenuContent
            align="start"
            side="bottom"
            className="no-scrollbar max-h-[300px] w-[300px] overflow-y-auto"
        >
            {/* Chat options removed - all OpenAI models handle aviation routing */}
            <DropdownMenuGroup>
                <DropdownMenuLabel>OpenAI Aviation Agents</DropdownMenuLabel>
                {modelOptions.map(option => (
                    <DropdownMenuItem
                        key={option.label}
                        onSelect={() => {
                            if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                push('/sign-in');
                                return;
                            }
                            setChatMode(option.value);
                        }}
                        className="h-auto"
                    >
                        <div className="flex w-full flex-row items-start gap-1.5 px-1.5 py-1.5">
                            <div className="flex flex-col gap-0 pt-1">{option.icon}</div>

                            <div className="flex flex-col gap-0">
                                <p className="m-0 text-sm font-medium">{option.label}</p>
                                {option.description && (
                                    <p className="text-muted-foreground text-xs font-light">
                                        {option.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex-1" />
                            {ChatModeConfig[option.value]?.isNew && <NewIcon />}
                            {hasApiKeyForChatMode(option.value) && <BYOKIcon />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
        </DropdownMenuContent>
    );
};

export const SendStopButton = ({
    isGenerating,
    isChatPage,
    stopGeneration,
    hasTextInput,
    sendMessage,
    editLastMessage,
    canEditLast = false,
}: {
    isGenerating: boolean;
    isChatPage: boolean;
    stopGeneration: () => void;
    hasTextInput: boolean;
    sendMessage: () => void;
    editLastMessage?: () => void;
    canEditLast?: boolean;
}) => {
    return (
        <div className="flex flex-row items-center gap-1">
            {/* Edit button for last message (when available) */}
            {canEditLast && editLastMessage && !isGenerating && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={editLastMessage}
                        tooltip="Edit Last Message"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <IconEdit size={14} strokeWidth={2} />
                    </Button>
                </motion.div>
            )}

            <AnimatePresence mode="wait" initial={false}>
                {isGenerating && !isChatPage ? (
                    <motion.div
                        key="stop-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            variant="default"
                            onClick={stopGeneration}
                            tooltip="Stop Generation"
                        >
                            <IconPlayerStopFilled size={14} strokeWidth={2} />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="send-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            tooltip="Send Message"
                            variant={hasTextInput ? 'default' : 'secondary'}
                            disabled={!hasTextInput || isGenerating}
                            onClick={() => {
                                console.log('[SendButton] Clicked - hasTextInput:', hasTextInput, 'isGenerating:', isGenerating);
                                if (!hasTextInput) {
                                    console.error('[SendButton] No text input detected!');
                                    return;
                                }
                                if (isGenerating) {
                                    console.error('[SendButton] Already generating!');
                                    return;
                                }
                                console.log('[SendButton] Calling sendMessage()...');
                                sendMessage();
                            }}
                        >
                            <IconArrowUp size={16} strokeWidth={2} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
