import { useChatStore } from '@repo/common/store';
import { cn, Flex } from '@repo/ui';
import { Editor, EditorContent } from '@tiptap/react';
import { FC, useState, useRef, useEffect } from 'react';

export type TChatEditor = {
    sendMessage?: (message: string) => void;
    editor: Editor | null;
    maxHeight?: string;
    className?: string;
    placeholder?: string;
    isInitialized?: boolean;
};

// Fallback textarea component when TipTap fails
const FallbackTextarea: FC<{
    sendMessage?: (message: string) => void;
    placeholder?: string;
    maxHeight?: string;
    className?: string;
    isGenerating?: boolean;
}> = ({ sendMessage, placeholder, maxHeight, className, isGenerating }) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const setEditor = useChatStore(state => state.setEditor);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();

            // Create a mock editor object for compatibility
            const mockEditor = {
                getText: () => value,
                commands: {
                    clearContent: () => setValue(''),
                    setContent: (content: string) => setValue(content),
                    focus: () => textareaRef.current?.focus(),
                },
                isEmpty: () => !value.trim(),
                isEditable: true,
            };
            setEditor(mockEditor as any);
        }
    }, [value, setEditor]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isGenerating) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                sendMessage?.(value);
                setValue('');
                // Clear localStorage draft
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('draft-message');
                }
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height =
            Math.min(textarea.scrollHeight, parseInt(maxHeight || '300px')) + 'px';
    };

    return (
        <Flex className="flex-1">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={
                    placeholder || 'Ask about executive travel, jet charter, or Apollo.io campaigns'
                }
                disabled={isGenerating}
                className={cn(
                    'min-h-[120px] w-full resize-none border-none bg-transparent p-3 text-sm outline-none focus:outline-none',
                    'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                    'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent overflow-y-auto',
                    className
                )}
                style={{
                    maxHeight: maxHeight || '300px',
                    lineHeight: '1.5',
                }}
            />
        </Flex>
    );
};

export const ChatEditor: FC<TChatEditor> = ({
    sendMessage,
    editor,
    placeholder,
    maxHeight = '300px',
    className,
    isInitialized = false,
}) => {
    const isGenerating = useChatStore(state => state.isGenerating);
    const [useFallback, setUseFallback] = useState(false);
    const [loadingTimer, setLoadingTimer] = useState(true);

    // If TipTap takes too long to initialize, use fallback
    useEffect(() => {
        // Show loading for a brief moment, then switch to fallback if needed
        const loadingTimeout = setTimeout(() => {
            setLoadingTimer(false);
        }, 500); // Show loading for 0.5 second max

        const fallbackTimer = setTimeout(() => {
            if (!editor && !isInitialized) {
                console.warn('TipTap editor initialization timeout, using fallback textarea');
                setUseFallback(true);
            }
        }, 1000); // 1 second timeout for fallback - reduced from 2

        return () => {
            clearTimeout(loadingTimeout);
            clearTimeout(fallbackTimer);
        };
    }, [editor, isInitialized]);

    // Reset fallback if editor becomes available
    useEffect(() => {
        if (editor && isInitialized && useFallback) {
            setUseFallback(false);
        }
    }, [editor, isInitialized, useFallback]);

    // Use fallback if timeout exceeded or if editor fails
    if (useFallback || (!loadingTimer && !editor && !isInitialized)) {
        return (
            <FallbackTextarea
                sendMessage={sendMessage}
                placeholder={placeholder}
                maxHeight={maxHeight}
                className={className}
                isGenerating={isGenerating}
            />
        );
    }

    // Brief loading state (only show for 0.5 second)
    if (loadingTimer && !editor && !isInitialized) {
        return (
            <Flex className="flex-1">
                <div
                    className={cn(
                        'text-muted-foreground flex min-h-[120px] w-full items-center justify-center p-3',
                        className
                    )}
                >
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        <span>Loading editor...</span>
                    </div>
                </div>
            </Flex>
        );
    }

    const editorContainerClass = cn(
        'no-scrollbar [&>*]:no-scrollbar wysiwyg min-h-[120px] w-full cursor-text overflow-y-auto p-3 text-sm outline-none focus:outline-none',
        '[&>*]:leading-6 [&>*]:outline-none [&>*]:break-words [&>*]:whitespace-pre-wrap',
        '[&_.is-editor-empty]:before:text-muted-foreground [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:h-0',
        // List styles
        '[&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-4 [&_ul]:mb-2',
        '[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-4 [&_ol]:mb-2',
        '[&_li]:mb-1',
        // Paragraph styles
        '[&_p]:mb-2 [&_p:last-child]:mb-0',
        className
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isGenerating || !editor) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = editor.getText().trim();
            if (text) {
                sendMessage?.(text);
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            // Allow default behavior for line break
        }
    };

    return (
        <Flex className="flex-1">
            <EditorContent
                editor={editor}
                style={{ maxHeight }}
                onKeyDown={handleKeyDown}
                className={editorContainerClass}
                data-placeholder={placeholder}
            />
        </Flex>
    );
};
