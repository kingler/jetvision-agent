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
        <footer className="border-t border-border bg-secondary/30">
            <div className="mx-auto max-w-7xl px-4 py-8">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* Brand Section */}
                    <div className="col-span-1">
                        <div className="mb-4 flex items-center gap-2">
                            <IconPlane size={24} className="text-brand" />
                            <span className="text-lg font-bold text-foreground">JetVision</span>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">
                            20+ years of excellence in private aviation. Luxury travel redefined with Apollo.io intelligence.
                        </p>
                        <div className="flex items-center gap-2">
                            <IconShieldCheck size={16} className="text-brand" />
                            <span className="text-xs text-muted-foreground">ARG/US Platinum Rated</span>
                        </div>
                    </div>

                    {/* Services */}
                    <div className="col-span-1">
                        <h4 className="mb-3 font-semibold text-foreground">Services</h4>
                        <div className="space-y-2">
                            {mainLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="block text-sm text-muted-foreground hover:text-brand"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h4 className="mb-3 font-semibold text-foreground">Legal & Safety</h4>
                        <div className="space-y-2">
                            {legalLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="block text-sm text-muted-foreground hover:text-brand"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="col-span-1">
                        <h4 className="mb-3 font-semibold text-foreground">24/7 Charter Desk</h4>
                        <div className="space-y-2">
                            {contactInfo.map(item => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
                                >
                                    {item.icon && <item.icon size={14} />}
                                    {item.label}
                                </a>
                            ))}
                            <div className="mt-4 text-xs text-muted-foreground">
                                Available 24 hours a day, 365 days a year
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 border-t border-border pt-6">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="text-xs text-muted-foreground">
                            © {new Date().getFullYear()} JetVision. All rights reserved. | Powered by Apollo.io Intelligence
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">Member of:</span>
                            <span className="text-xs font-semibold text-accent">NBAA</span>
                            <span className="text-xs font-semibold text-accent">EBAA</span>
                            <span className="text-xs font-semibold text-accent">AsBAA</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};