import { expect, test } from "@playwright/test"
import { loginViaApi, loginViaUi, USERS } from "./helpers"

test.describe("admin panel", () => {
  test("transactions page filters and exports CSV", async ({ page }) => {
    await loginViaUi(page, USERS.admin)
    await page.goto("/admin/transactions/")
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible()

    await page.getByLabel("Status").selectOption("pending")
    await expect(page.getByText(/records? • page 1/)).toBeVisible()

    const download = page.waitForEvent("download")
    await page.getByRole("link", { name: "Export CSV" }).click()
    expect((await download).suggestedFilename()).toMatch(/^paypack-deals-\d{4}-\d{2}-\d{2}\.csv$/)

    await page.getByRole("button", { name: "Wallet ledger" }).click()
    await expect(page.getByLabel("Type")).toBeVisible()
  })

  test("restricting a user blocks money movement until reinstated", async ({ page, playwright, baseURL }) => {
    await loginViaUi(page, USERS.admin)
    await page.goto("/admin/users/")
    await page.getByPlaceholder("Search by name or email...").fill(USERS.buyer.email)
    await page.getByRole("button", { name: "Manage" }).first().click()

    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder(/Reason/).fill("E2E: chargeback review")
    await dialog.getByRole("button", { name: "Restrict" }).click()
    await expect(dialog).toBeHidden()

    // A separate session for the restricted user.
    const buyer = await playwright.request.newContext({ baseURL })
    await loginViaApi(buyer, USERS.buyer)
    const blocked = await buyer.post("/api/wallet/topup/", { data: { amount: 10 } })
    expect(blocked.status()).toBe(403)
    expect((await blocked.json()).error).toMatch(/restricted/i)

    await page.getByRole("button", { name: "Manage" }).first().click()
    await expect(dialog.getByText("E2E: chargeback review").first()).toBeVisible()
    await dialog.getByRole("button", { name: "Reinstate" }).click()
    await expect(dialog).toBeHidden()

    const allowed = await buyer.post("/api/wallet/topup/", { data: { amount: 10 } })
    expect(allowed.status()).toBe(201)
    await buyer.dispose()
  })

  test("suspended users can't sign in", async ({ request, playwright, baseURL }) => {
    await loginViaApi(request, USERS.admin)
    const users = await (await request.get(`/api/admin/users/?q=${encodeURIComponent(USERS.seller.email)}`)).json()
    const seller = users[0]

    const suspend = await request.post(`/api/admin/users/${seller.id}/moderate/`, { data: { action: "suspend", reason: "E2E" } })
    expect(suspend.status()).toBe(200)
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.post("/api/auth/login/", { data: USERS.seller })).status()).toBe(403)

    const reinstate = await request.post(`/api/admin/users/${seller.id}/moderate/`, { data: { action: "reinstate" } })
    expect(reinstate.status()).toBe(200)
    expect((await anon.post("/api/auth/login/", { data: USERS.seller })).status()).toBe(200)
    await anon.dispose()
  })
})
