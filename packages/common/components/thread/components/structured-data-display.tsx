import React from 'react';
import { ApolloDataDisplay } from '../../jetvision/ApolloDataDisplay';
import { AvinodeDataDisplay } from '../../jetvision/AvinodeDataDisplay';
import { Badge } from '@repo/ui';
import { IconDatabase, IconWorkflow } from '@tabler/icons-react';

interface StructuredDataDisplayProps {
    data: any;
    type?: string;
    metadata?: {
        executionId?: string;
        workflowId?: string;
        timestamp?: string;
        source?: string;
    };
}

export const StructuredDataDisplay: React.FC<StructuredDataDisplayProps> = ({ data, type, metadata }) => {
    // If no structured data, return null
    if (!data) return null;
    
    // Auto-detect type if not provided
    const dataType = type || detectDataType(data);
    
    return (
        <div className="w-full space-y-3">
            {/* Metadata Badge */}
            {metadata && metadata.source === 'n8n' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconWorkflow className="h-3 w-3" />
                    <span>Powered by n8n workflow</span>
                    {metadata.executionId && (
                        <Badge variant="outline" className="text-xs">
                            ID: {metadata.executionId.substring(0, 8)}...
                        </Badge>
                    )}
                </div>
            )}
            
            {/* Apollo Data Display */}
            {dataType?.startsWith('apollo') && (
                <ApolloDataDisplay
                    type={dataType as any}
                    data={data.data || data}
                    summary={data.summary}
                    actions={data.actions}
                />
            )}
            
            {/* Avinode Data Display */}
            {(dataType === 'aircraft_search' || dataType === 'booking_quote' || dataType === 'fleet_status') && (
                <AvinodeDataDisplay
                    type={dataType as any}
                    data={data.data || data}
                    summary={data.summary}
                    recommendations={data.recommendations}
                />
            )}
            
            {/* Generic Structured Data Display */}
            {!dataType?.startsWith('apollo') && 
             !['aircraft_search', 'booking_quote', 'fleet_status'].includes(dataType || '') && 
             data.data && (
                <GenericDataDisplay data={data.data} type={dataType} />
            )}
        </div>
    );
};

const GenericDataDisplay: React.FC<{ data: any; type?: string }> = ({ data, type }) => {
    return (
        <div className="mt-4 p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 mb-3">
                <IconDatabase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                    {type ? formatTypeName(type) : 'Structured Data'}
                </span>
            </div>
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{formatKey(key)}</span>
                        <span className="font-medium text-right max-w-[60%]">
                            {formatValue(value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper function to detect data type
export function detectDataType(data: any): string | null {
    if (!data) return null;
    
    // Check if type is explicitly provided
    if (data.type) return data.type;
    
    // Check for Apollo patterns
    if (data.leads || (data.data && data.data.leads)) return 'apollo_leads';
    if (data.campaign || (data.data && data.data.campaign)) return 'apollo_campaign';
    if (data.enrichment || (data.data && data.data.enrichment)) return 'apollo_enrichment';
    
    // Check for Avinode patterns
    if (data.aircraft || (data.data && data.data.aircraft)) return 'aircraft_search';
    if (data.quote || (data.data && data.data.quote)) return 'booking_quote';
    if (data.fleet || (data.data && data.data.fleet)) return 'fleet_status';
    
    return 'generic';
}

// Format helpers
function formatTypeName(type: string): string {
    return type
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatKey(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
        if (Array.isArray(value)) return `${value.length} items`;
        return Object.keys(value).length + ' properties';
    }
    return String(value);
}