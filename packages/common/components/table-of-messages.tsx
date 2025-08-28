import { useChatStore } from '@repo/common/store';
import { Button, cn, Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { formatDisplayText } from '@repo/shared/utils';

export const TableOfMessages = () => {
    const { threadId } = useParams();
    const currentThreadId = threadId?.toString() ?? '';
    const [isHovering, setIsHovering] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const previousThreadItems = useChatStore(
        useShallow(state => state.getPreviousThreadItems(currentThreadId))
    );
    const currentThreadItem = useChatStore(
        useShallow(state => state.getCurrentThreadItem(currentThreadId))
    );
    const activeItemId = useChatStore(state => state.activeThreadItemView);
    const allItems = [...previousThreadItems, currentThreadItem].filter(Boolean);

    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    if (allItems?.length <= 1) {
        return null;
    }

    return (
        <div
            className="absolute left-4 top-1/2 z-[10] flex -translate-y-1/2 flex-col items-end gap-1.5"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <Popover open={isHovering} onOpenChange={setIsHovering}>
                <PopoverTrigger asChild>
                    <div className="flex h-12 w-8 flex-col items-start justify-center gap-1.5">
                        {allItems.map((item, index) => {
                            const isActive = activeItemId === item?.id;
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        'h-[1px] w-4 cursor-pointer rounded-full transition-all duration-200',
                                        isActive ? 'bg-brand w-3' : 'bg-foreground/20 w-2'
                                    )}
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (item?.id) {
                                            const element = document.getElementById(
                                                `thread-item-${item.id}`
                                            );
                                            element?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                </PopoverTrigger>
                <AnimatePresence>
                    {isHovering && (
                        <PopoverContent
                            asChild
                            sideOffset={-40}
                            side="right"
                            align="center"
                            className="relative z-[10] max-w-[260px] p-0"
                        >
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="w-full rounded-md bg-white p-1 shadow-2xl"
                            >
                                <div className="no-scrollbar max-h-60 overflow-y-auto">
                                    {allItems.map((item, index) => {
                                        const isActive = activeItemId === item?.id;
                                        const isExpanded = expandedItems.has(item?.id || '');
                                        const rawText = item?.query || '';
                                        const formattedText = formatDisplayText(rawText, 150);
                                        const needsExpansion = rawText.length > 150;
                                        const displayText = isExpanded ? rawText : formattedText;

                                        return (
                                            <div key={index} className="relative">
                                                <Button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        if (item?.id) {
                                                            const element = document.getElementById(
                                                                `thread-item-${item.id}`
                                                            );
                                                            element?.scrollIntoView({
                                                                behavior: 'instant',
                                                            });
                                                        }
                                                    }}
                                                    variant="ghost"
                                                    className={cn(
                                                        'text-muted-foreground/50 hover:text-foreground group h-auto min-h-7 w-full max-w-full cursor-pointer justify-start overflow-hidden whitespace-normal py-2 pr-8 text-left text-sm leading-relaxed',
                                                        isActive && 'text-foreground',
                                                        isExpanded ? 'line-clamp-none' : 'line-clamp-3'
                                                    )}
                                                >
                                                    {displayText}
                                                </Button>
                                                {needsExpansion && (
                                                    <Button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            toggleExpanded(item?.id || '');
                                                        }}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-1 top-1 h-6 w-6 p-0 text-xs text-muted-foreground/70 hover:text-foreground"
                                                    >
                                                        {isExpanded ? '−' : '⋯'}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </PopoverContent>
                    )}
                </AnimatePresence>
            </Popover>
        </div>
    );
};
