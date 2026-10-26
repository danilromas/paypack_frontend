import { expect, test } from "@playwright/test"
import { loginViaUi, USERS } from "./helpers"

test("user signs in and reaches the dashboard", async ({ page }) => {
  await loginViaUi(page, USERS.demo)
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
})

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/auth/")
  const form = page.getByRole("tabpanel")
  await form.getByLabel("Email").fill(USERS.demo.email)
  await form.getByLabel("Password").fill("not-the-password")
  await form.getByRole("button", { name: "Log in" }).click()
  await expect(form.getByText("Invalid email or password")).toBeVisible()
  await expect(page).toHaveURL(/\/auth/)
})

test("dashboard redirects anonymous visitors to sign-in", async ({ page }) => {
  await page.goto("/dashboard/")
  await expect(page).toHaveURL(/\/auth\/?\?redirect=/)
})

test("non-admins can't open the admin panel", async ({ page }) => {
  await loginViaUi(page, USERS.demo)
  await page.goto("/admin/users/")
  await expect(page).toHaveURL(/\/dashboard/)
})
