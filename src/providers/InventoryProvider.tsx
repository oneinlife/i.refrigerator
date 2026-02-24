'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem, InventoryItemWithProduct, CreateInventoryInput } from '@/types/inventory';

interface InventoryModalState {
  isOpen: boolean;
  editItem: InventoryItem | null;
}

interface InventoryContextValue {
  // Данные инвентаря
  inventory: InventoryItemWithProduct[];
  loading: boolean;
  error: string | null;
  
  // Операции с инвентарем
  loadInventory: () => Promise<void>;
  addInventoryItem: (input: CreateInventoryInput) => Promise<InventoryItem | null>;
  updateInventoryItem: (item: InventoryItem) => Promise<boolean>;
  deleteInventoryItem: (inventoryId: string) => Promise<boolean>;
  getInventoryItem: (inventoryId: string) => InventoryItemWithProduct | null;
  searchInventory: (query: string) => InventoryItemWithProduct[];
  getExpiredItems: () => InventoryItemWithProduct[];
  getExpiringItems: (days?: number) => InventoryItemWithProduct[];
  
  // Управление модальным окном
  modalState: InventoryModalState;
  openAddModal: () => void;
  openEditModal: (item: InventoryItem) => void;
  closeModal: () => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventoryContext() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryContext must be used within InventoryProvider');
  }
  return context;
}

interface InventoryProviderProps {
  children: ReactNode;
}

export function InventoryProvider({ children }: InventoryProviderProps) {
  const inventoryHook = useInventory();
  const [modalState, setModalState] = useState<InventoryModalState>({
    isOpen: false,
    editItem: null,
  });

  const openAddModal = useCallback(() => {
    setModalState({
      isOpen: true,
      editItem: null,
    });
  }, []);

  const openEditModal = useCallback((item: InventoryItem) => {
    setModalState({
      isOpen: true,
      editItem: item,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      editItem: null,
    });
  }, []);

  const value: InventoryContextValue = {
    ...inventoryHook,
    modalState,
    openAddModal,
    openEditModal,
    closeModal,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
