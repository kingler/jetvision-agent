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
    IconRefresh
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

const ResultCard: React.FC<{ result: SearchResult; onClick?: () => void }> = ({ result, onClick }) => {
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
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-brand/50 hover:shadow-md"
            >
                <div className="flex items-start gap-3">
                    <div className="rounded-md bg-secondary p-2 group-hover:bg-brand/10">
                        <Icon size={18} className="text-muted-foreground group-hover:text-brand" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="font-medium text-foreground group-hover:text-brand">
                            {result.title}
                        </h4>
                        {result.subtitle && (
                            <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                        )}
                        {result.metadata && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                                    <span
                                        key={key}
                                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs"
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
                                    <span className="text-xs text-muted-foreground">Match Score</span>
                                    <div className="h-1.5 w-20 rounded-full bg-secondary">
                                        <div 
                                            className="h-full rounded-full bg-brand"
                                            style={{ width: `${result.score}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-brand">{result.score}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <IconChevronRight size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
    className
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
                            "fixed right-0 top-0 z-50 h-full w-full bg-background shadow-xl lg:w-[420px]",
                            "border-l border-border",
                            className
                        )}
                    >
                        <div className="flex h-full flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border p-4">
                                <div className="flex items-center gap-2">
                                    <IconDatabase size={20} className="text-brand" />
                                    <h3 className="font-semibold text-foreground">Search Results</h3>
                                    {results.length > 0 && !loading && (
                                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                                            {results.length} found
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {onRefresh && (
                                        <button
                                            onClick={onRefresh}
                                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                            disabled={loading}
                                        >
                                            <IconRefresh size={18} className={cn(loading && "animate-spin")} />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                                            <div key={i} className="rounded-lg border border-border bg-card p-4">
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
                                        <div className="rounded-lg bg-destructive/10 p-4">
                                            <p className="text-sm text-destructive">{error}</p>
                                        </div>
                                        {onRefresh && (
                                            <button
                                                onClick={onRefresh}
                                                className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
                                            >
                                                Try Again
                                            </button>
                                        )}
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <IconDatabase size={48} className="text-muted-foreground/30" />
                                        <p className="mt-2 text-sm text-muted-foreground">No results found</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search query</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <AnimatePresence mode="popLayout">
                                            {results.map((result) => (
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
                                <div className="border-t border-border p-4">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Powered by n8n & JetVision Agent</span>
                                        <button className="flex items-center gap-1 hover:text-brand">
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