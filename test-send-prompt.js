// Test script to verify n8n webhook integration
// This simulates sending a message through the JetVision Agent

const testPrompt = {
    prompt: "Check aircraft availability for Miami to New York tomorrow",
    fullPrompt: "As a JetVision fleet operations specialist, search for available aircraft for tomorrow's flight from Miami International Airport (MIA) to New York area airports (JFK, LGA, or TEB). Query the Avinode marketplace to identify: 1) Available aircraft types and tail numbers, 2) Seating capacity and cabin configurations, 3) Operator information and safety ratings, 4) Estimated flight times and fuel stops if required, 5) Hourly rates and total trip costs. Filter results by: Light jets (4-7 passengers), Mid-size jets (6-9 passengers), and Heavy jets (9-16 passengers). Include empty leg opportunities if available. Format the response as a structured comparison table with recommendations based on passenger count and budget requirements.",
    parameters: {
        departure: 'MIA',
        arrival: ['JFK', 'LGA', 'TEB'],
        date: 'tomorrow',
        passengerCount: null,
        aircraftCategories: ['light', 'midsize', 'heavy']
    }
};

// Make a direct POST request to the n8n webhook endpoint
async function testN8nWebhook() {
    const webhookUrl = 'http://localhost:3002/api/n8n-webhook';
    
    const payload = {
        prompt: testPrompt.fullPrompt,
        message: testPrompt.fullPrompt,
        threadId: "test-" + Date.now(),
        threadItemId: "item-" + Date.now(),
        context: {
            source: "jetvision-agent-test",
            timestamp: new Date().toISOString(),
            useWebSearch: false,
            hasImageAttachment: false,
            parameters: testPrompt.parameters
        },
        intent: "fleet_operations",
        expectedOutput: {
            format: "structured",
            includeVisualization: true,
            includeRecommendations: true
        }
    };
    
    try {
        console.log('Sending test message to n8n webhook...');
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.text();
            console.log('Response from n8n:', result);
        } else {
            console.error('Error response:', response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('Failed to send test message:', error);
    }
}

// Run the test
testN8nWebhook();