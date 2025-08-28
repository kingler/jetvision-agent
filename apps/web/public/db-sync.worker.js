// This is a shared worker that handles database synchronization across tabs
// SharedWorkers are accessible from multiple browser contexts (tabs, windows)

const connections = new Set();
const broadcastChannel = new BroadcastChannel('chat-sync-channel');

// Handle connections from individual tabs
self.onconnect = (event) => {
    const port = event.ports[0];
    connections.add(port);

    port.onmessage = (e) => {
        handleMessage(e.data, port);
    };

    port.start();

    // Remove connection when tab closes
    port.addEventListener('close', () => {
        connections.delete(port);
    });

    // Send initial connection confirmation
    port.postMessage({ type: 'connected' });
};

// Handle broadcast channel messages (alternative approach)
broadcastChannel.onmessage = event => {
    // Forward messages to all connected tabs
    for (const port of Array.from(connections)) {
        port.postMessage(event.data);
    }
};

// Handle messages from tabs
function handleMessage(message, sourcePort) {
    // Log the action for debugging
    if (message.type) {
        console.log(`[SharedWorker] Received ${message.type} event`);
    }

    // Broadcast message to all other connections (tabs)
    for (const port of Array.from(connections)) {
        if (port !== sourcePort) {
            port.postMessage(message);
        }
    }

    // Also broadcast via BroadcastChannel for redundancy
    broadcastChannel.postMessage(message);
}

// Handle errors
self.onerror = (error) => {
    console.error('[SharedWorker] Error:', error);
    // Notify all connections about the error
    for (const port of Array.from(connections)) {
        port.postMessage({ type: 'error', error: error.message });
    }
};
