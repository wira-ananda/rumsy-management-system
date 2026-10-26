import { test, expect, type Page } from "@playwright/test";
import { selectMonth, selectDate } from "./helpers/month-picker";

async function login(page: Page, account: string) {
  await page.goto("/");
  await page.locator("#loginEmail").fill(`${account}@local.test`);
  await page.locator("#loginPassword").fill("local-test-password");
  await page.locator("#loginForm button").click();
  await expect(page.locator("#view h1").first()).toBeVisible();
}
async function state(page: Page) {
  return page.evaluate(async () => {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "x-rms-refresh": "1" },
      body: "{}",
    });
    const { accessToken } = await refreshed.json();
    return (
      await (
        await fetch("/api/state", {
          headers: { authorization: `Bearer ${accessToken}` },
        })
      ).json()
    ).data;
  });
}

test.describe("month picker", () => {
  test.beforeEach(async ({ request, page, browserName }) => {
    await request.post("http://127.0.0.1:4175/__test/reset");
    if (browserName === "webkit") {
      // This fixture serves plain HTTP on a loopback IP. WebKit correctly
      // refuses Secure refresh cookies there; production uses HTTPS. Keep the
      // adjustment confined to these local test responses.
      await page.route("http://127.0.0.1:4175/api/auth/**", async (route) => {
        const response = await route.fetch();
        const headers = response.headers();
        const cookie = response
          .headersArray()
          .find((header) => header.name.toLowerCase() === "set-cookie")?.value;
        if (cookie) {
          for (const key of Object.keys(headers))
            if (key.toLowerCase() === "set-cookie") delete headers[key];
          headers["set-cookie"] = cookie.replace(/;\s*Secure/gi, "");
          const [name, ...value] = cookie.split(";")[0].split("=");
          await page.context().addCookies([
            {
              name,
              value: value.join("="),
              domain: "127.0.0.1",
              path: "/",
              secure: false,
              httpOnly: true,
              sameSite: "Lax",
            },
          ]);
        }
        await route.fulfill({ response, headers });
      });
    }
  });
  for (const account of ["super_admin", "arif"]) {
    test(`${account} filters all four pages by month/year and exact date without changing data`, async ({
      page,
      browserName,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await login(page, account);
      const before = await state(page);
      const leads = before.leads.filter(
        (lead: any) => account === "super_admin" || lead.sales === "Arif",
      );
      for (const [route, id] of [
        ["leads", "leadMonth"],
        ["pipeline", "pMonth"],
        ["sales-dashboard", "salesMonth"],
        ["kanban", "kanbanMonth"],
      ]) {
        await page.goto(`/#/${route}`);
        await expect(page.locator(`#${id}`)).toBeVisible();
        expect(await page.locator('input[type="month"]').count()).toBe(0);
        const count = async (expected: number) => {
          if (route === "leads")
            await expect(page.locator("#leadRows a.link")).toHaveCount(
              expected,
            );
          if (route === "pipeline")
            await expect(page.locator("#pRows a.link")).toHaveCount(expected);
          if (route === "sales-dashboard")
            await expect(
              page.locator(".filter-caption [role=status]"),
            ).toContainText(`${expected} lead`);
          if (route === "kanban")
            await expect(page.locator(".kcard")).toHaveCount(expected);
          if (route === "pipeline") {
            const counts = await page
              .locator(".summary-chip > b")
              .allTextContents();
            expect(
              counts.reduce((sum, value) => sum + parseInt(value), 0),
            ).toBe(expected);
          }
        };
        await count(leads.length);
        await selectMonth(page, id, "2026-08");
        await expect(page.locator(`#${id}`)).toContainText("Agustus 2026");
        await count(
          leads.filter((lead: any) => lead.dateIn.startsWith("2026-08-"))
            .length,
        );
        const dateId = id.replace("Month", "Date");
        await selectDate(page, dateId, "2026-08-04");
        await count(
          leads.filter((lead: any) => lead.dateIn === "2026-08-04").length,
        );
        if (route === "leads") {
          await expect(page.locator("thead th").nth(0)).toHaveText("Client");
          await expect(page.locator("thead th").nth(1)).toHaveText("Tgl Masuk");
          await expect(page.locator("thead th").nth(2)).toHaveText("Kebutuhan");
          await expect(
            page.locator("#leadRows tr").first().locator("td").nth(1),
          ).toHaveText("04 Agu 2026");
          if (account === "super_admin") {
            await page.locator(`#${dateId}`).click();
            await page.screenshot({
              path: `test-results/date-filter-${browserName}-desktop.png`,
              fullPage: true,
            });
            await page.keyboard.press("Escape");
          }
        }
        await selectDate(page, dateId, "2026-08-05");
        await count(
          leads.filter((lead: any) => lead.dateIn === "2026-08-05").length,
        );
        await page.locator(`#${dateId}`).click();
        await page
          .getByRole("dialog", { name: "Pilih tanggal" })
          .getByRole("button", { name: "Semua tanggal", exact: true })
          .click();
        await count(
          leads.filter((lead: any) => lead.dateIn.startsWith("2026-08-"))
            .length,
        );
        await selectDate(page, dateId, "2026-07-09");
        await expect(page.locator(`#${id}`)).toContainText("Juli 2026");
        await count(
          leads.filter((lead: any) => lead.dateIn === "2026-07-09").length,
        );
        await selectMonth(page, id, "2026-08");
        await expect(page.locator(`#${dateId}`)).toContainText("Semua tanggal");
        await selectDate(page, dateId, "2026-08-04");
        const reset = page.getByRole("button", {
          name: "Reset filter",
          exact: true,
        });
        const resetBounds = await reset.boundingBox();
        expect(resetBounds!.width).toBeLessThan(90);
        expect(resetBounds!.height).toBeLessThanOrEqual(38);
        await reset.click();
        await expect(page.locator(`#${id}`)).toContainText("Semua bulan");
        await expect(page.locator(`#${dateId}`)).toContainText("Semua tanggal");
        await expect(reset).toBeDisabled();
        await count(leads.length);
        await selectMonth(page, id, "2025-08");
        await count(0);
        await page.locator(`#${id}`).click();
        await page
          .getByRole("dialog", { name: "Pilih bulan" })
          .getByRole("button", { name: "Semua bulan", exact: true })
          .click();
        await expect(page.locator(`#${id}`)).toContainText("Semua bulan");
        await count(leads.length);
      }
      expect(await state(page)).toEqual(before);
      expect(errors).toEqual([]);
    });
  }
  test("keyboard, dismiss, current month and mobile popup stay usable", async ({
    page,
    browserName,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "super_admin");
    await page.goto("/#/leads");
    const trigger = page.locator("#leadMonth");
    await trigger.focus();
    await trigger.press("ArrowDown");
    const popup = page.getByRole("dialog", { name: "Pilih bulan" });
    await expect(popup).toBeVisible();
    await page.keyboard.press("Home");
    await expect(popup.locator("[data-month='0']")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(popup.locator("[data-month='1']")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("Februari");
    await expect(trigger).toBeFocused();
    const dateTrigger = page.locator("#leadDate");
    await dateTrigger.click();
    const calendar = page.getByRole("dialog", { name: "Pilih tanggal" });
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("Maret");
    await expect(dateTrigger).toContainText("1 Mar");
    await dateTrigger.click();
    await expect(calendar).toBeVisible();
    const calendarBounds = await calendar.boundingBox();
    expect(calendarBounds!.x + calendarBounds!.width).toBeLessThanOrEqual(390);
    expect(calendarBounds!.y + calendarBounds!.height).toBeLessThanOrEqual(844);
    await calendar.screenshot({
      path: `test-results/date-picker-${browserName}-mobile.png`,
    });
    await page.keyboard.press("Escape");
    await selectMonth(page, "leadMonth", `${new Date().getFullYear()}-02`);
    await trigger.click();
    await expect(
      popup.getByRole("button", { name: /Februari/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await popup.screenshot({
      path: `test-results/month-picker-${browserName}-mobile.png`,
    });
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator("#view h1").click();
    await expect(popup).toHaveCount(0);
    await trigger.click();
    await popup.getByRole("button", { name: "Bulan ini", exact: true }).click();
    await expect(trigger).toContainText(
      new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
    expect(errors).toEqual([]);
  });
});
