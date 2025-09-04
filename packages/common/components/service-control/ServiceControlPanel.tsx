'use client';
import { Button } from '@repo/ui';
import { IconSettings, IconRefresh, IconPower, IconPowerOff } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useServiceControlStore } from '../../store/service-control.store';
import { ServiceToggle } from './ServiceToggle';
import { ServiceStatusIndicator } from './ServiceStatusIndicator';
import { ServiceHealthCheck } from './ServiceHealthCheck';

interface ServiceControlPanelProps {
    className?: string;
    showBulkActions?: boolean;
    showHealthChecks?: boolean;
}

export const ServiceControlPanel = ({
    className = '',
    showBulkActions = true,
    showHealthChecks = true,
}: ServiceControlPanelProps) => {
    const {
        services,
        isInitialized,
        initializeServices,
        enableAllServices,
        disableAllServices,
        performAllHealthChecks,
        getAvailableServices,
    } = useServiceControlStore();

    const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);
    const [lastHealthCheckTime, setLastHealthCheckTime] = useState<Date | null>(null);

    // Initialize services on mount
    useEffect(() => {
        if (!isInitialized) {
            initializeServices();
        }
    }, [isInitialized, initializeServices]);

    const servicesList = Object.entries(services);
    const enabledServicesCount = getAvailableServices().length;
    const totalServicesCount = servicesList.length;

    const handleEnableAll = async () => {
        setIsPerformingBulkAction(true);
        try {
            enableAllServices();
            if (showHealthChecks) {
                await performAllHealthChecks();
                setLastHealthCheckTime(new Date());
            }
        } finally {
            setIsPerformingBulkAction(false);
        }
    };

    const handleDisableAll = async () => {
        setIsPerformingBulkAction(true);
        try {
            disableAllServices();
        } finally {
            setIsPerformingBulkAction(false);
        }
    };

    const handleHealthCheckAll = async () => {
        setIsPerformingBulkAction(true);
        try {
            await performAllHealthChecks();
            setLastHealthCheckTime(new Date());
        } finally {
            setIsPerformingBulkAction(false);
        }
    };

    if (!isInitialized) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <IconSettings size={24} />
                    </motion.div>
                    <span className="text-muted-foreground">Initializing service control...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Service Control</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage Apollo, Avinode, and N8N service availability
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <ServiceStatusIndicator 
                        status={enabledServicesCount > 0 ? 'enabled' : 'disabled'} 
                        showLabel 
                        size="md"
                    />
                    <span className="text-sm text-muted-foreground">
                        {enabledServicesCount}/{totalServicesCount} services active
                    </span>
                </div>
            </div>

            {/* Bulk Actions Section */}
            {showBulkActions && (
                <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Bulk Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleEnableAll}
                            disabled={isPerformingBulkAction || enabledServicesCount === totalServicesCount}
                        >
                            <IconPower size={16} className="mr-2" />
                            Enable All Services
                        </Button>
                        
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDisableAll}
                            disabled={isPerformingBulkAction || enabledServicesCount === 0}
                        >
                            <IconPowerOff size={16} className="mr-2" />
                            Disable All Services
                        </Button>
                        
                        {showHealthChecks && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleHealthCheckAll}
                                disabled={isPerformingBulkAction || enabledServicesCount === 0}
                            >
                                <motion.div
                                    animate={isPerformingBulkAction ? { rotate: 360 } : {}}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                >
                                    <IconRefresh size={16} className="mr-2" />
                                </motion.div>
                                Check All Services
                            </Button>
                        )}
                    </div>
                    
                    {lastHealthCheckTime && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Last health check: {lastHealthCheckTime.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            )}

            {/* Service List Section */}
            <div className="space-y-4">
                <h3 className="font-medium">Individual Services</h3>
                {servicesList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <IconSettings size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No services configured</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {servicesList.map(([serviceId, service]) => (
                            <motion.div
                                key={serviceId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ServiceToggle
                                    serviceId={serviceId}
                                    service={service}
                                    disabled={isPerformingBulkAction}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Health Monitoring Section */}
            {showHealthChecks && (
                <div className="space-y-4">
                    <h3 className="font-medium">Service Health Monitoring</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.keys(services)
                            .filter(serviceId => serviceId !== 'n8n') // N8N is always healthy
                            .map(serviceId => (
                            <ServiceHealthCheck
                                key={serviceId}
                                serviceId={serviceId}
                                autoRefresh={true}
                                refreshInterval={5 * 60 * 1000} // 5 minutes
                                showDetails={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Service Dependencies Section */}
            <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-3">Service Information</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Apollo.io:</span>
                        <span>Lead generation and contact discovery</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Avinode:</span>
                        <span>Aviation marketplace and charter booking</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">N8N:</span>
                        <span>Workflow automation and integrations</span>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Disabling services will hide their related prompts and workflows 
                        from the interface. Users will not be able to access disabled service functionality.
                    </p>
                </div>
            </div>
        </div>
    );
};