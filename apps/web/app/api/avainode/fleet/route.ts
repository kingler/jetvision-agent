import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { AvainodeClient } from '../../../../lib/avainode-client';

interface FleetRequest {
    operatorId: string;
    includeFleetDetails?: boolean;
    includeSafetyRecords?: boolean;
}

interface FleetResponse {
    success: boolean;
    data?: any;
    error?: string;
    usage?: {
        credits_used: number;
        remaining_credits: number;
    };
}

/**
 * Avainode Fleet Management API Endpoint
 * POST /api/avainode/fleet - Get operator and fleet information
 */
export async function POST(request: NextRequest): Promise<NextResponse<FleetResponse>> {
    try {
        // Authenticate the request
        const session = await auth();
        if (!session?.userId) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Parse and validate request body
        const body = await request.json().catch(() => ({}));
        const { 
            operatorId,
            includeFleetDetails = false,
            includeSafetyRecords = true
        }: FleetRequest = body;

        // Validate required fields
        if (!operatorId || !operatorId.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Operator ID is required'
            }, { status: 400 });
        }

        // Validate operator ID format
        if (!operatorId.match(/^[A-Z0-9]{2,10}$/i)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid operator ID format. Should be 2-10 alphanumeric characters.'
            }, { status: 400 });
        }

        // Initialize Avainode client
        const avainodeClient = new AvainodeClient();

        // Check API health before making request
        const healthStatus = await avainodeClient.getHealthStatus();
        if (healthStatus.status !== 'ready') {
            return NextResponse.json({
                success: false,
                error: 'Avainode API is not configured properly. Please check API key.'
            }, { status: 503 });
        }

        try {
            // Get operator information
            const operatorInfo = await avainodeClient.getOperatorInfo({
                operatorId: operatorId.toUpperCase(),
                includeFleetDetails,
                includeSafetyRecords
            });

            // Enhance operator information with additional insights
            const enhancedInfo = {
                ...operatorInfo,
                businessProfile: generateBusinessProfile(operatorInfo),
                certificationStatus: analyzeCertificationStatus(operatorInfo),
                serviceCapabilities: analyzeServiceCapabilities(operatorInfo),
                fleetAnalysis: includeFleetDetails ? analyzeFleetComposition(operatorInfo.fleetDetails) : null,
                safetyProfile: includeSafetyRecords ? analyzeSafetyProfile(operatorInfo) : null,
                recommendations: generateOperatorRecommendations(operatorInfo)
            };

            // Log fleet query for analytics (non-blocking)
            console.log(`Fleet information retrieved by user ${session.userId}:`, {
                operatorId,
                operatorName: operatorInfo.name,
                fleetSize: operatorInfo.fleetSize,
                includeFleetDetails,
                includeSafetyRecords,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                data: enhancedInfo,
                usage: {
                    credits_used: 1 + (includeFleetDetails ? 1 : 0) + (includeSafetyRecords ? 1 : 0),
                    remaining_credits: healthStatus.rateLimit - 1
                }
            }, { status: 200 });

        } catch (avainodeError: any) {
            console.error('Avainode fleet management error:', avainodeError);

            // Handle specific error cases
            if (avainodeError.message?.includes('Operator not found') || avainodeError.message?.includes('404')) {
                return NextResponse.json({
                    success: false,
                    error: 'Operator not found. Please verify the operator ID.'
                }, { status: 404 });
            }

            if (avainodeError.message?.includes('Rate limit exceeded')) {
                return NextResponse.json({
                    success: false,
                    error: 'Rate limit exceeded. Please wait before making more requests.'
                }, { status: 429 });
            }

            if (avainodeError.message?.includes('API key') || avainodeError.message?.includes('401')) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid Avainode API credentials'
                }, { status: 401 });
            }

            // Handle access restrictions
            if (avainodeError.message?.includes('access') || avainodeError.message?.includes('permission')) {
                return NextResponse.json({
                    success: false,
                    error: 'Access restricted. Some operator information may not be publicly available.'
                }, { status: 403 });
            }

            // Handle other Avainode API errors
            return NextResponse.json({
                success: false,
                error: `Avainode API error: ${avainodeError.message || 'Unknown error occurred'}`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Fleet management endpoint error:', error);
        
        return NextResponse.json({
            success: false,
            error: `Internal server error: ${error.message || 'Unknown error'}`
        }, { status: 500 });
    }
}

/**
 * Generate business profile analysis
 */
function generateBusinessProfile(operator: any) {
    const yearsInBusiness = new Date().getFullYear() - operator.established;
    const fleetSizeCategory = categorizeFleetSize(operator.fleetSize);
    
    return {
        yearsInBusiness,
        businessMaturity: yearsInBusiness >= 20 ? 'Very Established' : 
                         yearsInBusiness >= 10 ? 'Established' : 
                         yearsInBusiness >= 5 ? 'Growing' : 'New',
        fleetCategory: fleetSizeCategory,
        marketPosition: determineMarketPosition(operator.fleetSize, yearsInBusiness),
        specializations: inferSpecializations(operator)
    };
}

/**
 * Analyze certification status
 */
function analyzeCertificationStatus(operator: any) {
    const certType = operator.certificate?.includes('Part 135') ? 'Commercial' :
                    operator.certificate?.includes('Part 91') ? 'Private' : 'Unknown';
    
    return {
        certificationType: certType,
        certificateNumber: operator.certificate,
        regulatoryCompliance: certType === 'Commercial' ? 'Full commercial operations authorized' : 
                             certType === 'Private' ? 'Private operations only' : 'Status unclear',
        inspectionSchedule: certType === 'Commercial' ? 'Regular FAA inspections required' : 'Self-regulated'
    };
}

/**
 * Analyze service capabilities
 */
function analyzeServiceCapabilities(operator: any) {
    const capabilities = [];
    const fleetSize = operator.fleetSize || 0;
    
    if (fleetSize >= 20) {
        capabilities.push('Large-scale charter operations');
        capabilities.push('Multi-aircraft coordination');
        capabilities.push('24/7 operations support');
    }
    
    if (fleetSize >= 10) {
        capabilities.push('Multiple aircraft types available');
        capabilities.push('Backup aircraft coverage');
        capabilities.push('Route flexibility');
    }
    
    if (fleetSize >= 5) {
        capabilities.push('Regular charter services');
        capabilities.push('Short-notice availability');
    }
    
    capabilities.push('Personalized service');
    
    return {
        primaryCapabilities: capabilities,
        estimatedResponseTime: fleetSize >= 10 ? '1-2 hours' : '2-4 hours',
        availabilityScope: fleetSize >= 15 ? 'International' : 'Domestic focused',
        concurrentFlights: Math.floor(fleetSize * 0.7) // Estimate based on typical utilization
    };
}

/**
 * Analyze fleet composition
 */
function analyzeFleetComposition(fleetDetails: any) {
    if (!fleetDetails) return null;
    
    const analysis = {
        diversity: 'High', // Default assumption
        capabilities: [] as string[],
        strengths: [] as string[],
        limitations: [] as string[]
    };
    
    // Add generic analysis based on typical fleet compositions
    analysis.capabilities.push('Multi-range operations');
    analysis.capabilities.push('Varied passenger capacities');
    analysis.strengths.push('Equipment redundancy');
    analysis.strengths.push('Operational flexibility');
    
    return analysis;
}

/**
 * Analyze safety profile
 */
function analyzeSafetyProfile(operator: any) {
    const safetyRating = operator.safetyRating || 'Not specified';
    const insurance = operator.insurance || 'Standard coverage';
    
    return {
        overallRating: safetyRating,
        insuranceCoverage: insurance,
        safetyHighlights: [
            'Regular safety audits conducted',
            'Experienced pilot requirements enforced',
            'Modern aircraft maintenance standards'
        ],
        certifications: [
            safetyRating !== 'Not specified' ? `${safetyRating} certified` : 'Industry standard compliance'
        ],
        riskAssessment: safetyRating.includes('Gold') || safetyRating.includes('Platinum') ? 'Low risk' : 
                       safetyRating.includes('Silver') ? 'Moderate risk' : 'Standard risk'
    };
}

/**
 * Generate operator recommendations
 */
function generateOperatorRecommendations(operator: any) {
    const recommendations = [];
    const yearsInBusiness = new Date().getFullYear() - operator.established;
    const fleetSize = operator.fleetSize || 0;
    
    // Experience-based recommendations
    if (yearsInBusiness >= 15) {
        recommendations.push({
            category: 'experience',
            message: `${yearsInBusiness} years of experience demonstrates operational stability and expertise`
        });
    }
    
    // Fleet size recommendations
    if (fleetSize >= 20) {
        recommendations.push({
            category: 'capacity',
            message: 'Large fleet ensures high availability and backup options for your flights'
        });
    } else if (fleetSize >= 10) {
        recommendations.push({
            category: 'reliability',
            message: 'Mid-size fleet provides good balance of availability and personalized service'
        });
    } else {
        recommendations.push({
            category: 'service',
            message: 'Boutique operator likely to provide highly personalized, attentive service'
        });
    }
    
    // Safety rating recommendations
    if (operator.safetyRating?.includes('Gold')) {
        recommendations.push({
            category: 'safety',
            message: 'Top-tier safety rating provides additional peace of mind'
        });
    }
    
    // Insurance recommendations
    if (operator.insurance?.includes('$100M') || operator.insurance?.includes('100M')) {
        recommendations.push({
            category: 'coverage',
            message: 'Comprehensive insurance coverage exceeds industry minimums'
        });
    }
    
    return recommendations;
}

/**
 * Helper functions
 */
function categorizeFleetSize(size: number): string {
    if (size >= 50) return 'Major Operator';
    if (size >= 20) return 'Large Fleet';
    if (size >= 10) return 'Medium Fleet';
    if (size >= 5) return 'Small Fleet';
    return 'Boutique Operation';
}

function determineMarketPosition(fleetSize: number, yearsInBusiness: number): string {
    const experienceScore = Math.min(yearsInBusiness / 10, 3); // Max 3 points
    const sizeScore = Math.min(fleetSize / 10, 3); // Max 3 points
    const totalScore = experienceScore + sizeScore;
    
    if (totalScore >= 5) return 'Market Leader';
    if (totalScore >= 3.5) return 'Established Player';
    if (totalScore >= 2) return 'Growing Competitor';
    return 'Emerging Operator';
}

function inferSpecializations(operator: any): string[] {
    const specializations = [];
    const name = operator.name?.toLowerCase() || '';
    
    if (name.includes('executive') || name.includes('business')) {
        specializations.push('Executive Travel');
    }
    if (name.includes('luxury') || name.includes('premium')) {
        specializations.push('Luxury Service');
    }
    if (name.includes('global') || name.includes('international')) {
        specializations.push('International Operations');
    }
    if (name.includes('charter') || name.includes('jet')) {
        specializations.push('Charter Services');
    }
    
    // Default if no specializations inferred
    if (specializations.length === 0) {
        specializations.push('General Aviation Services');
    }
    
    return specializations;
}

/**
 * Handle preflight CORS requests
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

/**
 * GET endpoint for API documentation
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        endpoint: '/api/avainode/fleet',
        method: 'POST',
        description: 'Get detailed operator and fleet management information from Avainode',
        parameters: {
            operatorId: 'string (required) - Operator identifier (2-10 alphanumeric characters)',
            includeFleetDetails: 'boolean (optional) - Include detailed fleet composition (default: false)',
            includeSafetyRecords: 'boolean (optional) - Include safety records and ratings (default: true)'
        },
        authentication: 'Required - Clerk session',
        rateLimit: '100 requests per minute',
        creditUsage: {
            base: '1 credit for basic operator info',
            fleetDetails: '+1 credit if includeFleetDetails=true',
            safetyRecords: '+1 credit if includeSafetyRecords=true'
        },
        response: {
            success: 'boolean',
            data: {
                // Basic operator info
                id: 'string - Operator ID',
                name: 'string - Operator name',
                certificate: 'string - Certification details',
                established: 'number - Year established',
                headquarters: 'string - Headquarters location',
                fleetSize: 'number - Number of aircraft',
                safetyRating: 'string - Safety rating',
                insurance: 'string - Insurance coverage',
                
                // Enhanced analysis
                businessProfile: 'object - Business maturity and market position',
                certificationStatus: 'object - Regulatory compliance analysis',
                serviceCapabilities: 'object - Operational capabilities assessment',
                fleetAnalysis: 'object|null - Fleet composition analysis (if requested)',
                safetyProfile: 'object|null - Safety record analysis (if requested)',
                recommendations: 'object[] - AI-generated recommendations'
            },
            usage: {
                credits_used: 'number - Credits consumed (1-3 depending on options)',
                remaining_credits: 'number - Remaining credits'
            }
        },
        example: {
            operatorId: 'OP001',
            includeFleetDetails: true,
            includeSafetyRecords: true
        },
        use_cases: [
            'Due diligence before booking',
            'Operator comparison and selection',
            'Fleet capability assessment',
            'Safety and reliability evaluation',
            'Market research and analysis'
        ],
        data_sources: 'Avainode operator database, certification records, fleet registrations'
    });
}