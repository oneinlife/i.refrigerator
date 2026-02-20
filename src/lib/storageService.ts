import type { InventoryItem } from '@/types/inventory';

const STORAGE_KEYS = {
  INVENTORY: 'refrigerator_inventory',
  GOOGLE_TOKEN: 'google_access_token',
  GOOGLE_CLIENT_ID: 'google_client_id',
  SPREADSHEET_ID: 'google_spreadsheet_id',
  SHEET_NAME: 'google_sheet_name',
  AUTO_SYNC: 'auto_sync_enabled',
  SYNC_INTERVAL: 'sync_interval_minutes',
} as const;

export const storageService = {
  // Инвентарь
  getInventory(): InventoryItem[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return data ? JSON.parse(data) : [];
  },

  setInventory(items: InventoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  },

  addItem(item: InventoryItem): void {
    const items = this.getInventory();
    items.push(item);
    this.setInventory(items);
  },

  updateItem(updatedItem: InventoryItem): boolean {
    const items = this.getInventory();
    const index = items.findIndex((item) => item.inventory_id === updatedItem.inventory_id);
    if (index === -1) return false;
    items[index] = updatedItem;
    this.setInventory(items);
    return true;
  },

  deleteItem(id: string): boolean {
    console.log('storageService.deleteItem called with id:', id);
    const items = this.getInventory();
    console.log('Current inventory items count:', items.length);
    const filtered = items.filter((item) => item.inventory_id !== id);
    console.log('Filtered inventory items count:', filtered.length);
    if (filtered.length === items.length) {
      console.warn('Item not found in inventory:', id);
      return false;
    }
    this.setInventory(filtered);
    console.log('Item deleted, new inventory saved');
    return true;
  },

  // Google настройки
  getGoogleToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN);
  },

  setGoogleToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, token);
  },

  removeGoogleToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN);
  },

  getGoogleClientId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID);
  },

  setGoogleClientId(clientId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId);
  },

  getSpreadsheetId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  },

  setSpreadsheetId(spreadsheetId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
  },

  getSheetName(): string {
    if (typeof window === 'undefined') return 'Inventory';
    return localStorage.getItem(STORAGE_KEYS.SHEET_NAME) || 'Inventory';
  },

  setSheetName(sheetName: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SHEET_NAME, sheetName);
  },

  getAutoSync(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
  },

  setAutoSync(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled.toString());
  },

  getSyncInterval(): number {
    if (typeof window === 'undefined') return 5;
    const interval = localStorage.getItem(STORAGE_KEYS.SYNC_INTERVAL);
    return interval ? parseInt(interval, 10) : 5;
  },

  setSyncInterval(minutes: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SYNC_INTERVAL, minutes.toString());
  },

  // Проверка настроек
  isConfigured(): boolean {
    return !!(this.getGoogleClientId() && this.getSpreadsheetId());
  },

  // Очистка всех данных
  clearAll(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },
};
