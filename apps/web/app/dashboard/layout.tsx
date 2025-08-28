import { DashboardSidebar } from '@repo/common/components/dashboard';
import { cn } from '@repo/ui';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <DashboardSidebar />
            <main className="flex-1 overflow-auto">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}