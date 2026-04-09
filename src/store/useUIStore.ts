import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SavedinTabType } from '@/types/savedin';

export type ViewMode = 'competencia' | 'caixa';

// UI-only state that stays in localStorage
interface UIState {
  // Environment
  selectedEnvironmentId: string | null; // null = "All environments"
  setSelectedEnvironmentId: (id: string | null) => void;

  // View mode: competencia = by purchase date, caixa = by invoice month
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // UI State
  activeTab: SavedinTabType;
  setActiveTab: (tab: SavedinTabType) => void;

  // Deep link to open specific item details
  pendingTransactionToEdit: string | null;
  setPendingTransactionToEdit: (id: string | null) => void;
  pendingAccountToEdit: string | null;
  setPendingAccountToEdit: (id: string | null) => void;
  pendingCardToView: string | null;
  setPendingCardToView: (id: string | null) => void;
  pendingGoalToView: string | null;
  setPendingGoalToView: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Environment
      selectedEnvironmentId: null,
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),

      // View mode
      viewMode: 'competencia',
      setViewMode: (mode) => set({ viewMode: mode }),

      // UI State
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Deep link state
      pendingTransactionToEdit: null,
      setPendingTransactionToEdit: (id) => set({ pendingTransactionToEdit: id }),
      pendingAccountToEdit: null,
      setPendingAccountToEdit: (id) => set({ pendingAccountToEdit: id }),
      pendingCardToView: null,
      setPendingCardToView: (id) => set({ pendingCardToView: id }),
      pendingGoalToView: null,
      setPendingGoalToView: (id) => set({ pendingGoalToView: id }),
    }),
    {
      name: 'savedin-ui-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedEnvironmentId: state.selectedEnvironmentId,
        viewMode: state.viewMode,
      }),
    }
  )
);
