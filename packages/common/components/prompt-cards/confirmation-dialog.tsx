'use client';

import React from 'react';
import { cn, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@repo/ui';
import { IconAlertTriangle, IconTrash, IconCheck, IconX } from '@tabler/icons-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    promptTitle?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    promptTitle,
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: IconTrash,
                    iconColor: 'text-red-500',
                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
                };
            case 'warning':
                return {
                    icon: IconAlertTriangle,
                    iconColor: 'text-orange-500',
                    confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white',
                };
            case 'info':
            default:
                return {
                    icon: IconCheck,
                    iconColor: 'text-blue-500',
                    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
                };
        }
    };

    const { icon: Icon, iconColor, confirmButton } = getVariantStyles();

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent ariaTitle={title} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Icon size={24} className={iconColor} />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>

                    {promptTitle && (
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                Prompt Title:
                            </div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                {promptTitle}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            confirmButton
                        )}
                    >
                        {confirmText}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
