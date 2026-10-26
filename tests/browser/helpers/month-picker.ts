import { expect, type Page } from "@playwright/test";

export async function selectMonth(page: Page, id: string, value: string) {
  await page.locator(`#${id}`).click();
  const popup = page.getByRole("dialog", { name: "Pilih bulan", exact: true });
  await expect(popup).toBeVisible();
  const [year, month] = value.split("-").map(Number);
  let displayed = Number(
    await popup.locator(".year-navigation b").textContent(),
  );
  expect(Math.abs(year - displayed)).toBeLessThan(30);
  while (displayed !== year) {
    await popup
      .getByRole("button", {
        name: year < displayed ? "Tahun sebelumnya" : "Tahun berikutnya",
      })
      .click();
    displayed = Number(await popup.locator(".year-navigation b").textContent());
  }
  await popup.locator(`[data-month="${month - 1}"]`).click();
  await expect(popup).toHaveCount(0);
}

export async function selectDate(page: Page, id: string, value: string) {
  await page.locator(`#${id}`).click();
  const popup = page.getByRole("dialog", {
    name: "Pilih tanggal",
    exact: true,
  });
  await popup
    .getByRole("button", { name: "Pilih bulan dan tahun", exact: true })
    .click();
  const [year, month] = value.split("-").map(Number);
  let displayed = Number(
    await popup.locator(".year-navigation b").textContent(),
  );
  expect(Math.abs(year - displayed)).toBeLessThan(30);
  while (displayed !== year) {
    await popup
      .getByRole("button", {
        name: year < displayed ? "Tahun sebelumnya" : "Tahun berikutnya",
      })
      .click();
    displayed = Number(await popup.locator(".year-navigation b").textContent());
  }
  await popup.locator(`[data-month="${month - 1}"]`).click();
  await popup.locator(`[data-date="${value}"]`).click();
  await expect(popup).toHaveCount(0);
}
