import { defineConfig, devices } from "@playwright/test"

// E2E_BASE_URL points the suite at an already-running deployment (e.g. the smoke run against production);
// otherwise Playwright starts the app itself.
const externalBaseUrl = process.env.E2E_BASE_URL
const baseURL = externalBaseUrl ?? "http://localhost:3000"

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
