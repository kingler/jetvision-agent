/**
 * Test suite for PromptCards Component
 * Tests prompt selection, management features, and UI integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PromptCards } from '../../components/jetvision/PromptCards';

// Mock dependencies
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@repo/ui', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
    DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
    DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => (
        <div data-testid="dropdown-trigger">{children}</div>
    ),
    DropdownMenuContent: ({ children }: any) => (
        <div data-testid="dropdown-content">{children}</div>
    ),
    DropdownMenuItem: ({ children, ...props }: any) => (
        <button data-testid="dropdown-item" {...props}>
            {children}
        </button>
    ),
}));

jest.mock('@tabler/icons-react', () => ({
    IconPlus: () => <div data-testid="icon-plus">+</div>,
    IconDots: () => <div data-testid="icon-dots">...</div>,
    IconEdit: () => <div data-testid="icon-edit">Edit</div>,
    IconCopy: () => <div data-testid="icon-copy">Copy</div>,
    IconTrash: () => <div data-testid="icon-trash">Trash</div>,
    IconX: () => <div data-testid="icon-x">X</div>,
    IconCheck: () => <div data-testid="icon-check">Check</div>,
    IconEye: () => <div data-testid="icon-eye">Eye</div>,
    IconAlertTriangle: () => <div data-testid="icon-alert">Alert</div>,
}));

// Mock TipTap editor
jest.mock('@tiptap/react', () => ({
    EditorContent: ({ editor }: any) => (
        <div data-testid="editor-content">{editor?.getHTML?.() || 'Editor content'}</div>
    ),
    useEditor: jest.fn(() => ({
        commands: {
            setContent: jest.fn(),
            clearContent: jest.fn(),
            focus: jest.fn(() => ({
                toggleBold: jest.fn(() => ({ run: jest.fn() })),
                toggleItalic: jest.fn(() => ({ run: jest.fn() })),
                toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
                toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
            })),
        },
        chain: jest.fn(() => ({
            focus: jest.fn(() => ({
                toggleBold: jest.fn(() => ({ run: jest.fn() })),
                toggleItalic: jest.fn(() => ({ run: jest.fn() })),
                toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
                toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
            })),
        })),
        getHTML: jest.fn(() => '<p>Test content</p>'),
        getText: jest.fn(() => 'Test content'),
        isActive: jest.fn(() => false),
    })),
}));

// Mock extensions
jest.mock('@tiptap/extension-document', () => ({ Document: {} }));
jest.mock('@tiptap/extension-paragraph', () => ({ Paragraph: {} }));
jest.mock('@tiptap/extension-text', () => ({ Text: {} }));
jest.mock('@tiptap/extension-placeholder', () => ({
    Placeholder: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-bold', () => ({ Bold: {} }));
jest.mock('@tiptap/extension-italic', () => ({ Italic: {} }));
jest.mock('@tiptap/extension-code', () => ({ Code: {} }));
jest.mock('@tiptap/extension-bullet-list', () => ({
    BulletList: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-ordered-list', () => ({
    OrderedList: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-list-item', () => ({ ListItem: {} }));
jest.mock('@tiptap/extension-heading', () => ({
    Heading: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-hard-break', () => ({ HardBreak: {} }));

// Mock the usePromptManager hook
const mockPromptManager = {
    prompts: [
        {
            id: 'test-1',
            category: 'Test Category',
            title: 'Test Prompt',
            prompt: 'Test prompt text',
            fullPrompt: 'Test full prompt text',
            description: 'Test description',
            isCustom: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
            id: 'custom-1',
            category: 'Custom',
            title: 'Custom Prompt',
            prompt: 'Custom prompt text',
            fullPrompt: 'Custom full prompt text',
            description: 'Custom description',
            isCustom: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    ],
    loading: false,
    error: null,
    createPrompt: jest.fn(),
    updatePrompt: jest.fn(),
    deletePrompt: jest.fn(),
    duplicatePrompt: jest.fn(),
    getPromptById: jest.fn(),
};

jest.mock('../../hooks/use-prompt-manager', () => ({
    usePromptManager: () => mockPromptManager,
}));

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
});

describe('PromptCards Component', () => {
    const user = userEvent.setup();
    const mockOnPromptSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue('[]');
        mockPromptManager.getPromptById.mockImplementation((id: string) =>
            mockPromptManager.prompts.find(p => p.id === id)
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render prompt cards', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            expect(screen.getByText('Test Prompt')).toBeInTheDocument();
            expect(screen.getByText('Custom Prompt')).toBeInTheDocument();
            expect(screen.getByText('Test description')).toBeInTheDocument();
            expect(screen.getByText('Custom description')).toBeInTheDocument();
        });

        it('should render add new prompt card', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            expect(screen.getByText('Add New Prompt')).toBeInTheDocument();
            expect(
                screen.getByText('Create a custom prompt for your specific needs')
            ).toBeInTheDocument();
            expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
        });

        it('should show loading state', () => {
            jest.spyOn(
                require('../../hooks/use-prompt-manager'),
                'usePromptManager'
            ).mockReturnValue({
                ...mockPromptManager,
                loading: true,
            });

            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            expect(screen.getByText('Loading prompts...')).toBeInTheDocument();
        });

        it('should show error state', () => {
            const errorMessage = 'Failed to load prompts';
            jest.spyOn(
                require('../../hooks/use-prompt-manager'),
                'usePromptManager'
            ).mockReturnValue({
                ...mockPromptManager,
                error: errorMessage,
            });

            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
        });
    });

    describe('Prompt Selection', () => {
        it('should call onPromptSelect when prompt card is clicked', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const promptCard = screen.getByText('Test Prompt').closest('button');
            expect(promptCard).toBeInTheDocument();

            await user.click(promptCard!);

            expect(mockOnPromptSelect).toHaveBeenCalledWith(
                'Test prompt text',
                'Test full prompt text'
            );
        });

        it('should call onPromptSelect for custom prompts', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const customPromptCard = screen.getByText('Custom Prompt').closest('button');
            expect(customPromptCard).toBeInTheDocument();

            await user.click(customPromptCard!);

            expect(mockOnPromptSelect).toHaveBeenCalledWith(
                'Custom prompt text',
                'Custom full prompt text'
            );
        });
    });

    describe('Management Features', () => {
        it('should show management menu for custom prompts', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Find the custom prompt card and its dropdown trigger
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            expect(customPromptCard).toBeInTheDocument();

            const dropdownTrigger = within(customPromptCard!).getByTestId('icon-dots');
            expect(dropdownTrigger).toBeInTheDocument();
        });

        it('should not show management menu for static prompts', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Find the static prompt card
            const staticPromptCard = screen
                .getByText('Test Prompt')
                .closest('[data-testid="prompt-card"]');
            expect(staticPromptCard).toBeInTheDocument();

            // Should not have dropdown trigger
            const dropdownTrigger = within(staticPromptCard!).queryByTestId('icon-dots');
            expect(dropdownTrigger).toBeNull();
        });
    });

    describe('Add New Prompt', () => {
        it('should open editor when add new prompt is clicked', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const addButton = screen.getByText('Add New Prompt').closest('button');
            expect(addButton).toBeInTheDocument();

            await user.click(addButton!);

            // Should open the editor dialog
            await waitFor(() => {
                expect(screen.getByTestId('dialog')).toBeInTheDocument();
                expect(screen.getByText('Create New Prompt')).toBeInTheDocument();
            });
        });

        it('should create new prompt with valid data', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Open the add prompt dialog
            const addButton = screen.getByText('Add New Prompt').closest('button');
            await user.click(addButton!);

            await waitFor(() => {
                expect(screen.getByTestId('dialog')).toBeInTheDocument();
            });

            // Fill in the form
            const titleInput = screen.getByPlaceholderText(
                'Enter a descriptive title for the prompt'
            );
            const promptInput = screen.getByPlaceholderText(
                'Short, user-friendly version of the prompt'
            );
            const descriptionInput = screen.getByPlaceholderText(
                'Brief description of what this prompt does'
            );

            await user.type(titleInput, 'New Test Prompt');
            await user.type(promptInput, 'This is a test prompt for testing');
            await user.type(descriptionInput, 'Description for testing');

            // Submit the form
            const createButton = screen.getByText('Create Prompt');
            await user.click(createButton);

            expect(mockPromptManager.createPrompt).toHaveBeenCalledWith(
                'New Test Prompt',
                'This is a test prompt for testing',
                '<p>Test content</p>',
                'Description for testing'
            );
        });
    });

    describe('Edit Functionality', () => {
        it('should open edit dialog for custom prompts', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Find custom prompt and trigger dropdown
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            // Click edit option
            await waitFor(() => {
                const editButton = screen.getByText('Edit');
                user.click(editButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Edit Prompt')).toBeInTheDocument();
            });
        });

        it('should update prompt with new data', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Open edit dialog for custom prompt
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            await waitFor(async () => {
                const editButton = screen.getByText('Edit');
                await user.click(editButton);
            });

            await waitFor(async () => {
                // Modify the title
                const titleInput = screen.getByDisplayValue('Custom Prompt');
                await user.clear(titleInput);
                await user.type(titleInput, 'Updated Custom Prompt');

                // Submit changes
                const saveButton = screen.getByText('Save Changes');
                await user.click(saveButton);
            });

            expect(mockPromptManager.updatePrompt).toHaveBeenCalledWith(
                'custom-1',
                'Updated Custom Prompt',
                'Custom prompt text',
                '<p>Test content</p>',
                'Custom description'
            );
        });
    });

    describe('Delete Functionality', () => {
        it('should show delete confirmation dialog', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Find custom prompt and trigger dropdown
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            // Click delete option
            await waitFor(async () => {
                const deleteButton = screen.getByText('Delete');
                await user.click(deleteButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Delete Prompt')).toBeInTheDocument();
                expect(
                    screen.getByText(/are you sure you want to delete this prompt/i)
                ).toBeInTheDocument();
            });
        });

        it('should delete prompt when confirmed', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Open delete confirmation
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            await waitFor(async () => {
                const deleteButton = screen.getByText('Delete');
                await user.click(deleteButton);
            });

            await waitFor(async () => {
                const confirmButton = screen.getByText('Delete');
                await user.click(confirmButton);
            });

            expect(mockPromptManager.deletePrompt).toHaveBeenCalledWith('custom-1');
        });
    });

    describe('Duplicate Functionality', () => {
        it('should duplicate prompt', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Find custom prompt and trigger dropdown
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            // Click duplicate option
            await waitFor(async () => {
                const duplicateButton = screen.getByText('Duplicate');
                await user.click(duplicateButton);
            });

            expect(mockPromptManager.duplicatePrompt).toHaveBeenCalledWith('custom-1');
        });

        it('should show success message after duplication', async () => {
            // Mock successful duplication
            mockPromptManager.duplicatePrompt.mockResolvedValueOnce(undefined);

            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            await waitFor(async () => {
                const duplicateButton = screen.getByText('Duplicate');
                await user.click(duplicateButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Prompt duplicated successfully!')).toBeInTheDocument();
            });
        });
    });

    describe('Form Validation', () => {
        it('should disable create button with invalid form data', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Open add prompt dialog
            const addButton = screen.getByText('Add New Prompt').closest('button');
            await user.click(addButton!);

            await waitFor(() => {
                const createButton = screen.getByText('Create Prompt');
                expect(createButton).toBeDisabled();
            });
        });

        it('should enable create button with valid form data', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Open add prompt dialog
            const addButton = screen.getByText('Add New Prompt').closest('button');
            await user.click(addButton!);

            await waitFor(async () => {
                // Fill required fields with valid data
                const titleInput = screen.getByPlaceholderText(
                    'Enter a descriptive title for the prompt'
                );
                const promptInput = screen.getByPlaceholderText(
                    'Short, user-friendly version of the prompt'
                );
                const descriptionInput = screen.getByPlaceholderText(
                    'Brief description of what this prompt does'
                );

                await user.type(titleInput, 'Valid Title');
                await user.type(promptInput, 'Valid prompt text that is long enough');
                await user.type(descriptionInput, 'Valid description');

                // Button should be enabled
                const createButton = screen.getByText('Create Prompt');
                expect(createButton).not.toBeDisabled();
            });
        });

        it('should show character count validation', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const addButton = screen.getByText('Add New Prompt').closest('button');
            await user.click(addButton!);

            await waitFor(() => {
                expect(
                    screen.getByText('0/100 characters (minimum 3 required)')
                ).toBeInTheDocument();
                expect(
                    screen.getByText('0/200 characters (minimum 10 required)')
                ).toBeInTheDocument();
                expect(
                    screen.getByText('0/300 characters (minimum 5 required)')
                ).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle create prompt errors', async () => {
            const errorMessage = 'Failed to create prompt';
            mockPromptManager.createPrompt.mockRejectedValueOnce(new Error(errorMessage));

            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Fill and submit form
            const addButton = screen.getByText('Add New Prompt').closest('button');
            await user.click(addButton!);

            await waitFor(async () => {
                const titleInput = screen.getByPlaceholderText(
                    'Enter a descriptive title for the prompt'
                );
                const promptInput = screen.getByPlaceholderText(
                    'Short, user-friendly version of the prompt'
                );
                const descriptionInput = screen.getByPlaceholderText(
                    'Brief description of what this prompt does'
                );

                await user.type(titleInput, 'Test Title');
                await user.type(promptInput, 'Test prompt text');
                await user.type(descriptionInput, 'Test description');

                const createButton = screen.getByText('Create Prompt');
                await user.click(createButton);
            });

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to create prompt. Please try again.')
                ).toBeInTheDocument();
            });
        });

        it('should handle delete prompt errors', async () => {
            const errorMessage = 'Failed to delete prompt';
            mockPromptManager.deletePrompt.mockRejectedValueOnce(new Error(errorMessage));

            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Trigger delete
            const customPromptCard = screen
                .getByText('Custom Prompt')
                .closest('[data-testid="prompt-card"]');
            const dropdownTrigger = within(customPromptCard!)
                .getByTestId('icon-dots')
                .closest('button');

            await user.click(dropdownTrigger!);

            await waitFor(async () => {
                const deleteButton = screen.getByText('Delete');
                await user.click(deleteButton);
            });

            await waitFor(async () => {
                const confirmButton = screen.getByText('Delete');
                await user.click(confirmButton);
            });

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to delete prompt. Please try again.')
                ).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const addButton = screen.getByText('Add New Prompt').closest('button');
            expect(addButton).toHaveAttribute('aria-label', expect.stringContaining('Add'));
        });

        it('should be keyboard navigable', async () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const firstCard = screen.getByText('Test Prompt').closest('button');

            // Focus should work
            firstCard!.focus();
            expect(firstCard).toHaveFocus();

            // Enter key should trigger selection
            fireEvent.keyDown(firstCard!, { key: 'Enter', code: 'Enter' });

            expect(mockOnPromptSelect).toHaveBeenCalled();
        });
    });

    describe('Responsive Design', () => {
        it('should render grid layout', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            const grid = screen.getByTestId('prompt-cards-grid');
            expect(grid).toHaveClass('grid');
        });
    });

    describe('Integration with Hooks', () => {
        it('should integrate with usePromptManager hook', () => {
            render(<PromptCards onPromptSelect={mockOnPromptSelect} />);

            // Verify hook is called and data is displayed
            expect(screen.getByText('Test Prompt')).toBeInTheDocument();
            expect(screen.getByText('Custom Prompt')).toBeInTheDocument();
        });
    });
});
