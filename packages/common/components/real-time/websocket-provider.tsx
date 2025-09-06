'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebSocketMessage {
    type: 'lead_update' | 'flight_status' | 'campaign_update' | 'system_alert';
    data: any;
    timestamp: string;
}

interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
    sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
    children: React.ReactNode;
    url?: string;
}

export function WebSocketProvider({
    children,
    url = 'ws://localhost:8123/ws',
}: WebSocketProviderProps) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<
        'connected' | 'connecting' | 'disconnected' | 'error'
    >('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

    const sendMessage = (message: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    };

    useEffect(() => {
        let ws: WebSocket;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            setConnectionStatus('connecting');

            try {
                ws = new WebSocket(url);

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setConnectionStatus('connected');
                    setSocket(ws);

                    // Send heartbeat every 30 seconds
                    const heartbeat = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);

                    ws.heartbeatInterval = heartbeat;
                };

                ws.onmessage = event => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        setLastMessage(message);

                        // Handle different message types
                        switch (message.type) {
                            case 'lead_update':
                                console.log('New lead update:', message.data);
                                break;
                            case 'flight_status':
                                console.log('Flight status update:', message.data);
                                break;
                            case 'campaign_update':
                                console.log('Campaign update:', message.data);
                                break;
                            case 'system_alert':
                                console.log('System alert:', message.data);
                                break;
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                ws.onclose = event => {
                    console.log('WebSocket disconnected:', event.reason);
                    setIsConnected(false);
                    setConnectionStatus('disconnected');
                    setSocket(null);

                    if (ws.heartbeatInterval) {
                        clearInterval(ws.heartbeatInterval);
                    }

                    // Attempt to reconnect after 5 seconds
                    if (!event.wasClean) {
                        reconnectTimeout = setTimeout(() => {
                            console.log('Attempting to reconnect...');
                            connect();
                        }, 5000);
                    }
                };

                ws.onerror = error => {
                    console.error('WebSocket error:', error);
                    setConnectionStatus('error');
                };
            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                setConnectionStatus('error');

                // Try to reconnect after 10 seconds on error
                reconnectTimeout = setTimeout(() => {
                    connect();
                }, 10000);
            }
        };

        // Initialize connection
        connect();

        // Cleanup on unmount
        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (ws) {
                if (ws.heartbeatInterval) {
                    clearInterval(ws.heartbeatInterval);
                }
                ws.close(1000, 'Component unmounting');
            }
        };
    }, [url]);

    const value: WebSocketContextType = {
        isConnected,
        lastMessage,
        connectionStatus,
        sendMessage,
    };

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

// Add heartbeatInterval property to WebSocket type
declare global {
    interface WebSocket {
        heartbeatInterval?: NodeJS.Timeout;
    }
}
