'use client';
import React from 'react';
import { cn } from '@repo/ui';
import {
    IconLoader2,
    IconCheck,
    IconX,
    IconClock,
    IconDatabase,
    IconMail,
    IconPlane,
    IconSearch,
    IconSparkles,
    IconBrain,
} from '@tabler/icons-react';

export interface WorkflowStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    description?: string;
    startTime?: Date;
    endTime?: Date;
    tool?: 'apollo' | 'avinode' | 'gmail' | 'search' | 'knowledge' | 'agent';
}

interface WorkflowStatusProps {
    steps: WorkflowStep[];
    currentStep?: string;
    className?: string;
}

const StepIcon: React.FC<{ tool?: string; status?: string }> = ({ tool, status }) => {
    const iconProps = { size: 16, strokeWidth: 2 };

    const getIconElement = () => {
        if (status === 'completed') {
            return <IconCheck {...iconProps} className="text-green-500" />;
        }

        if (status === 'error') {
            return <IconX {...iconProps} className="text-red-500" />;
        }

        // Tool-specific icons
        switch (tool) {
            case 'apollo':
                return <IconDatabase {...iconProps} className="text-blue-500" />;
            case 'avinode':
                return <IconPlane {...iconProps} className="text-purple-500" />;
            case 'gmail':
                return <IconMail {...iconProps} className="text-red-500" />;
            case 'search':
                return <IconSearch {...iconProps} className="text-green-500" />;
            case 'knowledge':
                return <IconBrain {...iconProps} className="text-indigo-500" />;
            case 'agent':
                return <IconSparkles {...iconProps} className="text-yellow-500" />;
            default:
                return status === 'running' ? (
                    <IconLoader2 {...iconProps} className="animate-spin text-purple-500" />
                ) : (
                    <IconClock {...iconProps} className="text-gray-400" />
                );
        }
    };

    return <div className="flex flex-shrink-0 items-center justify-center">{getIconElement()}</div>;
};

const getStepColor = (status: string) => {
    switch (status) {
        case 'running':
            return 'text-foreground';
        case 'completed':
            return 'text-foreground';
        case 'error':
            return 'text-foreground';
        case 'pending':
        default:
            return 'text-gray-600';
    }
};

const ProgressBar: React.FC<{ steps: WorkflowStep[] }> = ({ steps }) => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const runningSteps = steps.filter(s => s.status === 'running').length;
    const totalSteps = steps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;
    const runningPercentage = ((completedSteps + runningSteps) / totalSteps) * 100;

    return (
        <div className="bg-secondary/50 mb-4 h-1 w-full overflow-hidden rounded-full">
            <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
            />
            {runningSteps > 0 && (
                <div
                    className="absolute top-0 h-full rounded-full bg-gradient-to-r from-purple-400/60 to-pink-400/60 transition-all duration-500"
                    style={{ width: `${runningPercentage}%` }}
                />
            )}
        </div>
    );
};

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
    steps,
    currentStep,
    className,
}) => {
    if (!steps || steps.length === 0) {
        return null;
    }

    const hasActiveSteps = steps.some(s => s.status === 'running' || s.status === 'pending');
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const totalCount = steps.length;

    return (
        <div
            className={cn(
                'animate-in slide-in-from-top-2 w-full space-y-3 duration-300',
                className
            )}
        >
            {/* Header with animated thinking indicator */}
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <IconSparkles
                    size={16}
                    className={cn('text-brand', hasActiveSteps && 'animate-pulse')}
                />
                <span>
                    {hasActiveSteps
                        ? 'JetVision is processing your request...'
                        : `Workflow completed (${completedCount}/${totalCount} steps)`}
                </span>
            </div>

            {/* Progress bar */}
            <ProgressBar steps={steps} />

            {/* Steps list */}
            <div className="space-y-1">
                {steps.map((step, index) => {
                    const isActive = step.status === 'running';
                    const isCompleted = step.status === 'completed';
                    const hasError = step.status === 'error';

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300',
                                {
                                    'border border-purple-200/50 bg-purple-50/50 shadow-sm':
                                        isActive,
                                    'border border-green-200/50 bg-green-50/50': isCompleted,
                                    'border border-red-200/50 bg-red-50/50': hasError,
                                    'hover:bg-secondary/30': !isActive && !isCompleted && !hasError,
                                },
                                getStepColor(step.status)
                            )}
                        >
                            <StepIcon tool={step.tool} status={step.status} />

                            <div className="flex-1">
                                <span
                                    className={cn(
                                        'text-foreground text-sm font-medium',
                                        isActive && 'animate-pulse'
                                    )}
                                >
                                    {step.name}
                                </span>

                                {step.description && (
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {step.description}
                                    </p>
                                )}
                            </div>

                            {/* Duration indicator */}
                            {step.startTime && step.endTime && (
                                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <IconClock size={12} />
                                    {(
                                        (step.endTime.getTime() - step.startTime.getTime()) /
                                        1000
                                    ).toFixed(1)}
                                    s
                                </div>
                            )}

                            {/* Active processing indicator */}
                            {isActive && (
                                <div className="flex items-center gap-1 text-xs text-purple-600">
                                    <div className="h-1 w-1 animate-pulse rounded-full bg-purple-500" />
                                    <span>Processing...</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer status */}
            {hasActiveSteps && (
                <div className="border-border/50 border-t pt-2">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                        <div className="bg-brand h-2 w-2 animate-pulse rounded-full" />
                        JetVision is coordinating with multiple systems to provide you with the most
                        comprehensive response...
                    </p>
                </div>
            )}
        </div>
    );
};

// Helper function to generate dynamic workflow steps based on user prompt
export const generateDynamicSteps = (
    userPrompt: string
): Array<{ id: string; name: string; tool: WorkflowStep['tool'] }> => {
    const prompt = userPrompt.toLowerCase();
    const steps = [];

    // Always start with request processing
    steps.push({ id: 'webhook', name: 'Processing Your Request', tool: 'agent' as const });

    // Lead generation related tasks
    if (
        prompt.includes('lead') ||
        prompt.includes('prospect') ||
        prompt.includes('contact') ||
        prompt.includes('apollo')
    ) {
        steps.push({ id: 'apollo', name: 'Searching Apollo.io Database', tool: 'apollo' as const });
        if (
            prompt.includes('email') ||
            prompt.includes('campaign') ||
            prompt.includes('outreach')
        ) {
            steps.push({
                id: 'campaign',
                name: 'Preparing Email Campaign',
                tool: 'gmail' as const,
            });
        }
    }

    // Aircraft/fleet related tasks
    if (
        prompt.includes('aircraft') ||
        prompt.includes('jet') ||
        prompt.includes('flight') ||
        prompt.includes('charter') ||
        prompt.includes('avinode')
    ) {
        steps.push({
            id: 'avinode',
            name: 'Checking Aircraft Availability',
            tool: 'avinode' as const,
        });
        if (prompt.includes('quote') || prompt.includes('price') || prompt.includes('cost')) {
            steps.push({
                id: 'pricing',
                name: 'Calculating Charter Quotes',
                tool: 'avinode' as const,
            });
        }
    }

    // Search/knowledge tasks
    if (
        prompt.includes('search') ||
        prompt.includes('find') ||
        prompt.includes('information') ||
        prompt.includes('knowledge')
    ) {
        steps.push({
            id: 'knowledge',
            name: 'Searching Knowledge Base',
            tool: 'knowledge' as const,
        });
    }

    // Always end with response generation
    steps.push({ id: 'response', name: 'Generating Your Response', tool: 'agent' as const });

    return steps;
};

// Enhanced status parser with better state management
export const parseN8nStatusToSteps = (
    statusData: any,
    userPrompt?: string,
    existingSteps?: WorkflowStep[]
): WorkflowStep[] => {
    // Generate dynamic steps based on user prompt, fallback to default
    const dynamicSteps = userPrompt
        ? generateDynamicSteps(userPrompt)
        : [
              { id: 'webhook', name: 'Receiving Request', tool: 'agent' as const },
              { id: 'agent', name: 'JetVision Agent Processing', tool: 'agent' as const },
              { id: 'apollo', name: 'Apollo.io Lead Generation', tool: 'apollo' as const },
              { id: 'avinode', name: 'Avainode Fleet Data', tool: 'avinode' as const },
              { id: 'knowledge', name: 'Knowledge Base Search', tool: 'knowledge' as const },
              { id: 'response', name: 'Generating Response', tool: 'agent' as const },
          ];

    // Preserve existing step states and timing information
    const steps: WorkflowStep[] = dynamicSteps.map((stepTemplate, index) => {
        const existingStep = existingSteps?.find(s => s.id === stepTemplate.id);
        let status: WorkflowStep['status'] = existingStep?.status || 'pending';
        let description = existingStep?.description || '';
        let startTime = existingStep?.startTime;
        let endTime = existingStep?.endTime;

        // Update status based on current workflow state
        if (statusData?.status) {
            const currentTime = new Date();

            switch (statusData.status) {
                case 'connecting':
                    if (index === 0 && status === 'pending') {
                        status = 'running';
                        description = 'Establishing connection to JetVision workflow...';
                        startTime = currentTime;
                    }
                    break;

                case 'executing':
                case 'running':
                    // Progress through steps sequentially
                    if (index < 2 && status !== 'completed') {
                        if (existingStep?.status !== 'completed') {
                            status = 'completed';
                            endTime = currentTime;
                        }
                    } else if (index === 2 && status === 'pending') {
                        status = 'running';
                        description = 'Analyzing your request and determining the best approach...';
                        startTime = currentTime;
                    }
                    break;

                case 'success':
                    // Mark all steps as completed
                    if (status !== 'completed') {
                        status = 'completed';
                        endTime = currentTime;
                        description = 'Task completed successfully';
                    }
                    break;

                case 'error':
                    // Handle error state
                    if (index <= 2 && status === 'running') {
                        status = 'error';
                        endTime = currentTime;
                        description = 'An error occurred during processing';
                    } else if (index <= 1 && status !== 'completed') {
                        status = 'completed';
                        endTime = currentTime;
                    }
                    break;
            }
        }

        return {
            id: stepTemplate.id,
            name: stepTemplate.name,
            tool: stepTemplate.tool,
            status,
            description,
            startTime: startTime || (status !== 'pending' ? new Date() : undefined),
            endTime: endTime || (status === 'completed' ? new Date() : undefined),
        };
    });

    return steps;
};
