import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/tailwind-config';

const config: Config = {
    presets: [sharedConfig],
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/common/components/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/common/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    ],
};

export default config;
