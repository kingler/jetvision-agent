/**
 * Database Provider
 * Ensures user is synced with database and provides database context
 */

'use client';

import { useUserSync } from '@/lib/hooks/use-user-sync';
import { createContext, useContext, ReactNode } from 'react';

interface DatabaseContextType {
  isSynced: boolean;
  isSyncing: boolean;
  error: string | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isSynced: false,
  isSyncing: false,
  error: null,
  retry: () => {},
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const sync = useUserSync();

  return (
    <DatabaseContext.Provider value={sync}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}