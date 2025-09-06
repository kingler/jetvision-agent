import Link from 'next/link';
import { IconPlane, IconShieldCheck, IconAward, IconPhone, IconMail } from '@tabler/icons-react';

export const Footer = () => {
    const mainLinks = [
        {
            href: '/charter',
            label: 'Private Jet Charter',
            icon: IconPlane,
        },
        {
            href: '/membership',
            label: 'Membership Programs',
            icon: IconAward,
        },
        {
            href: '/empty-legs',
            label: 'Empty Leg Flights',
        },
        {
            href: '/concierge',
            label: 'Concierge Services',
        },
    ];

    const legalLinks = [
        {
            href: '/safety',
            label: 'Safety Standards',
            icon: IconShieldCheck,
        },
        {
            href: '/terms',
            label: 'Terms of Service',
        },
        {
            href: '/privacy',
            label: 'Privacy Policy',
        },
    ];

    const contactInfo = [
        {
            href: 'tel:1-800-JETVISION',
            label: '1-800-JETVISION',
            icon: IconPhone,
        },
        {
            href: 'mailto:charter@jetvision.com',
            label: 'charter@jetvision.com',
            icon: IconMail,
        },
    ];

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 py-3">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* Brand Section */}
                    <div className="col-span-1">
                        <div className="mb-4 flex items-center gap-2">
                            <IconPlane size={24} className="text-brand" />
                            <span className="text-foreground text-lg font-bold">JetVision</span>
                        </div>
                        <p className="text-muted-foreground mb-4 text-sm">
                            20+ years of excellence in private aviation. Luxury travel redefined
                            with Apollo.io intelligence.
                        </p>
                        <div className="flex items-center gap-2">
                            <IconShieldCheck size={16} className="text-brand" />
                            <span className="text-muted-foreground text-xs">
                                ARG/US Platinum Rated
                            </span>
                        </div>
                    </div>

                    {/* Services */}
                    <div className="col-span-1">
                        <h4 className="text-foreground mb-3 font-semibold">Services</h4>
                        <div className="space-y-2">
                            {mainLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground hover:text-brand block text-sm"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h4 className="text-foreground mb-3 font-semibold">Legal & Safety</h4>
                        <div className="space-y-2">
                            {legalLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground hover:text-brand block text-sm"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="col-span-1">
                        <h4 className="text-foreground mb-3 font-semibold">24/7 Charter Desk</h4>
                        <div className="space-y-2">
                            {contactInfo.map(item => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className="text-muted-foreground hover:text-brand flex items-center gap-2 text-sm"
                                >
                                    {item.icon && <item.icon size={14} />}
                                    {item.label}
                                </a>
                            ))}
                            <div className="text-muted-foreground mt-4 text-xs">
                                Available 24 hours a day, 365 days a year
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-border mt-8 border-t pt-6">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="text-muted-foreground text-xs">
                            © {new Date().getFullYear()} JetVision. All rights reserved. | Powered
                            by Apollo.io Intelligence
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-muted-foreground text-xs">Member of:</span>
                            <span className="text-accent text-xs font-semibold">NBAA</span>
                            <span className="text-accent text-xs font-semibold">EBAA</span>
                            <span className="text-accent text-xs font-semibold">AsBAA</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
