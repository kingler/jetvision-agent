import { useChatStore } from '@repo/common/store';
import { ChatModeConfig } from '@repo/shared/config';
import { Button, Tooltip } from '@repo/ui';
import { IconPaperclip } from '@tabler/icons-react';
import { FC } from 'react';

export type TImageUpload = {
    id: string;
    label: string;
    tooltip: string;
    showIcon: boolean;
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const ImageUpload: FC<TImageUpload> = ({
    id,
    label,
    tooltip,
    showIcon,
    handleImageUpload,
}) => {
    // DISABLED: Model selection now handled by n8n workflow - using default mode
    // const chatMode = useChatStore(state => state.chatMode);
    const chatMode = 'gpt-4o-mini'; // Default mode since n8n workflow handles model selection
    const handleFileSelect = () => {
        document.getElementById(id)?.click();
    };

    if (!ChatModeConfig[chatMode]?.imageUpload) {
        return null;
    }

    return (
        <>
            <input type="file" id={id} className="hidden" onChange={handleImageUpload} />
            <Tooltip content={tooltip}>
                {showIcon ? (
                    <Button variant="ghost" size="icon-sm" onClick={handleFileSelect}>
                        <IconPaperclip size={16} strokeWidth={2} />
                    </Button>
                ) : (
                    <Button variant="bordered" onClick={handleFileSelect}>
                        {label}
                    </Button>
                )}
            </Tooltip>
        </>
    );
};
