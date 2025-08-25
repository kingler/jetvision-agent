import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'JetVision Agent | Apollo.io & Avinode Intelligence',
    description: 'AI-powered interface for Apollo.io lead generation and Avinode fleet management. Ask questions about campaigns, aircraft availability, and system operations.',
    keywords: 'JetVision, Apollo.io, Avinode, private jet, lead generation, fleet management, n8n automation',
};

export default function JetVisionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative h-screen w-full overflow-hidden">
            {children}
        </div>
    );
}