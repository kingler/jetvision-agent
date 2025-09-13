/**
 * Unit tests for query-mapper.ts
 * Ensures proper natural language to JSON payload conversion
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
    mapQueryToPayload,
    parseRelativeDate,
    extractJobTitles,
    extractIndustries,
    getAirportCode,
    normalizeAircraftCategory,
    AIRPORT_CODES,
    JOB_TITLE_MAPPINGS,
    INDUSTRY_MAPPINGS,
    AIRCRAFT_CATEGORIES,
} from '../query-mapper';

describe('query-mapper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Date for consistent testing
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('mapQueryToPayload', () => {
        describe('Lead Generation Queries', () => {
            it('should map simple CEO search query', () => {
                const query =
                    'Find CEOs of technology companies in San Francisco with 50-200 employees';
                const result = mapQueryToPayload(query, 'test-session');

                expect(result.confidence).toBeGreaterThanOrEqual(0.8);
                expect(result.category).toBe('lead_generation');
                expect(result.payload.apollo_job_titles).toContain('CEO');
                expect(result.payload.apollo_industries).toContain('Technology');
                expect(result.payload.apollo_locations).toContain('San Francisco');
                expect(result.payload.apollo_company_size).toBe('50-200');
                expect(result.payload.routing_tool).toBe('apollo');
            });

            it('should map complex executive search with multiple criteria', () => {
                const query = 'Find CFOs and CTOs from fintech companies in NYC or Boston';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('lead_generation');
                expect(result.payload.apollo_job_titles).toEqual(
                    expect.arrayContaining(['CFO', 'CTO'])
                );
                expect(result.payload.apollo_industries).toEqual(
                    expect.arrayContaining(['Fintech', 'Financial Technology'])
                );
                expect(result.payload.apollo_locations).toEqual(
                    expect.arrayContaining(['NYC or Boston'])
                );
            });

            it('should handle job change tracking queries', () => {
                const query = 'Show me executives who recently joined private jet companies as VPs';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('job_change_alerts');
                expect(result.payload.apollo_job_change_period).toBe('last_90_days');
                expect(result.payload.apollo_new_titles).toEqual(
                    expect.arrayContaining(['VP', 'Vice President'])
                );
                expect(result.payload.routing_tool).toBe('apollo');
            });

            it('should extract seniority levels from titles', () => {
                const query = 'Find founders and C-suite executives in tech';
                const result = mapQueryToPayload(query);

                expect(result.payload.apollo_seniority_levels).toEqual(
                    expect.arrayContaining(['owner', 'c_suite'])
                );
            });
        });

        describe('Aircraft Operations Queries', () => {
            it('should map aircraft availability query', () => {
                const query =
                    'Check availability for a light jet from Teterboro to Miami next Tuesday for 4 passengers';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('aircraft_availability');
                expect(result.payload.avinode_departure_airport).toBe('KTEB');
                expect(result.payload.avinode_arrival_airport).toBe('KMIA');
                expect(result.payload.avinode_passengers).toBe(4);
                expect(result.payload.avinode_aircraft_category).toBe('Light Jet');
                expect(result.payload.routing_tool).toBe('avinode');
            });

            it('should map empty leg search query', () => {
                const query = 'Find empty legs from the Northeast to Florida this month';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('empty_leg_search');
                expect(result.payload.avinode_departure_region).toBe('Northeast');
                expect(result.payload.avinode_arrival_region).toBe('Florida');
                expect(result.payload.min_discount_percentage).toBe(40);
                expect(result.payload.routing_tool).toBe('avinode');
            });

            it('should map pricing quote query', () => {
                const query =
                    'Get a quote for a super midsize jet from Los Angeles to Las Vegas round trip';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('pricing_quote');
                expect(result.payload.avinode_route).toMatch(/KLAX.*KLAS|KLAS.*KLAX/);
                expect(result.payload.avinode_aircraft_category).toBe('Super Midsize Jet');
                expect(result.payload.trip_type).toBe('round_trip');
                expect(result.payload.include_all_fees).toBe(true);
                expect(result.payload.routing_tool).toBe('avinode');
            });
        });

        describe('Combined Scenarios', () => {
            it('should map lead generation with aircraft availability', () => {
                const query =
                    'Find Fortune 500 executives who need jets and show available aircraft from Chicago to NYC';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('combined_intel');
                expect(result.payload.routing_tool).toBe('both');
                expect(result.payload.match_prospects_to_availability).toBe(true);
                expect(result.payload.apollo_company_size).toBeDefined();
                expect(result.payload.avinode_departure_airport).toBeDefined();
            });
        });

        describe('Edge Cases and Clarification', () => {
            it('should request clarification for ambiguous queries', () => {
                const query = 'I need help with jets';
                const result = mapQueryToPayload(query);

                expect(result.requiresClarification).toBe(true);
                expect(result.category).toBe('needs_clarification');
                expect(result.clarificationQuestions).toBeDefined();
                expect(result.clarificationQuestions?.length).toBeGreaterThan(0);
            });

            it('should handle incomplete queries with partial confidence', () => {
                const query = 'Book a flight next week';
                const result = mapQueryToPayload(query);

                expect(result.confidence).toBeLessThan(0.8);
                expect(result.requiresClarification).toBe(true);
            });

            it('should handle queries with no matching patterns', () => {
                const query = 'random text that doesnt match anything';
                const result = mapQueryToPayload(query);

                expect(result.category).toBe('needs_clarification');
                expect(result.confidence).toBeLessThan(0.5);
            });
        });
    });

    describe('parseRelativeDate', () => {
        it('should parse "today" correctly', () => {
            const result = parseRelativeDate('today');
            expect(result).toBe('2024-01-15');
        });

        it('should parse "tomorrow" correctly', () => {
            const result = parseRelativeDate('tomorrow');
            expect(result).toBe('2024-01-16');
        });

        it('should parse "next Tuesday" correctly', () => {
            // January 15, 2024 is a Monday
            const result = parseRelativeDate('next Tuesday');
            expect(result).toBe('2024-01-16');
        });

        it('should parse "next week" as date range', () => {
            const result = parseRelativeDate('next week');
            expect(result).toMatch(/2024-01-\d+_2024-01-\d+/);
        });

        it('should parse "this month" as date range', () => {
            const result = parseRelativeDate('this month');
            expect(result).toBe('2024-01-01_2024-01-31');
        });

        it('should parse "next month" as date range', () => {
            const result = parseRelativeDate('next month');
            expect(result).toMatch(/2024-01-15_2024-02-\d+/);
        });

        it('should handle invalid date strings', () => {
            const result = parseRelativeDate('invalid date');
            expect(result).toBe('2024-01-15'); // Falls back to today
        });
    });

    describe('extractJobTitles', () => {
        it('should extract CEO variations', () => {
            const result = extractJobTitles('looking for ceo or chief executive');
            expect(result).toContain('CEO');
            expect(result).toContain('Chief Executive Officer');
        });

        it('should extract multiple C-suite titles', () => {
            const result = extractJobTitles('cfo and cto positions');
            expect(result).toContain('CFO');
            expect(result).toContain('CTO');
        });

        it('should extract VP variations', () => {
            const result = extractJobTitles('vp or vice president level');
            expect(result).toContain('VP');
            expect(result).toContain('Vice President');
        });

        it('should handle director titles', () => {
            const result = extractJobTitles('director or managing director');
            expect(result).toContain('Director');
            expect(result).toContain('Managing Director');
        });

        it('should return original text if no mapping found', () => {
            const result = extractJobTitles('random job title');
            expect(result).toContain('random job title');
        });

        it('should handle empty input', () => {
            const result = extractJobTitles('');
            expect(result).toEqual(['']);
        });
    });

    describe('extractIndustries', () => {
        it('should extract technology industries', () => {
            const result = extractIndustries('technology and tech companies');
            expect(result).toContain('Technology');
            expect(result).toContain('Software');
            expect(result).toContain('SaaS');
        });

        it('should extract fintech industries', () => {
            const result = extractIndustries('fintech startups');
            expect(result).toContain('Fintech');
            expect(result).toContain('Financial Technology');
        });

        it('should extract healthcare industries', () => {
            const result = extractIndustries('healthcare and pharma');
            expect(result).toContain('Healthcare');
            expect(result).toContain('Pharmaceutical');
        });

        it('should handle aviation industry', () => {
            const result = extractIndustries('aviation and private jets');
            expect(result).toContain('Aviation');
            expect(result).toContain('Private Aviation');
        });

        it('should return original text if no mapping found', () => {
            const result = extractIndustries('unknown industry');
            expect(result).toContain('unknown industry');
        });
    });

    describe('getAirportCode', () => {
        it('should return existing airport codes unchanged', () => {
            expect(getAirportCode('KTEB')).toBe('KTEB');
            expect(getAirportCode('JFK')).toBe('JFK');
        });

        it('should map city names to primary airports', () => {
            expect(getAirportCode('New York')).toBe('KTEB');
            expect(getAirportCode('Los Angeles')).toBe('KLAX');
            expect(getAirportCode('Chicago')).toBe('KMDW');
        });

        it('should handle case insensitive matching', () => {
            expect(getAirportCode('new york')).toBe('KTEB');
            expect(getAirportCode('NEW YORK')).toBe('KTEB');
        });

        it('should handle international airports', () => {
            expect(getAirportCode('London')).toBe('EGLL');
            expect(getAirportCode('Paris')).toBe('LFPB');
            expect(getAirportCode('Dubai')).toBe('OMDB');
        });

        it('should return uppercase unknown locations', () => {
            expect(getAirportCode('Unknown City')).toBe('UNKNOWN CITY');
        });
    });

    describe('normalizeAircraftCategory', () => {
        it('should normalize light jet variations', () => {
            expect(normalizeAircraftCategory('light jet')).toBe('Light Jet');
            expect(normalizeAircraftCategory('small jet')).toBe('Light Jet');
        });

        it('should normalize midsize jet variations', () => {
            expect(normalizeAircraftCategory('midsize jet')).toBe('Midsize Jet');
            expect(normalizeAircraftCategory('mid-size')).toBe('Midsize Jet');
        });

        it('should normalize super midsize variations', () => {
            expect(normalizeAircraftCategory('super midsize')).toBe('Super Midsize Jet');
            expect(normalizeAircraftCategory('super mid')).toBe('Super Midsize Jet');
        });

        it('should normalize heavy jet variations', () => {
            expect(normalizeAircraftCategory('heavy jet')).toBe('Heavy Jet');
            expect(normalizeAircraftCategory('large jet')).toBe('Heavy Jet');
        });

        it('should normalize ultra long range', () => {
            expect(normalizeAircraftCategory('ultra long range')).toBe('Ultra Long Range');
        });

        it('should default to Midsize Jet for unknown types', () => {
            expect(normalizeAircraftCategory('unknown type')).toBe('Midsize Jet');
        });
    });

    describe('Constants and Mappings', () => {
        it('should have valid AIRPORT_CODES mapping', () => {
            expect(AIRPORT_CODES).toBeDefined();
            expect(AIRPORT_CODES['new york']).toContain('KTEB');
            expect(AIRPORT_CODES['london']).toContain('EGLL');
        });

        it('should have valid JOB_TITLE_MAPPINGS', () => {
            expect(JOB_TITLE_MAPPINGS).toBeDefined();
            expect(JOB_TITLE_MAPPINGS['ceo']).toContain('CEO');
            expect(JOB_TITLE_MAPPINGS['executive']).toContain('CEO');
        });

        it('should have valid INDUSTRY_MAPPINGS', () => {
            expect(INDUSTRY_MAPPINGS).toBeDefined();
            expect(INDUSTRY_MAPPINGS['technology']).toContain('Software');
            expect(INDUSTRY_MAPPINGS['fintech']).toContain('Fintech');
        });

        it('should have valid AIRCRAFT_CATEGORIES', () => {
            expect(AIRCRAFT_CATEGORIES).toBeDefined();
            expect(AIRCRAFT_CATEGORIES['light']).toBe('Light Jet');
            expect(AIRCRAFT_CATEGORIES['heavy']).toBe('Heavy Jet');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complex real-world lead generation query', () => {
            const query =
                'I need to find CFOs and CTOs of Series B fintech companies in NYC with 100-500 employees who joined in the last 6 months';
            const result = mapQueryToPayload(query);

            expect(result.confidence).toBeGreaterThan(0.7);
            expect(result.category).toBeDefined();
            expect(result.payload.apollo_job_titles).toBeDefined();
            expect(result.payload.routing_tool).toBe('apollo');
        });

        it('should handle complex aviation query', () => {
            const query =
                'Get me availability and pricing for a heavy jet from Teterboro to London Farnborough next Friday for 8 passengers with catering';
            const result = mapQueryToPayload(query);

            expect(result.payload.avinode_departure_airport).toBe('KTEB');
            expect(result.payload.avinode_passengers).toBe(8);
            expect(result.payload.routing_tool).toBe('avinode');
        });

        it('should handle combined business intelligence query', () => {
            const query =
                'Find tech executives in Silicon Valley who might need charter flights to Davos for the World Economic Forum';
            const result = mapQueryToPayload(query);

            expect(result.payload.routing_tool).toBe('both');
            expect(result.payload.match_prospects_to_availability).toBeDefined();
        });
    });
});
