import { ChatMode } from '@repo/shared/config';
import { CoreMessage } from 'ai';
import { ProviderEnumType } from './providers';

export enum ModelEnum {
    // JetVision Agent Model (Backend)
    JETVISION_AGENT = 'jetvision-agent',
    
    // OpenAI Frontend Agent Models
    GPT_4o = 'gpt-4o',
    GPT_4o_Mini = 'gpt-4o-mini',
    GPT_4_1 = 'gpt-4.1',
    GPT_4_1_Mini = 'gpt-4.1-mini',
    GPT_4_1_Nano = 'gpt-4.1-nano',
    O4_Mini = 'o4-mini',
}

export type Model = {
    id: ModelEnum;
    name: string;
    provider: ProviderEnumType;
    maxTokens: number;
    contextWindow: number;
};

export const models: Model[] = [
    // JetVision Agent - Backend workflow agent
    {
        id: ModelEnum.JETVISION_AGENT,
        name: 'JetVision Agent (Apollo.io + Avinode)',
        provider: 'n8n-agent',
        maxTokens: 32768,
        contextWindow: 128000,
    },
    // OpenAI Frontend Agents (with aviation routing)
    {
        id: ModelEnum.GPT_4o,
        name: 'GPT-4o (Aviation Agent)',
        provider: 'openai',
        maxTokens: 128000,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GPT_4o_Mini,
        name: 'GPT-4o Mini (Aviation Agent)',
        provider: 'openai',
        maxTokens: 16384,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GPT_4_1,
        name: 'GPT-4.1 (Aviation Agent)',
        provider: 'openai',
        maxTokens: 32768,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GPT_4_1_Mini,
        name: 'GPT-4.1 Mini (Aviation Agent)',
        provider: 'openai',
        maxTokens: 16384,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GPT_4_1_Nano,
        name: 'GPT-4.1 Nano (Aviation Agent)',
        provider: 'openai',
        maxTokens: 8192,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.O4_Mini,
        name: 'O4 Mini (Aviation Agent)',
        provider: 'openai',
        maxTokens: 32768,
        contextWindow: 128000,
    },
];

export const getModelFromChatMode = (mode?: string): ModelEnum => {
    // Map ChatMode to corresponding OpenAI frontend agent models
    switch (mode) {
        case ChatMode.GPT_4o:
            return ModelEnum.GPT_4o;
        case ChatMode.GPT_4o_Mini:
            return ModelEnum.GPT_4o_Mini;
        case ChatMode.GPT_4_1:
            return ModelEnum.GPT_4_1;
        case ChatMode.GPT_4_1_Mini:
            return ModelEnum.GPT_4_1_Mini;
        case ChatMode.GPT_4_1_Nano:
            return ModelEnum.GPT_4_1_Nano;
        case ChatMode.O4_Mini:
            return ModelEnum.O4_Mini;
        default:
            // Default to GPT-4o Mini if mode not specified or recognized
            return ModelEnum.GPT_4o_Mini;
    }
};

export const getChatModeMaxTokens = (mode: ChatMode) => {
    switch (mode) {
        case ChatMode.GPT_4o:
            return 128000;
        case ChatMode.GPT_4o_Mini:
            return 128000;
        case ChatMode.GPT_4_1:
            return 128000;
        case ChatMode.GPT_4_1_Mini:
            return 128000;
        case ChatMode.GPT_4_1_Nano:
            return 128000;
        case ChatMode.O4_Mini:
            return 128000;
        default:
            return 128000;
    }
};

export const estimateTokensByWordCount = (text: string): number => {
    // Simple word splitting by whitespace
    const words = text?.trim().split(/\s+/);

    // Using a multiplier of 1.35 tokens per word for English text
    const estimatedTokens = Math.ceil(words.length * 1.35);

    return estimatedTokens;
};

export const estimateTokensForMessages = (messages: CoreMessage[]): number => {
    let totalTokens = 0;

    for (const message of messages) {
        if (typeof message.content === 'string') {
            totalTokens += estimateTokensByWordCount(message.content);
        } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
                if (part.type === 'text') {
                    totalTokens += estimateTokensByWordCount(part.text);
                }
            }
        }
    }

    return totalTokens;
};

export const trimMessageHistoryEstimated = (messages: CoreMessage[], chatMode: ChatMode) => {
    const maxTokens = getChatModeMaxTokens(chatMode);
    let trimmedMessages = [...messages];

    if (trimmedMessages.length <= 1) {
        const tokenCount = estimateTokensForMessages(trimmedMessages);
        return { trimmedMessages, tokenCount };
    }

    const latestMessage = trimmedMessages.pop()!;

    const messageSizes = trimmedMessages.map(msg => {
        const tokens =
            typeof msg.content === 'string'
                ? estimateTokensByWordCount(msg.content)
                : Array.isArray(msg.content)
                  ? msg.content.reduce(
                        (sum, part) =>
                            part.type === 'text' ? sum + estimateTokensByWordCount(part.text) : sum,
                        0
                    )
                  : 0;
        return { message: msg, tokens };
    });

    let totalTokens = messageSizes.reduce((sum, item) => sum + item.tokens, 0);

    // Count tokens for the latest message
    const latestMessageTokens =
        typeof latestMessage.content === 'string'
            ? estimateTokensByWordCount(latestMessage.content)
            : Array.isArray(latestMessage.content)
              ? latestMessage.content.reduce(
                    (sum, part) =>
                        part.type === 'text' ? sum + estimateTokensByWordCount(part.text) : sum,
                    0
                )
              : 0;

    totalTokens += latestMessageTokens;

    while (totalTokens > maxTokens && messageSizes.length > 0) {
        const removed = messageSizes.shift();
        if (removed) {
            totalTokens -= removed.tokens;
        }
    }

    trimmedMessages = messageSizes.map(item => item.message);
    trimmedMessages.push(latestMessage);

    return { trimmedMessages, tokenCount: totalTokens };
};
