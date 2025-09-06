import Link from 'next/link';
import { IconPlane, IconShieldCheck } from '@tabler/icons-react';

export const ChatFooter = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 py-2">
                <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <IconPlane size={16} className="text-gray-600 dark:text-gray-400" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                JetVision
                            </span>
                        </div>
                        <div className="hidden items-center gap-2 md:flex">
                            <IconShieldCheck size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                ARG/US Platinum Rated
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                        <Link
                            href="/terms"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Terms
                        </Link>
                        <Link
                            href="/privacy"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/safety"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Safety
                        </Link>
                        <span className="text-gray-500 dark:text-gray-500">|</span>
                        <span className="text-gray-600 dark:text-gray-400">
                            © {new Date().getFullYear()} JetVision
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
