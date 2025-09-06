// This is a shared worker that handles database synchronization across tabs
// SharedWorkers are accessible from multiple browser contexts (tabs, windows)
// Using 'as any' for the self context to bypass TypeScript's type checking
// This is a pragmatic solution when TypeScript doesn't have built-in types for specialized contexts
const workerSelf = self;
// Ensure we don't redeclare variables if this module is processed multiple times
const workerConnections = globalThis.__workerConnections || new Set();
const broadcastChannel = globalThis.__broadcastChannel || new BroadcastChannel('chat-sync-channel');
// Store references to prevent redeclaration
globalThis.__workerConnections = workerConnections;
globalThis.__broadcastChannel = broadcastChannel;
// Handle messages from individual tabs
workerSelf.onconnect = (event) => {
    const port = event.ports[0];
    workerConnections.add(port);
    port.onmessage = (e) => {
        handleMessage(e.data, port);
    };
    port.start();
    // Remove connection when tab closes
    port.addEventListener('close', () => {
        workerConnections.delete(port);
    });
    // Send initial connection confirmation
    port.postMessage({ type: 'connected' });
};
// Handle broadcast channel messages (alternative approach)
if (broadcastChannel) {
    broadcastChannel.onmessage = event => {
        // Forward messages to all connected tabs
        for (const port of Array.from(workerConnections)) {
            port.postMessage(event.data);
        }
    };
}
// Handle messages from tabs - use existing function if already defined
const handleMessage = globalThis.__handleMessage || ((message, sourcePort) => {
    // Log the action for debugging
    if (message.type) {
        console.log(`[SharedWorker] Received ${message.type} event`);
    }
    // Broadcast message to all other connections (tabs)
    for (const port of Array.from(workerConnections)) {
        if (port !== sourcePort) {
            port.postMessage(message);
        }
    }
    // Alternative way to broadcast using BroadcastChannel
    // broadcastChannel.postMessage(message);
});
// Store reference to prevent redeclaration
globalThis.__handleMessage = handleMessage;
