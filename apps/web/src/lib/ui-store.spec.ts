import { describe, expect, it } from "vitest";

import { useUIStore } from "./ui-store";

describe("useUIStore", () => {
  it("toggles the command palette", () => {
    useUIStore.setState({ isCommandPaletteOpen: false });

    useUIStore.getState().toggleCommandPalette();

    expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);
  });

  it("tracks selected operational records", () => {
    useUIStore.getState().setSelectedIncidentId("incident-1");
    useUIStore.getState().setSelectedServiceId("service-1");

    expect(useUIStore.getState().selectedIncidentId).toBe("incident-1");
    expect(useUIStore.getState().selectedServiceId).toBe("service-1");
  });
});
