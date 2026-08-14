import { create } from "zustand";

type UIState = {
  isCommandPaletteOpen: boolean;
  isNotificationCenterOpen: boolean;
  selectedIncidentId: string | null;
  selectedServiceId: string | null;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  setSelectedIncidentId: (incidentId: string | null) => void;
  setSelectedServiceId: (serviceId: string | null) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isCommandPaletteOpen: false,
  isNotificationCenterOpen: false,
  selectedIncidentId: null,
  selectedServiceId: null,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  openNotificationCenter: () => set({ isNotificationCenterOpen: true }),
  closeNotificationCenter: () => set({ isNotificationCenterOpen: false }),
  setSelectedIncidentId: (incidentId) => set({ selectedIncidentId: incidentId }),
  setSelectedServiceId: (serviceId) => set({ selectedServiceId: serviceId })
}));
