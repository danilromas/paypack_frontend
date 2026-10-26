import { expect, test } from "@playwright/test"

// Read-only checks, safe to run against production: E2E_BASE_URL=https://paypack.uno npm run test:smoke
test.describe("@smoke", () => {
  test("landing page loads", async ({ page }) => {
    const res = await page.goto("/")
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/PayPack/)
  })

  test("sign-in page renders", async ({ page }) => {
    await page.goto("/auth/")
    await expect(page.getByRole("tab", { name: "Log in" })).toBeVisible()
  })

  test("API is up and protects private routes", async ({ request }) => {
    expect((await request.get("/api/auth/me/")).status()).toBe(401)
    expect((await request.get("/api/admin/transactions/")).status()).toBe(401)
  })

  test("widget script and API docs are served", async ({ request }) => {
    const widget = await request.get("/widget.js")
    expect(widget.status()).toBe(200)
    expect(await widget.text()).toContain("PayPack")
    const spec = await request.get("/openapi.json")
    expect(spec.status()).toBe(200)
    expect((await spec.json()).openapi).toMatch(/^3\./)
  })
})
