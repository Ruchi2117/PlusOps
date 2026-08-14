import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NotificationsPage } from "./notifications-page";

describe("NotificationsPage", () => {
  it("renders the notification inbox", () => {
    const markup = renderToStaticMarkup(<NotificationsPage />);

    expect(markup).toContain("Notifications");
    expect(markup).toContain("Payments API latency alert firing");
  });
});
