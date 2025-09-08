'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    TooltipProvider,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Input,
    Switch,
    Textarea,
    Badge,
} from '@repo/ui';
import { cn } from '@repo/ui';
import { ShowcaseRegistry, ShowcaseDefinition } from './registry';

type ControlValues = Record<string, unknown>;

const initialValuesFor = (def: ShowcaseDefinition): ControlValues => {
    const values: ControlValues = {};
    Object.entries(def.controls ?? {}).forEach(([key, ctrl]) => {
        if (ctrl.default !== undefined) values[key] = ctrl.default as unknown;
        else {
            switch (ctrl.type) {
                case 'boolean':
                    values[key] = false;
                    break;
                case 'number':
                    values[key] = 0;
                    break;
                case 'select':
                    values[key] = ctrl.options?.[0] ?? '';
                    break;
                default:
                    values[key] = '';
            }
        }
    });
    return values;
};

const CodeBlock = ({ code }: { code: string }) => {
    return (
        <pre className="mt-3 overflow-auto rounded-lg border p-3 text-xs">
            <code>{code}</code>
        </pre>
    );
};

const Control = ({
    name,
    value,
    onChange,
    ctrl,
}: {
    name: string;
    value: unknown;
    onChange: (val: unknown) => void;
    ctrl: NonNullable<ShowcaseDefinition['controls']>[string];
}) => {
    const id = `ctrl-${name}`;
    switch (ctrl.type) {
        case 'boolean':
            return (
                <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <Switch
                        checked={Boolean(value)}
                        onCheckedChange={(v) => onChange(v)}
                        aria-label={name}
                        id={id}
                    />
                </label>
            );
        case 'number':
            return (
                <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <Input
                        id={id}
                        type="number"
                        value={String(value ?? '')}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="h-8 w-28"
                    />
                </label>
            );
        case 'select':
            return (
                <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <select
                        id={id}
                        className="h-8 w-40 rounded-md border bg-background px-2 text-sm"
                        value={String(value)}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        {(ctrl.options ?? []).map((opt) => (
                            <option key={String(opt)} value={String(opt)}>
                                {String(opt)}
                            </option>
                        ))}
                    </select>
                </label>
            );
        case 'string':
        default:
            return (
                <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <Input
                        id={id}
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-8 w-48"
                    />
                </label>
            );
    }
};

const ThemeToggle = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light';
        return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light';
    });

    useEffect(() => {
        const html = document.documentElement;
        if (theme === 'dark') html.classList.add('dark');
        else html.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <Button
                variant={theme === 'dark' ? 'secondary' : 'bordered'}
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
                {theme === 'dark' ? 'Dark' : 'Light'}
            </Button>
        </div>
    );
};

const ViewportSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const options = [
        { label: 'Full', class: 'w-full' },
        { label: 'Desktop (1200px)', class: 'w-[1200px]' },
        { label: 'Laptop (1024px)', class: 'w-[1024px]' },
        { label: 'Tablet (768px)', class: 'w-[768px]' },
        { label: 'Mobile (375px)', class: 'w-[375px]' },
    ];
    return (
        <label className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Viewport</span>
            <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <option key={o.class} value={o.class}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
};

export default function ComponentsShowcasePage() {
    const [activeKey, setActiveKey] = useState<string>(ShowcaseRegistry[0]?.key ?? 'button');
    const active = useMemo(() => ShowcaseRegistry.find((c) => c.key === activeKey)!, [activeKey]);
    const [values, setValues] = useState<ControlValues>(() => initialValuesFor(active));
    const [viewportClass, setViewportClass] = useState('w-full');
    const [mode, setMode] = useState<'single' | 'gallery'>('single');

    useEffect(() => {
        setValues(initialValuesFor(active));
    }, [activeKey]);

    const renderComponent = (def: ShowcaseDefinition, v: ControlValues) => {
        const Comp = def.component as React.ElementType;
        // Merge default props and current values
        const merged = { ...(def.defaultProps ?? {}), ...(v ?? {}) } as Record<string, unknown>;
        return (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{def.name}</h3>
                        {def.tag && <Badge>{def.tag}</Badge>}
                    </div>
                    {def.description && (
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                    )}
                </div>
                <div className="rounded-lg border bg-background p-6">
                    {/* Render the component */}
                    <Comp {...(merged as any)} />
                </div>

                {/* Props table (lightweight) */}
                {def.controls && (
                    <div className="mt-4 grid gap-2">
                        <h4 className="text-sm font-semibold">Props</h4>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {Object.entries(def.controls).map(([k, ctrl]) => (
                                <div key={k} className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{k}</span>
                                    <span className="text-xs">{ctrl.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Usage example */}
                <div className="mt-4">
                    <h4 className="text-sm font-semibold">Usage</h4>
                    <CodeBlock
                        code={`import { ${def.importName ?? def.name} } from '@repo/ui';\n\n<${def.importName ?? def.name}${
                            def.exampleCodeProps ? ' ' + def.exampleCodeProps : ''
                        }${def.selfClosing ? ' />' : `>${def.exampleChildren ?? '...'}<` + '/' + (def.importName ?? def.name) + '>'}`}
                    />
                </div>
            </div>
        );
    };

    return (
        <TooltipProvider>
            <div className="mx-auto max-w-[1400px] p-6">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Component Showcase</h1>
                        <p className="text-sm text-muted-foreground">
                            Explore, test, and document UI components from @repo/ui
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <ThemeToggle />
                        <ViewportSelector value={viewportClass} onChange={setViewportClass} />
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Mode</span>
                            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                                <TabsList>
                                    <TabsTrigger value="single">Single</TabsTrigger>
                                    <TabsTrigger value="gallery">Gallery</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Sidebar */}
                    <aside className="lg:col-span-3">
                        <Card className="p-3">
                            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                Components
                            </div>
                            <div className="grid gap-1">
                                {ShowcaseRegistry.map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setActiveKey(item.key)}
                                        className={cn(
                                            'w-full rounded-md px-2 py-1 text-left text-sm hover:bg-secondary',
                                            activeKey === item.key && 'bg-secondary'
                                        )}
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </div>

                            {/* Interactive controls for active component */}
                            {mode === 'single' && active.controls && (
                                <div className="mt-4 border-t pt-3">
                                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                        Controls
                                    </div>
                                    <div className="grid gap-2">
                                        {Object.entries(active.controls).map(([k, c]) => (
                                            <Control
                                                key={k}
                                                name={k}
                                                value={values[k]}
                                                ctrl={c}
                                                onChange={(val) =>
                                                    setValues((prev) => ({ ...prev, [k]: val }))
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 border-t pt-3">
                                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                    A11y Tips
                                </div>
                                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                                    <li>Use Tab/Shift+Tab to navigate focusable elements</li>
                                    <li>Check contrast in both themes</li>
                                    <li>Verify ARIA labels for interactive controls</li>
                                </ul>
                            </div>
                        </Card>
                    </aside>

                    {/* Main content */}
                    <main className="lg:col-span-9">
                        <div className={cn('mx-auto', viewportClass)}>
                            {mode === 'single' ? (
                                renderComponent(active, values)
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {ShowcaseRegistry.map((def) => (
                                        <div key={def.key}>{renderComponent(def, initialValuesFor(def))}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <section className="mt-8">
                            <Card className="p-4">
                                <h3 className="text-sm font-semibold">Development Workflow</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    This page isolates components for rapid iteration. Modify props via
                                    Controls, test responsiveness with the Viewport selector, and toggle
                                    themes. Changes here do not affect the main app.
                                </p>
                            </Card>
                        </section>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}

