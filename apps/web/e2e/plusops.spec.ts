import { expect, test, type Page } from "@playwright/test";

const routes = [
  ["/dashboard", /Payments API|Operational room/i],
  ["/services", /Systems in motion/i],
  ["/incidents", /Response field/i],
  ["/health", /Health/i],
  ["/metrics", /Behavior moving through time/i],
  ["/alerts", /Alert controls/i],
  ["/ai", /What do you want to know/i]
] as const;

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1152, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 }
];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("manager@plusops.local");
  await page.getByLabel("Password").fill("PlusOpsDev123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function cleanupE2EIncidents(page: Page) {
  const loginResponse = await page.request.post("http://127.0.0.1:4020/api/v1/auth/login", {
    data: { email: "manager@plusops.local", password: "PlusOpsDev123!" }
  });
  const { accessToken } = await loginResponse.json();
  const headers = { authorization: `Bearer ${accessToken}` };
  const incidentsResponse = await page.request.get(
    "http://127.0.0.1:4020/api/v1/incidents?search=E2E%20checkout%20latency&pageSize=100",
    { headers }
  );
  const incidents = (await incidentsResponse.json()).data ?? [];

  for (const incident of incidents) {
    await page.request.delete(`http://127.0.0.1:4020/api/v1/incidents/${incident.id}`, { headers });
  }
}

async function expectSpatialNodesNotToOverlap(page: Page, route: string, width: number) {
  const overlaps = await page.locator(".signal-node:visible, .system-field__node:visible").evaluateAll((nodes) => {
    const boxes = nodes.map((node) => ({
      label: node.getAttribute("aria-label") ?? node.textContent?.replace(/\s+/g, " ").trim() ?? "node",
      rect: node.getBoundingClientRect()
    }));

    return boxes.flatMap((left, index) =>
      boxes.slice(index + 1).flatMap((right) => {
        const overlapWidth = Math.max(0, Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left));
        const overlapHeight = Math.max(0, Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top));
        const overlapArea = overlapWidth * overlapHeight;
        const smallerArea = Math.min(left.rect.width * left.rect.height, right.rect.width * right.rect.height);
        return overlapArea > smallerArea * 0.12 ? [`${left.label} overlaps ${right.label}`] : [];
      })
    );
  });

  expect(overlaps, `${route} at ${width}px has overlapping spatial nodes`).toEqual([]);
}

test("major live routes remain usable across supported viewports", async ({ browser }) => {
  test.setTimeout(300_000);

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await login(page);
    for (const [route, expectedText] of routes) {
      await page.goto(route);
      await expect(page.getByRole("main").getByText(expectedText).first()).toBeVisible();
      await expect(page.getByText(/API unavailable|Using demo fallback/i)).toHaveCount(0);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(dimensions.scrollWidth, `${route} at ${viewport.width}px overflows horizontally`).toBeLessThanOrEqual(
        dimensions.clientWidth + 1
      );
      await expectSpatialNodesNotToOverlap(page, route, viewport.width);
    }

    expect(runtimeErrors, `runtime errors at ${viewport.width}px`).toEqual([]);
    await context.close();
  }
});

test("engineer can inspect a live service and navigate to its persisted detail", async ({ page }) => {
  await login(page);
  await page.goto("/services");
  await page.getByRole("button", { name: /Payments API,/ }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Payments API" })).toBeVisible();
  await page.getByRole("link", { name: "View service" }).click();
  await expect(page).toHaveURL(/\/services\/[0-9a-f-]+$/);
  await expect(page.getByText("Payments API").first()).toBeVisible();
});

test("manager can create and resolve an incident through the UI", async ({ page }) => {
  await cleanupE2EIncidents(page);
  await login(page);
  await page.goto("/incidents");
  await page.getByRole("button", { name: "Create incident" }).first().click();
  const title = `E2E checkout latency ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Affected service").selectOption({ label: "Checkout" });
  await page.getByLabel("Description").fill("Browser-created incident for the release verification workflow.");
  await page.getByRole("button", { name: "Create incident" }).last().click();
  await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]+$/);
  await expect(page.getByText(title).first()).toBeVisible();

  const status = page.locator("select").filter({ hasText: "Investigating" }).first();
  const incidentId = page.url().split("/").at(-1)!;
  try {
    for (const nextStatus of ["investigating", "identified", "mitigated", "monitoring"]) {
      await status.selectOption(nextStatus);
      await expect(status).toHaveValue(nextStatus);
    }
    await page.getByLabel("Resolution summary").fill("Checkout recovered after dependency latency returned below threshold.");
    await page.getByRole("button", { name: "Resolve incident" }).click();
    await expect(page.getByText(/Resolved/i).first()).toBeVisible();
  } finally {
    const loginResponse = await page.request.post("http://127.0.0.1:4020/api/v1/auth/login", {
      data: { email: "manager@plusops.local", password: "PlusOpsDev123!" }
    });
    const { accessToken } = await loginResponse.json();
    await page.request.delete(`http://127.0.0.1:4020/api/v1/incidents/${incidentId}`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
  }
});

test("AI request uses the configured provider with grounded PostgreSQL context", async ({ page }) => {
  await login(page);
  await page.goto("/ai");
  await expect(page.getByText("AI provider not configured")).toHaveCount(0);
  const prompt = page.getByLabel("Ask PlusOps");
  await prompt.fill("Explain the selected operational signal using only known facts.");
  await prompt.locator("xpath=..").getByRole("button", { name: "Send through core" }).click();
  const answer = page.locator('.ai-path-row[data-role="assistant"] p').first();
  await expect(answer).toContainText("Facts");
  await expect(answer).toContainText("authoritative PlusOps PostgreSQL operational context");
  await expect(answer).toContainText("Recommended next actions");
  await expect(answer).toContainText("Uncertainty");
});

test("logout revokes the browser session and returns to login", async ({ page }) => {
  await login(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
