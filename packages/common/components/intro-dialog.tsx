import { useUser } from '@clerk/nextjs';
import { cn, Dialog, DialogContent } from '@repo/ui';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Logo } from './logo';
export const IntroDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isSignedIn } = useUser();

    useEffect(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenIntro');
        if (!hasSeenIntro) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenIntro', 'true');
        setIsOpen(false);
    };

    const icon = (
        <IconCircleCheckFilled className="text-muted-foreground/50 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full" />
    );

    const points = [
        {
            icon,
            text: `**Lead Generation**: Search for high-value prospects by job title, industry, and company size`,
        },
        {
            icon,
            text: `**Aircraft Search**: Find available jets based on trip requirements and passenger needs`,
        },
        {
            icon,
            text: `**Charter Quotes**: Generate instant pricing quotes for any route and aircraft type`,
        },
        {
            icon,
            text: `**Email Campaigns**: Create automated email sequences for lead nurturing`,
        },
        {
            icon,
            text: `**Contact Enrichment**: Enhance prospect data with Apollo.io intelligence`,
        },
        {
            icon,
            text: `**Booking Management**: Submit charter requests and manage existing bookings`,
        },
        {
            icon,
            text: `**Operator Details**: Access comprehensive operator safety records and fleet information`,
        },
    ];

    const exampleRequests = [
        "Find CEOs in the aviation industry in Miami with companies over 50 employees",
        "Search for a midsize jet from KTEB to KLAS for 6 passengers next Friday",
        "Get pricing for a round trip from New York to London for 8 passengers",
        "Create an email sequence for luxury travel executives",
        "Check available heavy jets from Los Angeles to Dubai",
        "Track engagement metrics for our last email campaign",
    ];

    if (isSignedIn) {
        return null;
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={open => {
                if (open) {
                    setIsOpen(true);
                } else {
                    handleClose();
                }
            }}
        >
            <DialogContent
                ariaTitle="Introduction"
                className="flex max-w-[420px] flex-col gap-0 overflow-hidden p-0"
            >
                <div className="flex flex-col gap-8 p-5">
                    <div className="flex flex-col gap-2">
                        <div
                            className={cn(
                                'flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 '
                            )}
                        >
                            <Logo className="text-brand size-5" />
                            <p className="font-clash text-foreground text-lg font-bold tracking-wide">
                                JetVision Agent
                            </p>
                        </div>
                        <p className="text-base font-semibold">
                            Your AI-Powered Private Jet Charter Assistant
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">Welcome to JetVision Agent</h3>
                        <p className="text-muted-foreground text-sm mb-3">Streamline your private jet charter operations with AI-powered sales intelligence and aviation marketplace integration.</p>
                        <h4 className="text-sm font-semibold mt-2">What I can help you with:</h4>

                        <div className="flex flex-col items-start gap-1.5">
                            {points.map((point, index) => (
                                <div key={index} className="flex-inline flex items-start gap-2">
                                    {point.icon}
                                    <ReactMarkdown
                                        className="text-sm"
                                        components={{
                                            p: ({ children }) => (
                                                <p className="text-muted-foreground text-sm">
                                                    {children}
                                                </p>
                                            ),
                                            strong: ({ children }) => (
                                                <span className="text-sm font-semibold">
                                                    {children}
                                                </span>
                                            ),
                                        }}
                                    >
                                        {point.text}
                                    </ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
