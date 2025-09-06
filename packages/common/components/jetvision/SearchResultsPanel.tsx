'use client';
import React from 'react';
import { cn, Skeleton } from '@repo/ui';
import {
    IconX,
    IconExternalLink,
    IconUser,
    IconBuilding,
    IconMail,
    IconPhone,
    IconPlane,
    IconCalendar,
    IconCurrencyDollar,
    IconChevronRight,
    IconDatabase,
    IconRefresh,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchResult {
    id: string;
    type: 'contact' | 'aircraft' | 'campaign' | 'flight';
    title: string;
    subtitle?: string;
    metadata?: Record<string, any>;
    timestamp?: string;
    score?: number;
}

interface SearchResultsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    results: SearchResult[];
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
    onSelectResult?: (result: SearchResult) => void;
    className?: string;
}

const ResultCard: React.FC<{ result: SearchResult; onClick?: () => void }> = ({
    result,
    onClick,
}) => {
    const getIcon = () => {
        switch (result.type) {
            case 'contact':
                return IconUser;
            case 'aircraft':
                return IconPlane;
            case 'campaign':
                return IconMail;
            case 'flight':
                return IconCalendar;
            default:
                return IconDatabase;
        }
    };

    const Icon = getIcon();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            whileHover={{ scale: 1.02 }}
            className="group"
        >
            <button
                onClick={onClick}
                className="border-border bg-card hover:border-brand/50 w-full rounded-lg border p-4 text-left transition-all hover:shadow-md"
            >
                <div className="flex items-start gap-3">
                    <div className="bg-secondary group-hover:bg-brand/10 rounded-md p-2">
                        <Icon size={18} className="text-muted-foreground group-hover:text-brand" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="text-foreground group-hover:text-brand font-medium">
                            {result.title}
                        </h4>
                        {result.subtitle && (
                            <p className="text-muted-foreground text-sm">{result.subtitle}</p>
                        )}
                        {result.metadata && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(result.metadata)
                                    .slice(0, 3)
                                    .map(([key, value]) => (
                                        <span
                                            key={key}
                                            className="bg-secondary inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                                        >
                                            <span className="text-muted-foreground">{key}:</span>
                                            <span className="font-medium">{String(value)}</span>
                                        </span>
                                    ))}
                            </div>
                        )}
                        {result.score && (
                            <div className="mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">
                                        Match Score
                                    </span>
                                    <div className="bg-secondary h-1.5 w-20 rounded-full">
                                        <div
                                            className="bg-brand h-full rounded-full"
                                            style={{ width: `${result.score}%` }}
                                        />
                                    </div>
                                    <span className="text-brand text-xs font-medium">
                                        {result.score}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <IconChevronRight
                        size={16}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                </div>
            </button>
        </motion.div>
    );
};

export const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
    isOpen,
    onClose,
    results,
    loading = false,
    error,
    onRefresh,
    onSelectResult,
    className,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={cn(
                            'bg-background fixed right-0 top-0 z-50 h-full w-full shadow-xl lg:w-[420px]',
                            'border-border border-l',
                            className
                        )}
                    >
                        <div className="flex h-full flex-col">
                            {/* Header */}
                            <div className="border-border flex items-center justify-between border-b p-4">
                                <div className="flex items-center gap-2">
                                    <IconDatabase size={20} className="text-brand" />
                                    <h3 className="text-foreground font-semibold">
                                        Search Results
                                    </h3>
                                    {results.length > 0 && !loading && (
                                        <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs font-medium">
                                            {results.length} found
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {onRefresh && (
                                        <button
                                            onClick={onRefresh}
                                            className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                                            disabled={loading}
                                        >
                                            <IconRefresh
                                                size={18}
                                                className={cn(loading && 'animate-spin')}
                                            />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                                    >
                                        <IconX size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="border-border bg-card rounded-lg border p-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-md" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="h-3 w-1/2" />
                                                        <div className="flex gap-2">
                                                            <Skeleton className="h-5 w-16 rounded-full" />
                                                            <Skeleton className="h-5 w-20 rounded-full" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : error ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <div className="bg-destructive/10 rounded-lg p-4">
                                            <p className="text-destructive text-sm">{error}</p>
                                        </div>
                                        {onRefresh && (
                                            <button
                                                onClick={onRefresh}
                                                className="bg-brand text-brand-foreground hover:bg-brand/90 mt-4 rounded-md px-4 py-2 text-sm font-medium"
                                            >
                                                Try Again
                                            </button>
                                        )}
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <IconDatabase
                                            size={48}
                                            className="text-muted-foreground/30"
                                        />
                                        <p className="text-muted-foreground mt-2 text-sm">
                                            No results found
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            Try adjusting your search query
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <AnimatePresence mode="popLayout">
                                            {results.map(result => (
                                                <ResultCard
                                                    key={result.id}
                                                    result={result}
                                                    onClick={() => onSelectResult?.(result)}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {results.length > 0 && !loading && !error && (
                                <div className="border-border border-t p-4">
                                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                                        <span>Powered by n8n & JetVision Agent</span>
                                        <button className="hover:text-brand flex items-center gap-1">
                                            <span>View All</span>
                                            <IconExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
