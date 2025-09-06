'use client';
import React from 'react';
import { Button } from '@repo/ui';
import { IconExternalLink } from '@tabler/icons-react';

export const JetVisionFooterButton: React.FC = () => {
    const handleJetVisionClick = () => {
        window.open('https://jetvision.com', '_blank');
    };

    const handleApolloClick = () => {
        window.open('https://apollo.io', '_blank');
    };

    const handleAvinodeClick = () => {
        window.open('https://avinode.com', '_blank');
    };

    return (
        <div className="border-border bg-secondary/30 border-t py-4">
            <div className="mx-auto max-w-7xl px-4">
                <div className="flex items-center justify-center gap-4">
                    {/* Primary Button - Visit JetVision */}
                    <Button
                        onClick={handleJetVisionClick}
                        size="lg"
                        className="bg-brand hover:bg-brand/90 font-semibold text-white"
                    >
                        Visit JetVision.com
                    </Button>

                    {/* Secondary Link Button - Apollo.io */}
                    <Button
                        onClick={handleApolloClick}
                        variant="ghost"
                        size="lg"
                        className="text-foreground hover:text-brand font-medium"
                    >
                        <span>Go to Apollo.io</span>
                        <IconExternalLink size={16} className="ml-1" />
                    </Button>

                    {/* Secondary Link Button - Avinode */}
                    <Button
                        onClick={handleAvinodeClick}
                        variant="ghost"
                        size="lg"
                        className="text-foreground hover:text-brand font-medium"
                    >
                        <span>Go to Avinode</span>
                        <IconExternalLink size={16} className="ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
