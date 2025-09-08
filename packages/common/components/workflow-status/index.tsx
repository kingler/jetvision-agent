/**
 * Workflow Status Components
 * 
 * UI components for displaying n8n workflow execution status,
 * progress updates, and results within the chat interface.
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui';
import { 
    IconLoader2, 
    IconCheck, 
    IconX, 
    IconAlertTriangle,
    IconClock,
    IconBrain,
    IconDatabase,
    IconMail,
    IconChartBar,
    IconNorthStar,
} from '@tabler/icons-react';

// Type imports would be properly set up in production
export interface WorkflowSelection {
    workflowType: string;
    intent: string;
    confidence: number;
    reasoning: string;
    expectedDuration: number;
}

export interface WorkflowProgressUpdate {
    executionId: string;
    status: string;
    progress: number;
    message: string;
    currentStep: string;
    timestamp: string;
}

export interface WorkflowResult {
    executionId: string;
    status: 'success' | 'error';
    workflowType: string;
    result?: {
        text: string;
        structured?: any;
        sources?: string[];
    };
    error?: {
        message: string;
        category: string;
        recoverable: boolean;
        details?: string;
    };
    duration: number;
}

export type WorkflowType = 'jetvision-agent-v1' | 'jetvision-agent-v2-lead-gen' | 'jetvision-agent-v3-aviation-leads';
export type UserIntentCategory = 'lead_generation' | 'market_analysis' | 'competitive_intelligence' | 'client_research' | 'aircraft_search' | 'route_planning' | 'price_analysis' | 'general_aviation';

export interface WorkflowStatusIndicatorProps {
    selection?: WorkflowSelection;
    progress?: WorkflowProgressUpdate;
    result?: WorkflowResult;
    isVisible?: boolean;
    className?: string;
}

/**
 * Main Workflow Status Indicator Component
 */
export const WorkflowStatusIndicator: React.FC<WorkflowStatusIndicatorProps> = ({
    selection,
    progress,
    result,
    isVisible = true,
    className,
}) => {
    if (!isVisible || (!selection && !progress && !result)) {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="workflow-status"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={cn(
                    "workflow-status-indicator rounded-lg border bg-card p-4 shadow-sm",
                    "border-border/50 bg-gradient-to-br from-background to-background/50",
                    className
                )}
            >
                {/* Workflow Selection Display */}
                {selection && !result && (
                    <WorkflowSelectionDisplay selection={selection} />
                )}

                {/* Progress Display */}
                {progress && !result && (
                    <WorkflowProgressDisplay progress={progress} />
                )}

                {/* Result Display */}
                {result && (
                    <WorkflowResultDisplay result={result} />
                )}
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * Workflow Selection Display Component
 */
export const WorkflowSelectionDisplay: React.FC<{
    selection: WorkflowSelection;
    showDetails?: boolean;
}> = ({ selection, showDetails = true }) => {
    const workflowIcon = getWorkflowIcon(selection.workflowType);
    const intentIcon = getIntentIcon(selection.intent);
    const confidenceColor = getConfidenceColor(selection.confidence);

    return (
        <div className="workflow-selection-display space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {workflowIcon}
                    <h4 className="font-semibold text-sm text-foreground">
                        Intelligent Workflow Selection
                    </h4>
                </div>
                <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    confidenceColor
                )}>
                    {(selection.confidence * 100).toFixed(0)}% confidence
                </div>
            </div>

            {showDetails && (
                <div className="space-y-2 text-sm">
                    {/* Workflow Type */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[80px]">
                            Workflow:
                        </span>
                        <div className="flex items-center gap-2">
                            {workflowIcon}
                            <span className="font-medium">
                                {getWorkflowDisplayName(selection.workflowType)}
                            </span>
                        </div>
                    </div>

                    {/* Intent */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[80px]">
                            Intent:
                        </span>
                        <div className="flex items-center gap-2">
                            {intentIcon}
                            <span>{getIntentDisplayName(selection.intent)}</span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[80px]">
                            Duration:
                        </span>
                        <div className="flex items-center gap-1">
                            <IconClock size={14} className="text-muted-foreground" />
                            <span>~{selection.expectedDuration}s</span>
                        </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mt-3 p-2 bg-muted/30 rounded border-l-2 border-blue-500/30">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {selection.reasoning}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Workflow Progress Display Component
 */
export const WorkflowProgressDisplay: React.FC<{
    progress: WorkflowProgressUpdate;
    showDetails?: boolean;
}> = ({ progress, showDetails = true }) => {
    const stepIcon = getStepIcon(progress.currentStep);
    
    return (
        <div className="workflow-progress-display space-y-3">
            {/* Progress Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: progress.status === 'connecting' ? 360 : 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <IconLoader2 size={16} className="text-blue-500" />
                    </motion.div>
                    <h4 className="font-semibold text-sm text-foreground">
                        Processing Request
                    </h4>
                </div>
                <span className="text-xs text-muted-foreground">
                    {progress.progress}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
                {/* Animated shimmer effect */}
                <motion.div
                    className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            </div>

            {showDetails && (
                <div className="space-y-2">
                    {/* Current Step */}
                    <div className="flex items-center gap-2 text-sm">
                        {stepIcon}
                        <span className="font-medium capitalize">
                            {progress.currentStep.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Status Message */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {progress.message}
                    </p>

                    {/* Execution ID (for debugging) */}
                    {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs font-mono text-muted-foreground/70">
                            ID: {progress.executionId}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Workflow Result Display Component
 */
export const WorkflowResultDisplay: React.FC<{
    result: WorkflowResult;
    showDetails?: boolean;
}> = ({ result, showDetails = true }) => {
    const isSuccess = result.status === 'success';
    const statusIcon = isSuccess ? (
        <IconCheck size={16} className="text-green-500" />
    ) : (
        <IconX size={16} className="text-red-500" />
    );

    return (
        <div className="workflow-result-display space-y-3">
            {/* Result Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {statusIcon}
                    <h4 className={cn(
                        "font-semibold text-sm",
                        isSuccess ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                    )}>
                        {isSuccess ? "Workflow Completed" : "Workflow Failed"}
                    </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconClock size={12} />
                    <span>{(result.duration / 1000).toFixed(1)}s</span>
                </div>
            </div>

            {showDetails && (
                <div className="space-y-2">
                    {/* Success Result */}
                    {isSuccess && result.result && (
                        <div className="space-y-2">
                            {/* Structured Data Preview */}
                            {result.result.structured && (
                                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border-l-2 border-green-500/30">
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                        Structured Result:
                                    </p>
                                    <pre className="text-xs text-green-600 dark:text-green-400 overflow-x-auto">
                                        {JSON.stringify(result.result.structured, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Sources */}
                            {result.result.sources && result.result.sources.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Data Sources:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {result.result.sources.map((source, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                                            >
                                                {source}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Details */}
                    {!isSuccess && result.error && (
                        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-2 border-red-500/30">
                            <div className="flex items-start gap-2">
                                <IconAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                                        {result.error.message}
                                    </p>
                                    {result.error.details && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {result.error.details}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={cn(
                                            "px-2 py-0.5 text-xs rounded",
                                            result.error.recoverable 
                                                ? "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300"
                                                : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                                        )}>
                                            {result.error.category}
                                        </span>
                                        {result.error.recoverable && (
                                            <span className="text-xs text-muted-foreground">
                                                Retry possible
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Utility Functions
 */

function getWorkflowIcon(workflowType: WorkflowType) {
    const iconProps = { size: 16, className: "text-blue-500" };
    
    switch (workflowType) {
        case 'jetvision-agent-v1':
            return <IconBrain {...iconProps} />;
        case 'jetvision-agent-v2-lead-gen':
            return <IconDatabase {...iconProps} />;
        case 'jetvision-agent-v3-aviation-leads':
            return <IconNorthStar {...iconProps} />;
        default:
            return <IconBrain {...iconProps} />;
    }
}

function getIntentIcon(intent: UserIntentCategory) {
    const iconProps = { size: 14, className: "text-muted-foreground" };
    
    switch (intent) {
        case 'lead_generation':
            return <IconDatabase {...iconProps} />;
        case 'market_analysis':
            return <IconChartBar {...iconProps} />;
        case 'competitive_intelligence':
            return <IconChartBar {...iconProps} />;
        case 'client_research':
            return <IconDatabase {...iconProps} />;
        default:
            return <IconBrain {...iconProps} />;
    }
}

function getStepIcon(step: string) {
    const iconProps = { size: 14, className: "text-blue-500" };
    
    switch (step) {
        case 'connecting':
        case 'webhook':
            return <IconLoader2 {...iconProps} />;
        case 'apollo':
        case 'knowledge':
            return <IconDatabase {...iconProps} />;
        case 'agent':
        case 'response':
            return <IconBrain {...iconProps} />;
        case 'completed':
            return <IconCheck {...iconProps} className="text-green-500" />;
        case 'error':
            return <IconX {...iconProps} className="text-red-500" />;
        default:
            return <IconClock {...iconProps} />;
    }
}

function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) {
        return "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300";
    } else if (confidence >= 0.6) {
        return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300";
    } else {
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300";
    }
}

function getWorkflowDisplayName(workflowType: WorkflowType): string {
    switch (workflowType) {
        case 'jetvision-agent-v1':
            return 'Base Aviation Agent';
        case 'jetvision-agent-v2-lead-gen':
            return 'Lead Generation';
        case 'jetvision-agent-v3-aviation-leads':
            return 'Enhanced Aviation Leads';
        default:
            return 'Unknown Workflow';
    }
}

function getIntentDisplayName(intent: UserIntentCategory): string {
    return intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}