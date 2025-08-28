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

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isGenerating) return;
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                sendMessage?.(value);
                setValue('');
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, parseInt(maxHeight || '300px')) + 'px';
    };

    return (
        <Flex className="flex-1">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || 'Ask about executive travel, jet charter, or Apollo.io campaigns'}
                disabled={isGenerating}
                className={cn(
                    'resize-none w-full min-h-[120px] p-3 text-base bg-transparent border-none outline-none focus:outline-none',
                    'placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed',
                    'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
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

    // If TipTap takes too long to initialize, use fallback
    useEffect(() => {
        if (!editor && !isInitialized) {
            const fallbackTimer = setTimeout(() => {
                console.warn('TipTap editor initialization timeout, using fallback textarea');
                setUseFallback(true);
            }, 3000); // 3 second timeout

            return () => clearTimeout(fallbackTimer);
        }
    }, [editor, isInitialized]);

    // Use fallback if editor is null or not initialized after timeout
    if (useFallback || (!editor && !isInitialized)) {
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

    // Loading state
    if (!editor || !isInitialized) {
        return (
            <Flex className="flex-1">
                <div className={cn(
                    'min-h-[120px] w-full p-3 flex items-center justify-center text-muted-foreground',
                    className
                )}>
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                        <span>Initializing editor...</span>
                    </div>
                </div>
            </Flex>
        );
    }

    const editorContainerClass = cn(
        'no-scrollbar [&>*]:no-scrollbar wysiwyg min-h-[120px] w-full cursor-text overflow-y-auto p-1 text-base outline-none focus:outline-none',
        '[&>*]:leading-6 [&>*]:outline-none [&>*]:break-words [&>*]:whitespace-pre-wrap',
        '[&_.is-editor-empty]:before:text-muted-foreground [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:h-0',
        className
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isGenerating) return;
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
