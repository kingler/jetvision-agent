import { ClerkProvider } from '@clerk/nextjs';
import { RootLayout } from '@repo/common/components';
import { ReactQueryProvider, RootProvider } from '@repo/common/context';
import { TooltipProvider, cn } from '@repo/ui';
import { GeistMono } from 'geist/font/mono';
import type { Viewport } from 'next';
import { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import localFont from 'next/font/local';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-bricolage',
});

import './globals.css';

export const metadata: Metadata = {
    title: 'JetVision - Luxury Private Jet Charter Intelligence | Apollo.io Powered',
    description:
        'Experience premium private jet charter services with AI-powered intelligence. Leveraging 20+ years of aviation expertise and Apollo.io integration for executive travel solutions.',
    keywords: 'private jet charter, luxury aviation, executive travel, Apollo.io, jet charter intelligence, business aviation, empty leg flights, concierge services',
    authors: [{ name: 'JetVision', url: 'https://jetvision.com' }],
    creator: 'JetVision',
    publisher: 'JetVision',
    openGraph: {
        title: 'JetVision - Luxury Private Jet Charter Intelligence',
        siteName: 'JetVision',
        description:
            'Transform your executive travel with JetVision\'s AI-powered private jet charter services. Apollo.io integration for seamless business aviation solutions.',
        url: 'https://jetvision.com',
        type: 'website',
        locale: 'en_US',
        images: [
            {
                url: 'https://jetvision.com/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'JetVision - Luxury Aviation Intelligence',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'JetVision - Luxury Private Jet Charter Intelligence',
        site: 'JetVision',
        creator: '@JetVisionCharter',
        description:
            'Experience luxury private jet travel with JetVision\'s 20+ years of aviation expertise. Apollo.io powered intelligence for executive charter services.',
        images: ['https://jetvision.com/twitter-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://jetvision.com',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

const inter = localFont({
    src: './InterVariable.woff2',
    variable: '--font-inter',
});

const clash = localFont({
    src: './ClashGrotesk-Variable.woff2',
    variable: '--font-clash',
});

export default function ParentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={cn(GeistMono.variable, inter.variable, clash.variable, bricolage.variable)}
            suppressHydrationWarning
        >
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />

                {/* <script
                    crossOrigin="anonymous"
                    src="//unpkg.com/react-scan/dist/auto.global.js"
                ></script> */}
            </head>
            <body>
                {/* <PostHogProvider> */}
                <ClerkProvider>
                    <RootProvider>
                        {/* <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          > */}
                        <TooltipProvider>
                            <ReactQueryProvider>
                                <RootLayout>{children}</RootLayout>
                            </ReactQueryProvider>
                        </TooltipProvider>
                        {/* </ThemeProvider> */}
                    </RootProvider>
                </ClerkProvider>
                {/* </PostHogProvider> */}
            </body>
        </html>
    );
}
