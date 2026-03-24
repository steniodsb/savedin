// SaveDin combined store - provides unified access to all financial data hooks
import { useUIStore } from './useUIStore';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useFinancialGoalsData } from '@/hooks/useFinancialGoalsData';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';

export function useStore() {
  const uiStore = useUIStore();
  const environmentsData = useEnvironmentsData();
  const accountsData = useAccountsData();
  const transactionsData = useTransactionsData();
  const creditCardsData = useCreditCardsData();
  const goalsData = useFinancialGoalsData();
  const budgetsData = useBudgetsData();
  const categoriesData = useSavedinCategories();
  const tagsData = useTagsData();

  const isLoading = environmentsData.isLoading || accountsData.isLoading ||
    transactionsData.isLoading || creditCardsData.isLoading || goalsData.isLoading ||
    budgetsData.isLoading || categoriesData.isLoading || tagsData.isLoading;

  return {
    isLoading,

    // Environments
    ...environmentsData,

    // Accounts
    ...accountsData,

    // Transactions
    ...transactionsData,

    // Credit Cards & Invoices
    ...creditCardsData,

    // Financial Goals
    ...goalsData,

    // Budgets
    ...budgetsData,

    // Categories
    ...categoriesData,

    // Tags
    ...tagsData,

    // Environment UI
    selectedEnvironmentId: uiStore.selectedEnvironmentId,
    setSelectedEnvironmentId: uiStore.setSelectedEnvironmentId,

    // UI State
    activeTab: uiStore.activeTab,
    setActiveTab: uiStore.setActiveTab,

    // Deep link state
    pendingTransactionToEdit: uiStore.pendingTransactionToEdit,
    setPendingTransactionToEdit: uiStore.setPendingTransactionToEdit,
    pendingAccountToEdit: uiStore.pendingAccountToEdit,
    setPendingAccountToEdit: uiStore.setPendingAccountToEdit,
    pendingCardToView: uiStore.pendingCardToView,
    setPendingCardToView: uiStore.setPendingCardToView,
    pendingGoalToView: uiStore.pendingGoalToView,
    setPendingGoalToView: uiStore.setPendingGoalToView,
  };
}
