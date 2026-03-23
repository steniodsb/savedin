import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SavedinTabType } from '@/types/savedin';

// UI-only state that stays in localStorage
interface UIState {
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
      }),
    }
  )
);
