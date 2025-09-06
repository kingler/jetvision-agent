import { ChatEditor, markdownStyles, MarkdownContent } from '@repo/common/components';
import { useAgentStream, useChatEditor, useCopyText } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ThreadItem } from '@repo/shared/types';
import { Button, cn } from '@repo/ui';
import { IconCheck, IconCopy, IconPencil } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageMessage } from './image-message';

/**
 * Extract user text from message content
 * Handles both plain text and JSON-wrapped messages
 */
function extractUserText(message: string): string {
    // If the message is not JSON, return as-is
    if (!message.trim().startsWith('{') && !message.trim().startsWith('[')) {
        return message;
    }

    try {
        const parsed = JSON.parse(message);

        // Check for different possible text fields in the JSON structure
        if (typeof parsed === 'string') {
            return parsed;
        }

        // Handle array of messages (e.g., from chat APIs)
        if (Array.isArray(parsed)) {
            // Look for the last user message in the array
            const userMessage = parsed
                .reverse()
                .find(
                    item =>
                        item &&
                        typeof item === 'object' &&
                        (item.role === 'user' || item.type === 'user')
                );

            if (userMessage) {
                // Extract content from the user message
                const contentFields = ['content', 'message', 'text', 'prompt', 'query'];
                for (const field of contentFields) {
                    if (userMessage[field] && typeof userMessage[field] === 'string') {
                        return userMessage[field];
                    }
                    // Handle nested content arrays (like Claude API format)
                    if (Array.isArray(userMessage[field])) {
                        const textContent = userMessage[field].find(
                            item => item && typeof item === 'object' && item.type === 'text'
                        );
                        if (textContent && textContent.text) {
                            return textContent.text;
                        }
                    }
                }
            }

            // If no user message found, try to extract text from first item
            if (parsed.length > 0) {
                const firstItem = parsed[0];
                if (typeof firstItem === 'string') {
                    return firstItem;
                }
                if (firstItem && typeof firstItem === 'object') {
                    const textFields = ['content', 'message', 'text', 'prompt', 'query'];
                    for (const field of textFields) {
                        if (firstItem[field] && typeof firstItem[field] === 'string') {
                            return firstItem[field];
                        }
                    }
                }
            }
        }

        // Common field names for user text in JSON payloads
        const textFields = [
            'message',
            'prompt',
            'text',
            'content',
            'query',
            'input',
            'userInput',
            'userMessage',
        ];

        for (const field of textFields) {
            if (parsed[field] && typeof parsed[field] === 'string') {
                return parsed[field];
            }
            // Handle nested content arrays (like Claude API format)
            if (Array.isArray(parsed[field])) {
                const textContent = parsed[field].find(
                    item => item && typeof item === 'object' && item.type === 'text'
                );
                if (textContent && textContent.text) {
                    return textContent.text;
                }
            }
        }

        // Try to extract from nested structures
        if (parsed.data && typeof parsed.data === 'object') {
            for (const field of textFields) {
                if (parsed.data[field] && typeof parsed.data[field] === 'string') {
                    return parsed.data[field];
                }
            }
        }

        // If no standard field found, return the original message
        return message;
    } catch {
        // Not valid JSON, return original message
        return message;
    }
}
type MessageProps = {
    message: string;
    imageAttachment?: string;
    threadItem: ThreadItem;
};

export const Message = memo(({ message, imageAttachment, threadItem }: MessageProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);
    const { copyToClipboard, status } = useCopyText();
    const maxHeight = 120;
    const isGenerating = useChatStore(state => state.isGenerating);

    // Extract the actual user text from the message (handles JSON-wrapped messages)
    const displayText = extractUserText(message);

    useEffect(() => {
        if (messageRef.current) {
            setShowExpandButton(messageRef.current.scrollHeight > maxHeight);
        }
    }, [displayText]);

    const handleCopy = useCallback(() => {
        if (messageRef.current) {
            copyToClipboard(messageRef.current);
        }
    }, [copyToClipboard]);

    const toggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

    return (
        <div className="flex w-full flex-col items-end gap-2 pt-4">
            {imageAttachment && <ImageMessage imageAttachment={imageAttachment} />}
            <div
                className={cn(
                    'text-foreground bg-tertiary group relative max-w-[80%] overflow-hidden rounded-lg',
                    isEditing && 'border-hard'
                )}
            >
                {!isEditing && (
                    <>
                        <div
                            ref={messageRef}
                            className={cn('prose-sm relative px-3 py-1.5 font-normal', {
                                'pb-12': isExpanded,
                            })}
                            style={{
                                maxHeight: isExpanded ? 'none' : maxHeight,
                                transition: 'max-height 0.3s ease-in-out',
                            }}
                        >
                            <MarkdownContent
                                content={displayText}
                                isCompleted={true}
                                isLast={true}
                            />
                        </div>
                        <div
                            className={cn(
                                'absolute bottom-0 left-0 right-0 hidden flex-col items-center  group-hover:flex',
                                showExpandButton && 'flex'
                            )}
                        >
                            <div className="via-tertiary/85 to-tertiary flex w-full items-center justify-end gap-1 bg-gradient-to-b from-transparent p-1.5">
                                {showExpandButton && (
                                    <Button
                                        variant="secondary"
                                        size="xs"
                                        rounded="full"
                                        className="pointer-events-auto relative z-10 px-4"
                                        onClick={toggleExpand}
                                    >
                                        {isExpanded ? 'Show less' : 'Show more'}
                                    </Button>
                                )}
                                <Button
                                    variant="bordered"
                                    size="icon-sm"
                                    onClick={handleCopy}
                                    tooltip={status === 'copied' ? 'Copied' : 'Copy'}
                                >
                                    {status === 'copied' ? (
                                        <IconCheck size={14} strokeWidth={2} />
                                    ) : (
                                        <IconCopy size={14} strokeWidth={2} />
                                    )}
                                </Button>
                                <Button
                                    disabled={
                                        isGenerating ||
                                        threadItem.status === 'QUEUED' ||
                                        threadItem.status === 'PENDING'
                                    }
                                    variant="bordered"
                                    size="icon-sm"
                                    tooltip="Edit"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <IconPencil size={14} strokeWidth={2} />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {isEditing && (
                    <EditMessage
                        width={messageRef.current?.offsetWidth}
                        message={displayText}
                        threadItem={threadItem}
                        onCancel={() => {
                            setIsEditing(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
});

export type TEditMessage = {
    message: string;
    onCancel: () => void;
    threadItem: ThreadItem;
    width?: number;
};

export const EditMessage = memo(({ message, onCancel, threadItem, width }: TEditMessage) => {
    const { handleSubmit } = useAgentStream();
    const removeFollowupThreadItems = useChatStore(state => state.removeFollowupThreadItems);
    const getThreadItems = useChatStore(state => state.getThreadItems);

    const { editor } = useChatEditor({
        defaultContent: message,
    });

    const handleSave = async (query: string) => {
        if (!query.trim()) {
            toast.error('Please enter a message');
            return;
        }
        removeFollowupThreadItems(threadItem.id);

        const formData = new FormData();
        formData.append('query', query);
        formData.append('imageAttachment', threadItem.imageAttachment || '');
        const threadItems = await getThreadItems(threadItem.threadId);

        handleSubmit({
            formData,
            existingThreadItemId: threadItem.id,
            messages: threadItems,
            newChatMode: threadItem.mode,
            useWebSearch: false, //
        });
    };

    return (
        <div className="relative flex max-w-full flex-col items-end gap-2">
            <div
                className={cn(' relative px-3 py-0 text-base font-normal', {})}
                style={{
                    minWidth: width,
                    transition: 'max-height 0.3s ease-in-out',
                }}
            >
                <ChatEditor
                    maxHeight="100px"
                    editor={editor}
                    sendMessage={() => {
                        handleSave(editor?.getText() || '');
                    }}
                    className={cn('prose-sm max-w-full overflow-y-scroll !p-0', markdownStyles)}
                />
            </div>
            <div className={cn('flex-col items-center  group-hover:flex')}>
                <div className=" flex w-full items-center justify-end gap-1 bg-gradient-to-b from-transparent p-1.5">
                    <Button
                        size="xs"
                        onClick={() => {
                            handleSave(editor?.getText() || '');
                        }}
                        tooltip={status === 'copied' ? 'Copied' : 'Copy'}
                    >
                        Save
                    </Button>
                    <Button variant="bordered" size="xs" tooltip="Edit" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
});

Message.displayName = 'Message';
