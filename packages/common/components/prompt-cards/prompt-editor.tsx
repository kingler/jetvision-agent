'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@repo/ui';
import {
    IconX,
    IconCheck,
    IconEdit,
    IconEye,
    IconDeviceFloppy,
    IconAlertCircle,
    IconSparkles,
} from '@tabler/icons-react';
import { validateEditedPrompt, enhancePromptForAviation } from '../../utils/prompt-editor';
import { EditorContent, useEditor } from '@tiptap/react';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Code } from '@tiptap/extension-code';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Heading } from '@tiptap/extension-heading';
import { HardBreak } from '@tiptap/extension-hard-break';

interface PromptEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, prompt: string, fullPrompt: string, description: string) => void;
    initialData?: {
        title: string;
        prompt: string;
        fullPrompt: string;
        description: string;
    };
    mode: 'create' | 'edit';
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    mode,
}) => {
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
        'idle'
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [validationResult, setValidationResult] = useState({
        isValid: true,
        errors: [],
        warnings: [],
    });
    const [enhancementSuggestions, setEnhancementSuggestions] = useState<{
        enhancedText: string;
        changes: string[];
    } | null>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const DRAFT_KEY = `prompt_draft_${mode}_${initialData?.title || 'new'}`;

    // Initialize form data when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setPrompt(initialData.prompt);
                setDescription(initialData.description);
            } else {
                setTitle('');
                setPrompt('');
                setDescription('');
            }
        }
    }, [isOpen, initialData]);

    // Initialize editor before using it in effects
    const fullPromptEditor = useEditor({
        extensions: [
            Document,
            Paragraph,
            Text,
            Placeholder.configure({
                placeholder: 'Enter the detailed full prompt that will be used by the AI agent...',
                emptyEditorClass: 'is-editor-empty',
            }),
            Bold,
            Italic,
            Code,
            BulletList.configure({
                HTMLAttributes: { class: 'list-disc list-outside ml-4' },
            }),
            OrderedList.configure({
                HTMLAttributes: { class: 'list-decimal list-outside ml-4' },
            }),
            ListItem,
            Heading.configure({
                levels: [1, 2, 3],
                HTMLAttributes: { class: 'font-bold' },
            }),
            HardBreak,
        ],
        immediatelyRender: false,
        content: initialData?.fullPrompt || '',
        autofocus: false,
        editable: true,
        parseOptions: {
            preserveWhitespace: 'full',
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3',
            },
        },
    });

    // Enhanced form validation with detailed feedback
    useEffect(() => {
        const trimmedTitle = title.trim();
        const trimmedPrompt = prompt.trim();
        const trimmedDescription = description.trim();
        const fullPromptText = fullPromptEditor?.getText() || '';

        // Basic validation
        const basicValid =
            trimmedTitle.length >= 3 &&
            trimmedPrompt.length >= 10 &&
            trimmedDescription.length >= 5;

        // Enhanced validation using prompt-editor utils
        const promptValidation = validateEditedPrompt(fullPromptText);
        const descriptionValidation = validateEditedPrompt(trimmedDescription);

        // Combine validation results
        const combinedErrors = [
            ...(trimmedTitle.length < 3 ? ['Title must be at least 3 characters'] : []),
            ...(trimmedPrompt.length < 10 ? ['Display prompt must be at least 10 characters'] : []),
            ...promptValidation.errors,
            ...descriptionValidation.errors,
        ];

        const combinedWarnings = [
            ...(trimmedTitle.length > 100 ? ['Title is quite long'] : []),
            ...promptValidation.warnings,
            ...descriptionValidation.warnings,
        ];

        const validationResult = {
            isValid: basicValid && promptValidation.isValid && descriptionValidation.isValid,
            errors: combinedErrors,
            warnings: combinedWarnings,
        };

        setValidationResult(validationResult);
        setIsValid(validationResult.isValid);

        // Mark as having unsaved changes if content differs from initial
        const hasChanges: boolean = initialData
            ? trimmedTitle !== initialData.title ||
              trimmedPrompt !== initialData.prompt ||
              trimmedDescription !== initialData.description ||
              fullPromptText !== initialData.fullPrompt
            : !!(trimmedTitle || trimmedPrompt || trimmedDescription || fullPromptText);

        setHasUnsavedChanges(hasChanges);

        // Trigger auto-save for drafts
        if (hasChanges) {
            triggerAutoSave();
        }
    }, [title, prompt, description, fullPromptEditor, initialData]);

    // Auto-save functionality with consistent UI patterns
    const saveDraft = useCallback(() => {
        try {
            const draft = {
                title,
                prompt,
                description,
                fullPrompt: fullPromptEditor?.getHTML() || '',
                timestamp: Date.now(),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save draft:', error);
            setAutoSaveStatus('error');
        }
    }, [title, prompt, description, fullPromptEditor, DRAFT_KEY]);

    const triggerAutoSave = useCallback(() => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        setAutoSaveStatus('saving');
        autoSaveTimerRef.current = setTimeout(() => {
            saveDraft();
        }, 2000);
    }, [saveDraft]);

    // AI Enhancement following existing patterns
    const handleEnhancePrompt = useCallback(() => {
        const currentText = fullPromptEditor?.getText() || '';
        const enhancement = enhancePromptForAviation(currentText);

        if (enhancement.changes.length > 0) {
            setEnhancementSuggestions(enhancement);
        }
    }, [fullPromptEditor]);

    const applyEnhancement = useCallback(() => {
        if (enhancementSuggestions && fullPromptEditor) {
            fullPromptEditor.commands.setContent(enhancementSuggestions.enhancedText);
            setEnhancementSuggestions(null);
        }
    }, [enhancementSuggestions, fullPromptEditor]);

    // Cleanup auto-save timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Update editor content when initialData changes
    useEffect(() => {
        if (fullPromptEditor && initialData?.fullPrompt) {
            fullPromptEditor.commands.setContent(initialData.fullPrompt);
        }
    }, [fullPromptEditor, initialData?.fullPrompt]);

    const handleSave = useCallback(() => {
        if (!isValid) return;

        const fullPrompt = fullPromptEditor?.getHTML() || fullPromptEditor?.getText() || '';
        onSave(title.trim(), prompt.trim(), fullPrompt, description.trim());

        // Reset form
        setTitle('');
        setPrompt('');
        setDescription('');
        fullPromptEditor?.commands.clearContent();
    }, [isValid, title, prompt, description, fullPromptEditor, onSave]);

    const handleClose = useCallback(() => {
        // Clear auto-save timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        onClose();
        // Reset form after a delay to prevent flashing
        setTimeout(() => {
            setTitle('');
            setPrompt('');
            setDescription('');
            setEnhancementSuggestions(null);
            setAutoSaveStatus('idle');
            setHasUnsavedChanges(false);
            fullPromptEditor?.commands.clearContent();
        }, 200);
    }, [onClose, fullPromptEditor]);

    const togglePreviewMode = useCallback(() => {
        setIsPreviewMode(!isPreviewMode);
    }, [isPreviewMode]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                ariaTitle={mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
                className="max-h-[90vh] max-w-4xl overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IconEdit size={20} />
                            {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
                        </div>
                        {/* Auto-save status indicator */}
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 text-xs">
                                {autoSaveStatus === 'saving' && (
                                    <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                        <span className="text-gray-500">Saving draft...</span>
                                    </>
                                )}
                                {autoSaveStatus === 'saved' && (
                                    <>
                                        <IconDeviceFloppy size={14} className="text-green-500" />
                                        <span className="text-green-600 dark:text-green-400">
                                            Draft saved
                                        </span>
                                    </>
                                )}
                                {autoSaveStatus === 'error' && (
                                    <>
                                        <IconAlertCircle size={14} className="text-red-500" />
                                        <span className="text-red-600 dark:text-red-400">
                                            Save failed
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Validation feedback */}
                {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        {validationResult.errors.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <IconAlertCircle size={14} className="text-red-500" />
                                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                        Issues to fix:
                                    </span>
                                </div>
                                {validationResult.errors.map((error, index) => (
                                    <p
                                        key={index}
                                        className="ml-4 text-xs text-red-600 dark:text-red-400"
                                    >
                                        • {error}
                                    </p>
                                ))}
                            </div>
                        )}
                        {validationResult.warnings.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <IconAlertCircle size={14} className="text-orange-500" />
                                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                        Suggestions:
                                    </span>
                                </div>
                                {validationResult.warnings.map((warning, index) => (
                                    <p
                                        key={index}
                                        className="ml-4 text-xs text-orange-600 dark:text-orange-400"
                                    >
                                        • {warning}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Prompt Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter a descriptive title for the prompt"
                            className={cn(
                                'w-full rounded-lg border px-3 py-2 text-sm',
                                'bg-white dark:bg-gray-800',
                                'border-gray-200 dark:border-gray-700',
                                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                            )}
                            maxLength={100}
                        />
                        <div className="text-xs text-gray-500">
                            {title.length}/100 characters (minimum 3 required)
                        </div>
                    </div>

                    {/* Short Prompt Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Display Prompt *
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Short, user-friendly version of the prompt"
                            className={cn(
                                'w-full rounded-lg border px-3 py-2 text-sm',
                                'bg-white dark:bg-gray-800',
                                'border-gray-200 dark:border-gray-700',
                                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                            )}
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-500">
                            {prompt.length}/200 characters (minimum 10 required)
                        </div>
                    </div>

                    {/* Description Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description *
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description of what this prompt does"
                            className={cn(
                                'min-h-[80px] w-full resize-y rounded-lg border px-3 py-2 text-sm',
                                'bg-white dark:bg-gray-800',
                                'border-gray-200 dark:border-gray-700',
                                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                            )}
                            rows={3}
                            maxLength={300}
                        />
                        <div className="text-xs text-gray-500">
                            {description.length}/300 characters (minimum 5 required)
                        </div>
                    </div>

                    {/* Full Prompt Editor */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Prompt *
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEnhancePrompt}
                                    className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40"
                                    title="Enhance for aviation context"
                                >
                                    <IconSparkles
                                        size={14}
                                        className="text-blue-600 dark:text-blue-400"
                                    />
                                    Enhance
                                </button>
                                <button
                                    onClick={togglePreviewMode}
                                    className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                >
                                    {isPreviewMode ? (
                                        <>
                                            <IconEdit size={14} />
                                            Edit
                                        </>
                                    ) : (
                                        <>
                                            <IconEye size={14} />
                                            Preview
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div
                            className={cn(
                                'rounded-lg border',
                                'border-gray-200 dark:border-gray-700',
                                'bg-white dark:bg-gray-800',
                                'max-h-[400px] min-h-[250px] overflow-y-auto'
                            )}
                        >
                            {isPreviewMode ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none p-3">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                fullPromptEditor?.getHTML() ||
                                                '<p class="text-gray-400 italic">No content</p>',
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <EditorContent
                                        editor={fullPromptEditor}
                                        className={cn(
                                            'min-h-[200px] focus-within:outline-none',
                                            '[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none',
                                            '[&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:h-0 [&_.is-editor-empty]:before:text-gray-400 [&_.is-editor-empty]:before:content-[attr(data-placeholder)]',
                                            '[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-bold',
                                            '[&_h2]:text-md [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:font-bold',
                                            '[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-bold',
                                            '[&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc',
                                            '[&_ol]:my-2 [&_ol]:ml-4 [&_ol]:list-decimal',
                                            '[&_li]:my-1',
                                            '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-2',
                                            '[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:dark:bg-gray-700'
                                        )}
                                    />

                                    {/* Editor Toolbar */}
                                    {fullPromptEditor && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-gray-50 p-1 shadow-sm dark:bg-gray-700">
                                            <button
                                                onClick={() =>
                                                    fullPromptEditor
                                                        .chain()
                                                        .focus()
                                                        .toggleBold()
                                                        .run()
                                                }
                                                className={cn(
                                                    'rounded p-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600',
                                                    fullPromptEditor.isActive('bold') &&
                                                        'bg-gray-300 dark:bg-gray-500'
                                                )}
                                            >
                                                <strong>B</strong>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fullPromptEditor
                                                        .chain()
                                                        .focus()
                                                        .toggleItalic()
                                                        .run()
                                                }
                                                className={cn(
                                                    'rounded p-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600',
                                                    fullPromptEditor.isActive('italic') &&
                                                        'bg-gray-300 dark:bg-gray-500'
                                                )}
                                            >
                                                <em>I</em>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fullPromptEditor
                                                        .chain()
                                                        .focus()
                                                        .toggleBulletList()
                                                        .run()
                                                }
                                                className={cn(
                                                    'rounded p-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600',
                                                    fullPromptEditor.isActive('bulletList') &&
                                                        'bg-gray-300 dark:bg-gray-500'
                                                )}
                                                title="Bullet List"
                                            >
                                                •
                                            </button>
                                            <button
                                                onClick={() =>
                                                    fullPromptEditor
                                                        .chain()
                                                        .focus()
                                                        .toggleOrderedList()
                                                        .run()
                                                }
                                                className={cn(
                                                    'rounded p-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600',
                                                    fullPromptEditor.isActive('orderedList') &&
                                                        'bg-gray-300 dark:bg-gray-500'
                                                )}
                                                title="Numbered List"
                                            >
                                                1.
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            This is the detailed prompt that will be sent to the AI agent. Use
                            markdown formatting for better structure.
                        </div>
                    </div>
                </div>

                {/* AI Enhancement Suggestions */}
                {enhancementSuggestions && (
                    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconSparkles
                                    size={16}
                                    className="text-blue-600 dark:text-blue-400"
                                />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Aviation Enhancement Suggestions
                                </span>
                            </div>
                            <button
                                onClick={() => setEnhancementSuggestions(null)}
                                className="rounded-md p-1 transition-colors hover:bg-blue-100 dark:hover:bg-blue-800/40"
                            >
                                <IconX size={14} className="text-blue-600 dark:text-blue-400" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                Suggested improvements:
                            </p>
                            {enhancementSuggestions.changes.map((change, index) => (
                                <p
                                    key={index}
                                    className="ml-4 text-xs text-blue-700 dark:text-blue-300"
                                >
                                    • {change}
                                </p>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={applyEnhancement}
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                Apply Changes
                            </button>
                            <button
                                onClick={() => setEnhancementSuggestions(null)}
                                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <button
                        onClick={handleClose}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            'inline-flex items-center gap-2',
                            isValid
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                        )}
                    >
                        <IconCheck size={16} />
                        {mode === 'create' ? 'Create Prompt' : 'Save Changes'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
