import { expect, test } from "@playwright/test"
import { loginViaApi, USERS } from "./helpers"

test("buyer pays through the embeddable widget on a partner page", async ({ page, context, playwright, baseURL }) => {
  // The seller id is public — it's what the partner pastes into data-seller.
  const sellerCtx = await playwright.request.newContext({ baseURL })
  const seller = await loginViaApi(sellerCtx, USERS.seller)

  await loginViaApi(context.request, USERS.buyer)
  await page.goto(`/widget-demo.html?seller=${seller.id}`)

  const button = page.locator("[data-paypack-button]").first().getByRole("button", { name: "Pay safely with PayPack" })
  await expect(button).toBeVisible()

  const popupPromise = page.waitForEvent("popup")
  await button.click()
  const popup = await popupPromise
  await expect(popup.getByText("QA Seller")).toBeVisible()
  await expect(popup.getByText("684.50 EUR")).toBeVisible() // 650 + 15 shipping + 3% fee
  await popup.getByRole("button", { name: "Create secure deal" }).click()
  await expect(popup.getByRole("heading", { name: "Deal created" })).toBeVisible()

  // The partner page hears about it through postMessage.
  await expect(page.locator("#log")).toContainText("PayPack deal created:")
  const dealId = (await page.locator("#log").textContent())!.split(":").pop()!.trim()

  // And the seller sees the deal, already attached as seller.
  const deals = await (await sellerCtx.get("/api/deals/")).json()
  const deal = deals.find((d: { id: string }) => d.id === dealId)
  expect(deal).toBeTruthy()
  expect(deal.myRole).toBe("seller")
  await sellerCtx.dispose()
})

test("checkout rejects incomplete links", async ({ page }) => {
  await page.goto("/checkout/?seller=not-a-uuid&title=x&price=0")
  await expect(page.getByText("This checkout link isn't valid")).toBeVisible()
})
