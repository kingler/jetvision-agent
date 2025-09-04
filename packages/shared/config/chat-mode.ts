export enum ChatMode {
    // OpenAI models only (frontend agents)
    GPT_4o = 'gpt-4o',
    GPT_4o_Mini = 'gpt-4o-mini',
    GPT_4_1 = 'gpt-4.1',
    GPT_4_1_Mini = 'gpt-4.1-mini',
    GPT_4_1_Nano = 'gpt-4.1-nano',
    O4_Mini = 'o4-mini',
}

export const ChatModeConfig: Record<
    ChatMode,
    {
        webSearch: boolean;
        imageUpload: boolean;
        retry: boolean;
        isNew?: boolean;
        isAuthRequired?: boolean;
        isAviationRouted?: boolean; // New flag for aviation message routing
    }
> = {
    [ChatMode.GPT_4o]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isAuthRequired: false,
        isAviationRouted: true, // Routes aviation messages to n8n workflow
    },
    [ChatMode.GPT_4o_Mini]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isAuthRequired: false,
        isAviationRouted: true,
    },
    [ChatMode.GPT_4_1]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isNew: true,
        isAuthRequired: false,
        isAviationRouted: true,
    },
    [ChatMode.GPT_4_1_Mini]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isNew: true,
        isAuthRequired: false,
        isAviationRouted: true,
    },
    [ChatMode.GPT_4_1_Nano]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isNew: true,
        isAuthRequired: false,
        isAviationRouted: true,
    },
    [ChatMode.O4_Mini]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
        isAviationRouted: true,
    },
};

export const CHAT_MODE_CREDIT_COSTS = {
    [ChatMode.GPT_4o]: 3,
    [ChatMode.GPT_4o_Mini]: 1,
    [ChatMode.GPT_4_1]: 5,
    [ChatMode.GPT_4_1_Mini]: 2,
    [ChatMode.GPT_4_1_Nano]: 1,
    [ChatMode.O4_Mini]: 5,
};

export const getChatModeName = (mode: ChatMode) => {
    switch (mode) {
        case ChatMode.GPT_4o:
            return 'GPT-4o (Aviation Agent)';
        case ChatMode.GPT_4o_Mini:
            return 'GPT-4o Mini (Aviation Agent)';
        case ChatMode.GPT_4_1:
            return 'GPT-4.1 (Aviation Agent)';
        case ChatMode.GPT_4_1_Mini:
            return 'GPT-4.1 Mini (Aviation Agent)';
        case ChatMode.GPT_4_1_Nano:
            return 'GPT-4.1 Nano (Aviation Agent)';
        case ChatMode.O4_Mini:
            return 'O4 Mini (Aviation Agent)';
    }
};
