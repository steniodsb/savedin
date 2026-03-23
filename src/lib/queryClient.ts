import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Criar o Query Client com configurações offline-first
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 24 horas
      gcTime: 1000 * 60 * 60 * 24,
      // Considera dados frescos por 5 minutos
      staleTime: 1000 * 60 * 5,
      // Tenta 3 vezes antes de falhar
      retry: 3,
      // Delay exponencial entre retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // CRÍTICO: Permite queries funcionarem offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // CRÍTICO: Permite mutations funcionarem offline
      networkMode: 'offlineFirst',
      // Tenta 3 vezes
      retry: 3,
    },
  },
});

// Criar persister usando localStorage
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'SAVEDIN_CACHE',
});
