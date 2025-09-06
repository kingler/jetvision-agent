'use client';
import { Button } from '@repo/ui';
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    ServiceConfig,
    ServiceStatus,
    useServiceControlStore,
} from '../../store/service-control.store';
import { ServiceStatusIndicator } from './ServiceStatusIndicator';

interface ServiceToggleProps {
    serviceId: string;
    service: ServiceConfig;
    showConfirmation?: boolean;
    disabled?: boolean;
    className?: string;
}

export const ServiceToggle = ({
    serviceId,
    service,
    showConfirmation = true,
    disabled = false,
    className = '',
}: ServiceToggleProps) => {
    const [showDialog, setShowDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);

    const { toggleService, enableService, disableService, setServiceStatus } =
        useServiceControlStore();

    const handleToggleClick = () => {
        const newStatus = service.status === 'enabled' ? 'disabled' : 'enabled';

        if (showConfirmation) {
            setPendingAction(newStatus === 'enabled' ? 'enable' : 'disable');
            setShowDialog(true);
        } else {
            toggleService(serviceId);
        }
    };

    const handleConfirm = () => {
        if (pendingAction === 'enable') {
            enableService(serviceId);
        } else if (pendingAction === 'disable') {
            disableService(serviceId);
        }
        setShowDialog(false);
        setPendingAction(null);
    };

    const handleCancel = () => {
        setShowDialog(false);
        setPendingAction(null);
    };

    const isLoading = service.status === 'loading';
    const isToggleable = ['enabled', 'disabled', 'error'].includes(service.status);

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="bg-background flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                    <ServiceStatusIndicator status={service.status} size="md" />
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium">{service.name}</h3>
                        <p className="text-muted-foreground text-xs">Service ID: {serviceId}</p>
                        {service.errorMessage && (
                            <p className="mt-1 text-xs text-red-500">{service.errorMessage}</p>
                        )}
                        {service.lastHealthCheck && (
                            <p className="text-muted-foreground text-xs">
                                Last check: {new Date(service.lastHealthCheck).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={service.status === 'enabled' ? 'destructive' : 'default'}
                        size="sm"
                        disabled={disabled || isLoading || !isToggleable}
                        onClick={handleToggleClick}
                    >
                        {isLoading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="h-4 w-4"
                            >
                                🔄
                            </motion.div>
                        ) : service.status === 'enabled' ? (
                            'Disable'
                        ) : (
                            'Enable'
                        )}
                    </Button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showDialog && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCancel}
                    >
                        <motion.div
                            className="bg-background mx-4 max-w-md rounded-lg border p-6 shadow-lg"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <IconAlertTriangle className="text-yellow-500" size={24} />
                                <h3 className="text-lg font-semibold">
                                    {pendingAction === 'enable' ? 'Enable' : 'Disable'} Service
                                </h3>
                            </div>

                            <p className="text-muted-foreground mb-6">
                                Are you sure you want to {pendingAction} the{' '}
                                <strong>{service.name}</strong> service?
                                {pendingAction === 'disable' && (
                                    <span className="mt-2 block text-sm text-red-600">
                                        This will hide all related prompts and workflows from the
                                        interface.
                                    </span>
                                )}
                            </p>

                            <div className="flex justify-end gap-3">
                                <Button variant="outlined" onClick={handleCancel}>
                                    <IconX size={16} className="mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    variant={pendingAction === 'enable' ? 'default' : 'destructive'}
                                    onClick={handleConfirm}
                                >
                                    <IconCheck size={16} className="mr-2" />
                                    {pendingAction === 'enable' ? 'Enable' : 'Disable'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
