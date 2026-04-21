import { test, expect } from "@playwright/test";

test.describe("gesture-finisher dogfood", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const origin = baseURL ?? "http://localhost:5174";
    await context.grantPermissions(["camera"], { origin });
  });

  test("landing: pose guide, mode buttons, MediaPipe init", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /ポーズの例/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "かめはめ波（両手）" })).toBeVisible();
    await expect(page.getByRole("button", { name: "螺旋丸（片手）" })).toBeVisible();

    await expect(page.locator("#phase-title")).toContainText("カメラ待ち", {
      timeout: 120_000,
    });
    await expect(page.locator("#status")).toContainText(/準備完了|カメラを許可/);
  });

  test("mode switch: spiral panel visible, help text updates", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#phase-title")).toContainText("カメラ待ち", {
      timeout: 120_000,
    });

    await page.getByRole("button", { name: "螺旋丸（片手）" }).click();

    await expect(page.locator("#help")).toContainText("片手");
    await expect(page.locator("#pose-panel-rs")).toBeVisible();
    await expect(page.locator("#pose-panel-kh")).toBeHidden();

    await page.getByRole("button", { name: "かめはめ波（両手）" }).click();
    await expect(page.locator("#pose-panel-kh")).toBeVisible();
    await expect(page.locator("#pose-panel-rs")).toBeHidden();
  });

  test("start: fake camera stream plays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#phase-title")).toContainText("カメラ待ち", {
      timeout: 120_000,
    });

    await page.getByRole("button", { name: "開始" }).click();

    await expect(page.locator("#status")).toContainText("検出中", { timeout: 60_000 });

    const video = page.locator("#cam");
    await expect(video).toBeVisible();
    await expect
      .poll(
        async () => {
          return await video.evaluate((el: HTMLVideoElement) => {
            return el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.videoWidth > 0;
          });
        },
        { timeout: 30_000 }
      )
      .toBeTruthy();

    await expect(page.locator("#stop")).toBeEnabled();
  });
});
