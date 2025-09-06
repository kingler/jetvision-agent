/**
 * User Sync Hook
 * Automatically syncs Clerk user with Supabase database
 */

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export function useUserSync() {
    const { user, isSignedIn, isLoaded } = useUser();
    const [isSynced, setIsSynced] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function syncUser() {
            if (!isLoaded || !isSignedIn || !user || isSynced || isSyncing) {
                return;
            }

            setIsSyncing(true);
            setError(null);

            try {
                const response = await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to sync user');
                }

                const data = await response.json();

                if (data.success) {
                    setIsSynced(true);
                    console.log('User synced successfully:', data.user);
                } else {
                    throw new Error(data.error || 'Sync failed');
                }
            } catch (err) {
                console.error('User sync error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsSyncing(false);
            }
        }

        syncUser();
    }, [user, isSignedIn, isLoaded, isSynced, isSyncing]);

    return {
        isSynced,
        isSyncing,
        error,
        retry: () => {
            setIsSynced(false);
            setError(null);
        },
    };
}
