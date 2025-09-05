'use client';
import { Button } from '@repo/ui';
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ServiceConfig, ServiceStatus, useServiceControlStore } from '../../store/service-control.store';
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
    
    const { toggleService, enableService, disableService, setServiceStatus } = useServiceControlStore();

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
            <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div className="flex items-center gap-3">
                    <ServiceStatusIndicator status={service.status} size="md" />
                    <div className="flex flex-col">
                        <h3 className="font-medium text-sm">{service.name}</h3>
                        <p className="text-xs text-muted-foreground">
                            Service ID: {serviceId}
                        </p>
                        {service.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">
                                {service.errorMessage}
                            </p>
                        )}
                        {service.lastHealthCheck && (
                            <p className="text-xs text-muted-foreground">
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
                                className="w-4 h-4"
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCancel}
                    >
                        <motion.div
                            className="bg-background border rounded-lg shadow-lg p-6 max-w-md mx-4"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <IconAlertTriangle className="text-yellow-500" size={24} />
                                <h3 className="font-semibold text-lg">
                                    {pendingAction === 'enable' ? 'Enable' : 'Disable'} Service
                                </h3>
                            </div>
                            
                            <p className="text-muted-foreground mb-6">
                                Are you sure you want to {pendingAction} the <strong>{service.name}</strong> service?
                                {pendingAction === 'disable' && (
                                    <span className="block mt-2 text-sm text-red-600">
                                        This will hide all related prompts and workflows from the interface.
                                    </span>
                                )}
                            </p>

                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outlined"
                                    onClick={handleCancel}
                                >
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