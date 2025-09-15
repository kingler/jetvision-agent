'use client';

import { ThemeToggle } from '@repo/common/components';
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
                className="w-full px-4 py-2"
            >
                <ThemeToggle size="sm" />
            </Flex>
        </header>
    );
};
