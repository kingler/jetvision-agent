import React from 'react';
import { ApolloDataDisplay } from '../../jetvision/ApolloDataDisplay';
import { AvinodeDataDisplay } from '../../jetvision/AvinodeDataDisplay';
import { Badge } from '@repo/ui';
import { IconDatabase, IconNetwork } from '@tabler/icons-react';

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

export const StructuredDataDisplay: React.FC<StructuredDataDisplayProps> = ({
    data,
    type,
    metadata,
}) => {
    // If no structured data, return null
    if (!data) return null;

    // Auto-detect type if not provided
    const dataType = type || detectDataType(data);

    return (
        <div className="w-full space-y-3">
            {/* Metadata Badge */}
            {metadata && metadata.source === 'n8n' && (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <IconNetwork className="h-3 w-3" />
                    <span>Powered by n8n workflow</span>
                    {metadata.executionId && (
                        <Badge variant="outline" className="text-xs">
                            ID: {metadata.executionId.substring(0, 8)}...
                        </Badge>
                    )}
                </div>
            )}

            {/* Apollo Data Display */}
            {(dataType?.startsWith('apollo') || dataType === 'people_search') && (
                <ApolloDataDisplay
                    type={dataType as any}
                    data={extractApolloData(data, dataType)}
                    summary={
                        // Prefer explicit summaries if present
                        (data as any)?.summary ||
                        (data as any)?.data?.summary ||
                        (data as any)?.apolloResults?.summary ||
                        (data as any)?.structuredData?.summary
                    }
                    actions={data.actions}
                />
            )}

            {/* Avinode Data Display */}
            {(dataType === 'aircraft_search' ||
                dataType === 'booking_quote' ||
                dataType === 'fleet_status') && (
                <AvinodeDataDisplay
                    type={dataType as any}
                    data={data.data || data}
                    summary={data.summary}
                    recommendations={data.recommendations}
                />
            )}

            {/* Generic Structured Data Display */}
            {!dataType?.startsWith('apollo') &&
                dataType !== 'people_search' &&
                !['aircraft_search', 'booking_quote', 'fleet_status'].includes(dataType || '') &&
                data.data && <GenericDataDisplay data={data.data} type={dataType} />}
        </div>
    );
};

const GenericDataDisplay: React.FC<{ data: any; type?: string }> = ({ data, type }) => {
    return (
        <div className="mt-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="mb-3 flex items-center gap-2">
                <IconDatabase className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">
                    {type ? formatTypeName(type) : 'Structured Data'}
                </span>
            </div>
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{formatKey(key)}</span>
                        <span className="max-w-[60%] text-right font-medium">
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

    // Check for N8N Apollo results structure (enhanced detection)
    if (data.apolloResults) {
        return data.apolloResults.type || 'apollo_leads';
    }

    // Check for nested structured data from n8n
    if (data.structuredData && data.structuredData.type) {
        return data.structuredData.type;
    }

    // Check for Apollo patterns (enhanced)
    if (data.people || (data.data && data.data.people)) return 'people_search';
    if (data.leads || (data.data && data.data.leads)) return 'apollo_leads';
    if (data.campaign || (data.data && data.data.campaign)) return 'apollo_campaign';
    if (data.enrichment || (data.data && data.data.enrichment)) return 'apollo_enrichment';

    // Check for Apollo source indication
    if (data.source === 'apollo.io' || (data.data && data.data.source === 'apollo.io')) {
        // If it has lead-like properties, classify as apollo_leads
        if (data.data && Array.isArray(data.data) && data.data.some((item: any) => 
            item.name || item.email || item.company || item.title)) {
            return 'apollo_leads';
        }
        return 'apollo_leads';
    }

    // Check for Avinode patterns
    if (data.aircraft || (data.data && data.data.aircraft)) return 'aircraft_search';
    if (data.quote || (data.data && data.data.quote)) return 'booking_quote';
    if (data.fleet || (data.data && data.data.fleet)) return 'fleet_status';

    // Check for Avinode source indication
    if (data.source === 'avinode' || (data.data && data.data.source === 'avinode')) {
        return 'aircraft_search';
    }

    // Enhanced pattern matching for mixed content
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const content = JSON.stringify(data).toLowerCase();

        // Apollo-related content detection
        if (content.includes('apollo') || content.includes('lead') || content.includes('prospect')) {
            return 'apollo_leads';
        }

        // Aircraft-related content detection
        if (content.includes('aircraft') || content.includes('gulfstream') || content.includes('bombardier')) {
            return 'aircraft_search';
        }
    }

    return 'generic';
}

// Helper function to extract Apollo data from various formats
function extractApolloData(data: any, dataType: string) {
    // If data has apolloResults, use that
    if (data.apolloResults) {
        const apollo = data.apolloResults;
        // Normalize common shapes
        if (Array.isArray(apollo)) return { leads: apollo };
        if (Array.isArray(apollo?.data)) return { leads: apollo.data };
        if (apollo?.results && Array.isArray(apollo.results)) return { leads: apollo.results };
        return apollo;
    }

    // If data has structured data, use that
    if (data.structuredData && data.structuredData.data) {
        const sd = data.structuredData.data;
        if (Array.isArray(sd)) return { leads: sd };
        if (Array.isArray(sd?.results)) return { leads: sd.results };
        if (Array.isArray(sd?.people) && dataType === 'people_search') return { people: sd.people };
        return sd;
    }

    // Direct data access - this is where our structured data comes from
    if (data.data) {
        // If data.data has leads, return it directly (this matches our webhook structure)
        if (data.data.leads) {
            return data.data; // This contains { leads: [...], source: "...", etc }
        }
        // If data.data is an array of leads, wrap it
        if (Array.isArray(data.data)) {
            return { leads: data.data };
        }
        // If results array is present, normalize to leads
        if (Array.isArray(data.data.results)) {
            return { leads: data.data.results };
        }
        // People search results
        if (Array.isArray(data.data.people) && dataType === 'people_search') {
            return { people: data.data.people };
        }
        return data.data;
    }

    // Check if data itself has leads property
    if (data.leads) {
        return data;
    }

    // If raw array provided, assume it is leads
    if (Array.isArray(data)) {
        return { leads: data };
    }

    // Return data as-is
    return data;
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
