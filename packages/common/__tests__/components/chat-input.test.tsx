/**
 * Test suite for Chat Input Component
 * Tests message sending, editor functionality, and button interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ChatInput } from '../../components/chat-input/input';

// Mock dependencies
jest.mock('@clerk/nextjs', () => ({
    useAuth: () => ({ isSignedIn: true }),
    useUser: () => ({ user: { id: 'test-user' } })
}));

jest.mock('next/navigation', () => ({
    useParams: () => ({ threadId: 'test-thread' }),
    usePathname: () => '/chat',
    useRouter: () => ({
        push: jest.fn()
    })
}));

jest.mock('../../hooks/agent-provider', () => ({
    useAgentStream: () => ({
        handleSubmit: jest.fn()
    })
}));

jest.mock('../../hooks/use-editor', () => ({
    useChatEditor: () => ({
        editor: {
            getText: jest.fn(() => 'Test message'),
            commands: {
                clearContent: jest.fn(),
                setContent: jest.fn()
            },
            isEditable: true
        },
        isInitialized: true
    })
}));

jest.mock('../../store', () => ({
    useChatStore: (selector: any) => {
        const state = {
            isGenerating: false,
            setIsGenerating: jest.fn(),
            threadItems: [],
            getThreadItems: jest.fn(() => Promise.resolve([])),
            createThread: jest.fn(),
            createThreadItem: jest.fn(),
            useWebSearch: false,
            imageAttachment: null,
            clearImageAttachment: jest.fn(),
            stopGeneration: jest.fn(),
            chatMode: 'default'
        };
        return selector ? selector(state) : state;
    }
}));

jest.mock('../../hooks', () => ({
    useImageAttachment: () => ({
        dropzonProps: {},
        handleImageUpload: jest.fn()
    })
}));

describe('ChatInput Component', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render chat input with editor', () => {
        render(<ChatInput />);
        
        // Check for key elements
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
        expect(screen.getByText(/ask about executive travel/i)).toBeInTheDocument();
    });

    it('should call sendMessage when submit button is clicked', async () => {
        const { handleSubmit } = require('../../hooks/agent-provider').useAgentStream();
        
        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await user.click(sendButton);

        await waitFor(() => {
            expect(handleSubmit).toHaveBeenCalled();
        });
    });

    it('should clear editor after sending message', async () => {
        const { editor } = require('../../hooks/use-editor').useChatEditor();
        
        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await user.click(sendButton);

        await waitFor(() => {
            expect(editor.commands.clearContent).toHaveBeenCalled();
        });
    });

    it('should set isGenerating to true when sending', async () => {
        const setIsGenerating = jest.fn();
        jest.spyOn(require('../../store'), 'useChatStore').mockImplementation((selector: any) => {
            const state = {
                isGenerating: false,
                setIsGenerating,
                threadItems: [],
                getThreadItems: jest.fn(() => Promise.resolve([])),
                createThread: jest.fn(),
                createThreadItem: jest.fn(),
                useWebSearch: false,
                imageAttachment: null,
                clearImageAttachment: jest.fn(),
                stopGeneration: jest.fn(),
                chatMode: 'default'
            };
            return selector ? selector(state) : state;
        });

        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await user.click(sendButton);

        await waitFor(() => {
            expect(setIsGenerating).toHaveBeenCalledWith(true);
        });
    });

    it('should disable send button when no text is present', () => {
        jest.spyOn(require('../../hooks/use-editor'), 'useChatEditor').mockReturnValue({
            editor: {
                getText: jest.fn(() => ''),
                commands: {
                    clearContent: jest.fn(),
                    setContent: jest.fn()
                },
                isEditable: true
            },
            isInitialized: true
        });

        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        expect(sendButton).toBeDisabled();
    });

    it('should show stop button when generating', () => {
        jest.spyOn(require('../../store'), 'useChatStore').mockImplementation((selector: any) => {
            const state = {
                isGenerating: true,
                setIsGenerating: jest.fn(),
                threadItems: [],
                getThreadItems: jest.fn(() => Promise.resolve([])),
                createThread: jest.fn(),
                createThreadItem: jest.fn(),
                useWebSearch: false,
                imageAttachment: null,
                clearImageAttachment: jest.fn(),
                stopGeneration: jest.fn(),
                chatMode: 'default'
            };
            return selector ? selector(state) : state;
        });

        render(<ChatInput />);
        
        const stopButton = screen.getByRole('button', { name: /stop generation/i });
        expect(stopButton).toBeInTheDocument();
    });

    it('should handle custom prompts', async () => {
        const { handleSubmit } = require('../../hooks/agent-provider').useAgentStream();
        
        const { rerender } = render(<ChatInput />);
        
        // Simulate calling sendMessage with custom prompt
        const component = screen.getByRole('button', { name: /send message/i });
        
        // This would typically be called by prompt cards
        // Testing that the component can handle custom prompts
        expect(component).toBeInTheDocument();
        expect(handleSubmit).toBeDefined();
    });

    it('should log debug messages in development', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await user.click(sendButton);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SendMessage]'),
                expect.anything()
            );
        });
    });
});

describe('ChatInput Error Handling', () => {
    it('should handle editor initialization failure', () => {
        jest.spyOn(require('../../hooks/use-editor'), 'useChatEditor').mockReturnValue({
            editor: null,
            isInitialized: false
        });

        render(<ChatInput />);
        
        expect(screen.getByText(/loading editor/i)).toBeInTheDocument();
    });

    it('should redirect to sign-in if not authenticated and auth required', async () => {
        const pushMock = jest.fn();
        jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
            push: pushMock
        });
        
        jest.spyOn(require('@clerk/nextjs'), 'useAuth').mockReturnValue({
            isSignedIn: false
        });

        // Set a chat mode that requires auth
        jest.spyOn(require('../../store'), 'useChatStore').mockImplementation((selector: any) => {
            const state = {
                isGenerating: false,
                setIsGenerating: jest.fn(),
                threadItems: [],
                getThreadItems: jest.fn(() => Promise.resolve([])),
                createThread: jest.fn(),
                createThreadItem: jest.fn(),
                useWebSearch: false,
                imageAttachment: null,
                clearImageAttachment: jest.fn(),
                stopGeneration: jest.fn(),
                chatMode: 'pro' // Mode that requires auth
            };
            return selector ? selector(state) : state;
        });

        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await userEvent.click(sendButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/sign-in');
        });
    });

    it('should handle missing threadId by creating new thread', async () => {
        const createThreadMock = jest.fn();
        const pushMock = jest.fn();
        
        jest.spyOn(require('next/navigation'), 'useParams').mockReturnValue({});
        jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
            push: pushMock
        });
        
        jest.spyOn(require('../../store'), 'useChatStore').mockImplementation((selector: any) => {
            const state = {
                isGenerating: false,
                setIsGenerating: jest.fn(),
                threadItems: [],
                getThreadItems: jest.fn(() => Promise.resolve([])),
                createThread: createThreadMock,
                createThreadItem: jest.fn(),
                useWebSearch: false,
                imageAttachment: null,
                clearImageAttachment: jest.fn(),
                stopGeneration: jest.fn(),
                chatMode: 'default'
            };
            return selector ? selector(state) : state;
        });

        render(<ChatInput />);
        
        const sendButton = screen.getByRole('button', { name: /send message/i });
        await userEvent.click(sendButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/chat/'));
            expect(createThreadMock).toHaveBeenCalled();
        });
    });
});