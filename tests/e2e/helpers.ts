import { expect, type APIRequestContext, type Page } from "@playwright/test"

// Accounts created by scripts/seed.mjs.
export const USERS = {
  admin: { email: "admin@paypack.uno", password: "password123" },
  demo: { email: "demo@paypack.uno", password: "password123" },
  seller: { email: "qa-seller@paypack.test", password: "Pp-yzYwDlquV3oG" },
  buyer: { email: "qa-buyer@paypack.test", password: "Pp-yzYwDlquV3oG" },
} as const

export async function loginViaUi(page: Page, user: { email: string; password: string }) {
  await page.goto("/auth/")
  const form = page.getByRole("tabpanel")
  await form.getByLabel("Email").fill(user.email)
  await form.getByLabel("Password").fill(user.password)
  await form.getByRole("button", { name: "Log in" }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

/** Signs the request context (and any page sharing it) in through the API — faster than the form. */
export async function loginViaApi(request: APIRequestContext, user: { email: string; password: string }) {
  const res = await request.post("/api/auth/login/", { data: user })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as { id: string; email: string; role: string }
}
