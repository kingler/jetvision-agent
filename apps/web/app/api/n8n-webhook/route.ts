import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Extract the message from the request
        const { message, threadId, threadItemId, messages = [] } = body;
        
        console.log('Sending message to n8n webhook:', message);
        
        // Prepare the payload for n8n
        const n8nPayload = {
            message,
            threadId,
            threadItemId,
            context: messages.map((m: any) => ({
                role: m.role || 'user',
                content: m.query || m.answer?.text || ''
            })),
            timestamp: new Date().toISOString(),
            source: 'jetvision-agent'
        };
        
        // Send to n8n webhook with streaming support
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(N8N_API_KEY && { 'Authorization': `Bearer ${N8N_API_KEY}` })
            },
            body: JSON.stringify(n8nPayload)
        });
        
        if (!n8nResponse.ok) {
            throw new Error(`n8n webhook failed: ${n8nResponse.statusText}`);
        }
        
        // Stream the response back to the client
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send initial status
                    controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ 
                        status: 'processing',
                        message: 'Connecting to n8n workflow...',
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                    // Process n8n response
                    const n8nData = await n8nResponse.json();
                    
                    // Send the answer
                    controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({
                        answer: { text: n8nData.response || n8nData.message || 'Processing your request...' },
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                    // Send sources if available
                    if (n8nData.sources) {
                        controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify({
                            sources: n8nData.sources,
                            threadId,
                            threadItemId
                        })}\n\n`));
                    }
                    
                    // Send completion
                    controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
                        type: 'done',
                        threadId,
                        threadItemId
                    })}\n\n`));
                    
                } catch (error) {
                    console.error('n8n webhook error:', error);
                    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error',
                        threadId,
                        threadItemId
                    })}\n\n`));
                } finally {
                    controller.close();
                }
            }
        });
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            }
        });
        
    } catch (error) {
        console.error('n8n webhook error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 }
        );
    }
}