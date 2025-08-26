import { useChatStore } from '@repo/common/store';
import { Editor } from '@tiptap/react';
import { PromptCards } from './jetvision/PromptCards';
import { scrollToChatInputWithFocus } from '@repo/common/utils';

export const ExamplePrompts = () => {
    const editor: Editor | undefined = useChatStore(state => state.editor);
    
    const handlePromptSelect = (prompt: string) => {
        if (!editor) return;
        editor.commands.clearContent();
        editor.commands.insertContent(prompt);
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
