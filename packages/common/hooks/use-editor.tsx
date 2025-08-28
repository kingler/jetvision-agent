import { DisableEnter, ShiftEnterToLineBreak } from '@repo/shared/utils';
import CharacterCount from '@tiptap/extension-character-count';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Highlight } from '@tiptap/extension-highlight';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Text } from '@tiptap/extension-text';

import { Editor, useEditor } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../store';

export const useChatEditor = (editorProps: {
    placeholder?: string;
    defaultContent?: string;
    charLimit?: number;
    enableEnter?: boolean;
    onInit?: (props: { editor: Editor }) => void;
    onUpdate?: (props: { editor: Editor }) => void;
}) => {
    const setEditor = useChatStore(state => state.setEditor);
    const [isInitialized, setIsInitialized] = useState(false);

    const editor = useEditor({
        extensions: [
            Document,
            Paragraph,
            Text,
            Placeholder.configure({
                placeholder: editorProps?.placeholder || 'Ask anything',
                emptyEditorClass: 'is-editor-empty',
                emptyNodeClass: 'is-empty',
            }),
            CharacterCount.configure({
                limit: editorProps?.charLimit || 400000,
            }),
            ...(!editorProps?.enableEnter ? [ShiftEnterToLineBreak, DisableEnter] : []),
            Highlight.configure({
                HTMLAttributes: {
                    class: 'prompt-highlight',
                },
            }),
            HardBreak,
        ],
        immediatelyRender: false,
        content: editorProps?.defaultContent || '',
        autofocus: true,
        editable: true,
        parseOptions: {
            preserveWhitespace: 'full',
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
            },
        },
        onTransaction(props) {
            const { editor } = props;
            const text = editor.getText();
            const html = editor.getHTML();
            
            if (text === '/') {
                // Command palette trigger logic can go here
            } else {
                const newHTML = html.replace(/::((?:(?!::).)+)::/g, (_, content) => {
                    return ` <mark class="prompt-highlight">${content}</mark> `;
                });

                if (newHTML !== html) {
                    editor.commands.setContent(newHTML, true, {
                        preserveWhitespace: true,
                    });
                }
            }
        },
        onCreate: useCallback((props) => {
            console.log('TipTap editor created successfully');
            setIsInitialized(true);
            
            if (editorProps?.defaultContent) {
                props.editor.commands.setContent(editorProps.defaultContent, true, {
                    preserveWhitespace: true,
                });
            }
            
            if (editorProps?.onInit) {
                editorProps.onInit({ editor: props.editor });
            }
        }, [editorProps?.defaultContent, editorProps?.onInit]),
        
        onUpdate: useCallback((props) => {
            const { editor } = props;
            if (editorProps?.onUpdate) {
                editorProps.onUpdate({ editor });
            }
        }, [editorProps?.onUpdate]),

        onDestroy: useCallback(() => {
            console.log('TipTap editor destroyed');
            setIsInitialized(false);
        }, []),
    });

    useEffect(() => {
        if (editor && isInitialized) {
            setEditor(editor);
        }
    }, [editor, isInitialized, setEditor]);

    useEffect(() => {
        if (editor && isInitialized) {
            // Small delay to ensure DOM is ready
            const focusTimer = setTimeout(() => {
                editor.commands.focus('end');
            }, 100);
            
            return () => clearTimeout(focusTimer);
        }
    }, [editor, isInitialized]);

    return {
        editor,
        isInitialized,
    };
};
