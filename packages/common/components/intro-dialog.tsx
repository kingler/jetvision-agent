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
            text: `**Apollo.io Integration**: Access 275M+ contacts and 73M+ companies for targeted lead generation`,
        },
        {
            icon,
            text: `**Avinode Marketplace**: Search 7,000+ aircraft from 3,000+ operators worldwide in real-time`,
        },
        {
            icon,
            text: `**Smart Lead Scoring**: AI-powered prospect qualification based on travel patterns and company metrics`,
        },
        {
            icon,
            text: `**Automated Campaigns**: Multi-touch email sequences with personalized messaging for aviation executives`,
        },
        {
            icon,
            text: `**Instant Quoting**: Generate accurate charter quotes with real-time aircraft availability and pricing`,
        },
        {
            icon,
            text: `**Trip Management**: End-to-end booking workflow from initial inquiry to flight confirmation`,
        },
        {
            icon,
            text: `**Safety & Compliance**: Automated operator vetting with ARGUS, Wyvern, and IS-BAO certifications`,
        },
        {
            icon,
            text: `**Analytics Dashboard**: Track campaign performance, booking conversions, and revenue metrics`,
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
                            AI-Powered Private Aviation Excellence
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold">Welcome, JetVision Stakeholder</h3>
                        <p className="text-muted-foreground text-sm mb-3">
                            Experience the future of private jet charter operations. JetVision Agent seamlessly combines Apollo.io's sales intelligence with Avinode's aviation marketplace to revolutionize how you manage executive travel and grow your charter business.
                        </p>
                        <h4 className="text-sm font-semibold mt-2">Platform Capabilities:</h4>

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

                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground text-center">
                                <span className="font-semibold">Trusted by Charter Operators Worldwide</span>
                                <br />
                                Powered by MCP Protocol • Enterprise-Ready • SOC2 Compliant
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
