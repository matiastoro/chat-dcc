import { test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: authFile });
});
