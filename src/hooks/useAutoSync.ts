import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAutoSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = async () => {
      console.log('🔄 Iniciando sincronização automática...');
      
      try {
        // Refetch todas as queries ativas para buscar dados atualizados
        await queryClient.refetchQueries({
          type: 'active',
        });
        
        console.log('✅ Sincronização completa!');
        toast.success('Sincronizado com sucesso!', {
          description: 'Seus dados foram atualizados.',
          duration: 3000,
        });
      } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        toast.error('Erro ao sincronizar', {
          description: 'Tente novamente mais tarde.',
        });
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);
}
