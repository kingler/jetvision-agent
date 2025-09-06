// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/jetvision-agent';
process.env.N8N_API_KEY = 'test-api-key';
process.env.N8N_API_URL = 'http://localhost:5678/api/v1';

// Mock TextEncoder and TextDecoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

// Mock ReadableStream for SSE tests
if (typeof ReadableStream === 'undefined') {
    global.ReadableStream = class {
        constructor(source) {
            this.source = source;
        }

        getReader() {
            return {
                read: jest.fn().mockResolvedValue({ value: new Uint8Array(), done: false }),
                cancel: jest.fn(),
            };
        }
    };
}

// Mock Web API globals for Next.js server components
if (typeof Request === 'undefined') {
    global.Request = class {
        constructor(url, options = {}) {
            this.url = url;
            this.method = options.method || 'GET';
            this.headers = new Map(Object.entries(options.headers || {}));
        }
    };
}

if (typeof Response === 'undefined') {
    global.Response = class {
        constructor(body, options = {}) {
            this.body = body;
            this.status = options.status || 200;
            this.headers = new Map(Object.entries(options.headers || {}));
        }

        json() {
            return Promise.resolve(JSON.parse(this.body));
        }
    };
}

if (typeof Headers === 'undefined') {
    global.Headers = Map;
}
