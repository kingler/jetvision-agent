import { useChatStore } from '@repo/common/store';
import { Editor } from '@tiptap/react';
import { PromptCards } from './jetvision/PromptCards';
import { scrollToChatInputWithFocus } from '@repo/common/utils';

export const ExamplePrompts = () => {
    const editor: Editor | undefined = useChatStore(state => state.editor);
    
    const handlePromptSelect = (_prompt: string, fullPrompt: string, parameters?: Record<string, any>) => {
        if (!editor) return;
        editor.commands.clearContent();
        // Use the full enhanced prompt
        editor.commands.insertContent(fullPrompt);
        // Store parameters if needed for later use
        if (parameters) {
            // Store parameters in chat store or session storage for n8n processing
            sessionStorage.setItem('promptParameters', JSON.stringify(parameters));
        }
        // Trigger smooth scroll to chat input after prompt selection
        scrollToChatInputWithFocus(100);
    };

    if (!editor) return null;

    return (
        <div className="animate-fade-in w-full px-6 py-4 duration-[1000ms]">
            <PromptCards onSelectPrompt={handlePromptSelect} />
        </div>
    );
};
