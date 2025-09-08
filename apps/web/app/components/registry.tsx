import React from 'react';
import {
    Button,
    Input,
    Textarea,
    Badge,
    Card,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Switch,
    Avatar,
    Alert,
} from '@repo/ui';

export type ControlType = 'string' | 'number' | 'boolean' | 'select';

export type ControlDef = {
    type: ControlType;
    description?: string;
    default?: string | number | boolean;
    options?: Array<string | number>;
};

export type ShowcaseDefinition = {
    key: string;
    name: string;
    importName?: string;
    description?: string;
    tag?: string;
    component: React.ComponentType<any>;
    defaultProps?: Record<string, unknown>;
    controls?: Record<string, ControlDef>;
    exampleCodeProps?: string;
    exampleChildren?: string;
    selfClosing?: boolean;
};

// Simple wrapper components to keep examples concise
const DemoButton = (props: any) => <Button {...props}>{props.children ?? 'Click me'}</Button>;
const DemoInput = (props: any) => <Input {...props} placeholder={props.placeholder ?? 'Type here'} />;
const DemoTextarea = (props: any) => (
    <Textarea {...props} placeholder={props.placeholder ?? 'Enter multi-line text'} />
);
const DemoBadge = (props: any) => <Badge {...props}>{props.children ?? 'Badge'}</Badge>;
const DemoCard = (props: any) => (
    <Card className="p-4" {...props}>
        <div className="text-sm text-muted-foreground">Card content</div>
    </Card>
);
const DemoTabs = (props: any) => (
    <Tabs defaultValue="one" {...props}>
        <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First tab</TabsContent>
        <TabsContent value="two">Second tab</TabsContent>
    </Tabs>
);
const DemoSwitch = (props: any) => <Switch {...props} />;
const DemoAvatar = (props: any) => (
    <div className="flex items-center gap-3">
        <Avatar name={props.name ?? 'A'} {...props} />
        <span className="text-sm text-muted-foreground">Avatar</span>
    </div>
);
const DemoAlert = (props: any) => (
    <Alert {...props}>
        <div className="text-sm">This is an alert with contextual styling.</div>
    </Alert>
);

export const ShowcaseRegistry: ShowcaseDefinition[] = [
    {
        key: 'button',
        name: 'Button',
        component: DemoButton,
        description: 'Primary action button with variants and sizes.',
        importName: 'Button',
        controls: {
            children: { type: 'string', default: 'Click me' },
            variant: {
                type: 'select',
                options: [
                    'default',
                    'brand',
                    'brand-secondary',
                    'accent',
                    'outlined',
                    'destructive',
                    'bordered',
                    'secondary',
                    'ghost',
                    'ghost-bordered',
                    'link',
                    'text',
                ],
                default: 'default',
            },
            size: { type: 'select', options: ['xs', 'sm', 'default', 'md', 'lg', 'icon'], default: 'default' },
            disabled: { type: 'boolean', default: false },
        },
        exampleCodeProps: "variant=\"default\" size=\"default\"",
        exampleChildren: 'Click me',
    },
    {
        key: 'input',
        name: 'Input',
        component: DemoInput,
        importName: 'Input',
        description: 'Text input for single-line content.',
        controls: {
            placeholder: { type: 'string', default: 'Type here' },
            disabled: { type: 'boolean', default: false },
        },
        selfClosing: true,
        exampleCodeProps: "placeholder=\"Type here\"",
    },
    {
        key: 'textarea',
        name: 'Textarea',
        component: DemoTextarea,
        importName: 'Textarea',
        description: 'Multi-line text area.',
        controls: {
            placeholder: { type: 'string', default: 'Enter multi-line text' },
            disabled: { type: 'boolean', default: false },
            rows: { type: 'number', default: 4 },
        },
        exampleCodeProps: "rows={4}",
        exampleChildren: '...',
    },
    {
        key: 'badge',
        name: 'Badge',
        component: DemoBadge,
        importName: 'Badge',
        description: 'Small label for status or categorization.',
        controls: {
            children: { type: 'string', default: 'Badge' },
            variant: {
                type: 'select',
                options: ['default', 'secondary', 'tertiary', 'brand', 'destructive', 'outline'],
                default: 'default',
            },
            size: { type: 'select', options: ['sm', 'md', 'lg'], default: 'md' },
        },
        exampleChildren: 'Badge',
    },
    {
        key: 'card',
        name: 'Card',
        component: DemoCard,
        importName: 'Card',
        description: 'Content container with background and border.',
        controls: {},
        exampleChildren: '...children',
    },
    {
        key: 'tabs',
        name: 'Tabs',
        component: DemoTabs,
        importName: 'Tabs',
        description: 'Tabbed navigation for related content sections.',
        controls: {},
    },
    {
        key: 'switch',
        name: 'Switch',
        component: DemoSwitch,
        importName: 'Switch',
        description: 'On/off toggle control.',
        controls: {
            checked: { type: 'boolean', default: true },
            disabled: { type: 'boolean', default: false },
        },
        selfClosing: true,
    },
    {
        key: 'avatar',
        name: 'Avatar',
        component: DemoAvatar,
        importName: 'Avatar',
        description: 'User avatar with fallback.',
        controls: {
            name: { type: 'string', default: 'A' },
            size: { type: 'select', options: ['sm', 'md', 'lg'], default: 'md' },
        },
    },
    {
        key: 'alert',
        name: 'Alert',
        component: DemoAlert,
        importName: 'Alert',
        description: 'Contextual alert for feedback messages.',
        controls: {
            variant: { type: 'select', options: ['default', 'success', 'info', 'warning', 'destructive'], default: 'default' },
        },
    },
];
