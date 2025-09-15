'use client';

import { SimpleThemeToggle } from '@repo/common/components';
import { Flex } from '@repo/ui';
import { FC } from 'react';

export interface HeaderProps {
    className?: string;
}

export const Header: FC<HeaderProps> = ({ className }) => {
    return (
        <header className={className}>
            <Flex
                items="center"
                justify="end"
                className="w-full px-4 py-3"
            >
                <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-subtle-xs">
                    <SimpleThemeToggle size="sm" />
                </div>
            </Flex>
        </header>
    );
};
