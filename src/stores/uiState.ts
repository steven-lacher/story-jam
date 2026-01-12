import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

export interface UIState {
  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;

  // Toast notifications
  toasts: Toast[];

  // Modals
  activeModal: Modal | null;

  // Round timer
  roundTimeRemaining: number | null;
  isTimerActive: boolean;

  // UI flags
  isSidebarOpen: boolean;
  isStoryViewExpanded: boolean;

  // Actions - Loading
  setLoading: (isLoading: boolean, message?: string) => void;

  // Actions - Toasts
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Actions - Modals
  openModal: (component: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Actions - Timer
  setRoundTimer: (seconds: number) => void;
  updateRoundTimer: (seconds: number) => void;
  startTimer: () => void;
  stopTimer: () => void;

  // Actions - UI flags
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleStoryView: () => void;
  setStoryViewExpanded: (isExpanded: boolean) => void;

  // Reset
  resetUI: () => void;
}

const initialState = {
  isLoading: false,
  loadingMessage: null,
  toasts: [],
  activeModal: null,
  roundTimeRemaining: null,
  isTimerActive: false,
  isSidebarOpen: false,
  isStoryViewExpanded: false,
};

export const useUIState = create<UIState>((set) => ({
  ...initialState,

  // Loading
  setLoading: (isLoading, message) =>
    set({
      isLoading,
      loadingMessage: message || null,
    }),

  // Toasts
  showToast: (message, type = 'info', duration = 3000) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: `toast-${Date.now()}-${Math.random()}`,
          message,
          type,
          duration,
        },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  // Modals
  openModal: (component, props) =>
    set({
      activeModal: {
        id: `modal-${Date.now()}`,
        component,
        props,
      },
    }),

  closeModal: () => set({ activeModal: null }),

  // Timer
  setRoundTimer: (seconds) =>
    set({
      roundTimeRemaining: seconds,
      isTimerActive: false,
    }),

  updateRoundTimer: (seconds) =>
    set({
      roundTimeRemaining: seconds,
    }),

  startTimer: () => set({ isTimerActive: true }),

  stopTimer: () =>
    set({
      isTimerActive: false,
      roundTimeRemaining: null,
    }),

  // UI flags
  toggleSidebar: () =>
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    })),

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  toggleStoryView: () =>
    set((state) => ({
      isStoryViewExpanded: !state.isStoryViewExpanded,
    })),

  setStoryViewExpanded: (isExpanded) =>
    set({ isStoryViewExpanded: isExpanded }),

  // Reset
  resetUI: () => set(initialState),
}));
