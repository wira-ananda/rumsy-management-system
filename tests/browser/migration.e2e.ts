import { test, expect, type Page } from "@playwright/test";
import { selectMonth } from "./helpers/month-picker";
import {
  nav,
  projectTabs,
  projectTabLabels,
} from "../../web/src/lib/constants/catalog.js";

const projectId = "RMS-PRJ-2026-0041";
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uAAAAABJRU5ErkJggg==",
  "base64",
);
const photo = (name = "migration.png") => ({
  name,
  mimeType: "image/png",
  buffer: image,
});
async function login(page: Page, account = "super_admin", url = "/") {
  await page.goto(url);
  await page.locator("#loginEmail").fill(account + "@local.test");
  await page.locator("#loginPassword").fill("local-test-password");
  await page.locator("#loginForm button").click();
  await expect(page.locator("#view h1").first()).toBeVisible();
}
async function goto(page: Page, route: string) {
  await page.goto("/#/" + route);
  await expect(page.locator("#view h1").first()).toBeVisible();
}
async function browserJSON(page: Page, path: string) {
  return page.evaluate(async (url) => {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "x-rms-refresh": "1" },
      body: "{}",
    });
    const { accessToken } = await refreshed.json();
    return (
      await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } })
    ).json();
  }, path);
}
async function state(page: Page) {
  return (await browserJSON(page, "/api/state")).data;
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:4175/__test/reset");
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (error) => list.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test("all menus, all project tabs, session restore and mobile navigation work", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator(".nav a")).toHaveCount(36);
  for (const item of nav) {
    await goto(page, item.route);
    await expect(
      page.locator(`.nav a[data-route="${item.route}"]`),
    ).toHaveClass(/active/);
    if (item.route === "system-check") {
      await expect(
        page
          .locator(".test-row")
          .filter({ hasText: "Tab Chat memakai komponen Svelte" }),
      ).toHaveClass(/pass/);
    }
  }
  await goto(page, "projects/" + projectId);
  for (const tab of projectTabs) {
    await page
      .locator(`.tabs a[href="#/projects/${projectId}/${tab}"]`)
      .click();
    await expect(page.locator(".tabs a.active")).toHaveText(
      projectTabLabels[tab as keyof typeof projectTabLabels],
    );
    await expect(page.locator("#projectTab")).not.toBeEmpty();
  }
  await page.reload();
  await expect(page.locator("#userMenu")).toContainText("Super Admin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#hamb").click();
  await expect(page.locator("#sidebar")).toHaveClass(/open/);
  await page.locator("#overlay").click({ position: { x: 350, y: 400 } });
  await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("lead forms, qualification, chat and save payload keep original behavior", async ({
  page,
}) => {
  await login(page);
  await goto(page, "leads");
  await page.locator("#addLead").click();
  const form = page.locator("#leadForm");
  await form.locator("[name=client]").fill("Klien Migrasi");
  await form.locator("[name=phone]").fill("081234000000");
  await form.locator("[name=location]").fill("Makassar");
  await form.locator("[name=collateral][value=SHM]").check();
  await form.locator("[name=estRab]").fill("250000000");
  await form.locator("[name=estAsstCr]").fill("300000000");
  await form.locator("[name=sales]").selectOption({ label: "Arif" });
  await form.locator("[name=nextFollowUp]").fill("2026-10-20");
  const persisted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/state") &&
      response.request().method() === "PUT" &&
      response.ok(),
  );
  await form.locator("button").click();
  await persisted;
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await expect(page.locator("#leadRows")).toBeVisible();
  await page
    .locator("#leadRows a")
    .filter({ hasText: "Klien Migrasi" })
    .click();
  await expect(page.locator("#view h1")).toHaveText("Klien Migrasi");
  await page.locator("#addMilestone").click();
  await page.locator("#mileForm button").click();
  await expect(page.locator(".stage-step.current")).toHaveText("Hot");
  await page
    .locator("#leadChatForm textarea")
    .fill("Pesan dari frontend Svelte");
  await page.locator("#leadChatForm button").click();
  await expect(page.locator(".chat-msg").last()).toContainText(
    "Pesan dari frontend Svelte",
  );
  const saved = await state(page);
  const lead = saved.leads.find((item: any) => item.client === "Klien Migrasi");
  expect(lead.stage).toBe("HOT");
  expect(lead.estRab).toBe(250000000);
  expect(saved.projects).toHaveLength(3);
});

test("kanban month filters cards and every stage count while preserving DP Gambar", async ({
  page,
}) => {
  await login(page);
  await goto(page, "kanban");
  const initial = await state(page);
  const stages = [
    "WARM",
    "HOT",
    "DP_GAMBAR",
    "DP_PROYEK",
    "PEMBANGUNAN",
    "SELESAI",
    "HOLD_BATAL",
  ];
  // Preserve the existing displayed pipeline placement (including legacy demo
  // stages); a month filter must never recompute or move cards between stages.
  const placements = new Map<string, string>();
  for (const stage of stages) {
    const links = await page
      .locator(`.kcol[data-stage="${stage}"] .kcard a`)
      .evaluateAll((elements) =>
        elements.map((element) =>
          element.getAttribute("href")!.split("/").at(-1)!,
        ),
      );
    for (const id of links) placements.set(id, stage);
  }
  async function assertColumns(month = "") {
    const expected = initial.leads.filter(
      (lead: any) =>
        !month || String(lead.dateIn || "").startsWith(month + "-"),
    );
    await expect(page.locator(".kcol")).toHaveCount(7);
    await expect(page.locator(".kcard")).toHaveCount(expected.length);
    for (const stage of stages) {
      const column = page.locator(`.kcol[data-stage="${stage}"]`);
      const leads = expected.filter(
        (lead: any) => placements.get(lead.id) === stage,
      );
      await expect(column.locator(".khead span").last()).toHaveText(
        String(leads.length),
      );
      await expect(column.locator(".kcard")).toHaveCount(leads.length);
      for (const lead of leads)
        await expect(
          column.getByText(lead.client, { exact: true }),
        ).toBeVisible();
    }
    await expect(
      page.locator(".kcol[data-stage=DP_GAMBAR] .khead"),
    ).toContainText("DP Gambar");
  }
  await assertColumns();
  await selectMonth(page, "kanbanMonth", "2026-07");
  await assertColumns("2026-07");
  await selectMonth(page, "kanbanMonth", "2026-08");
  await assertColumns("2026-08");
  expect(
    await page.locator(".kcol[data-stage=DP_GAMBAR] .kcard").count(),
  ).toBeGreaterThan(0);
  const compact = await page.locator(".kanban-toolbar").boundingBox();
  const note = await page.locator(".kanban-note").boundingBox();
  const filters = await page.locator(".kanban-filters").boundingBox();
  expect(compact!.height).toBeLessThan(100);
  expect(filters!.x).toBeGreaterThan(note!.x);
  expect(Math.abs(filters!.y - note!.y)).toBeLessThan(25);
  await page.screenshot({
    path: "test-results/kanban-month-desktop.png",
    fullPage: true,
  });
  await selectMonth(page, "kanbanMonth", "2025-08");
  await assertColumns("2025-08");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator("#sidebar")
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0.5);
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await assertColumns();
  expect(
    await page
      .locator(".kanban-toolbar")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/kanban-month-mobile.png",
    fullPage: true,
  });
  expect(await state(page)).toEqual(initial);
});

test("kanban month counts keep the signed-in sales scope", async ({ page }) => {
  await login(page, "arif");
  await goto(page, "kanban");
  const own = (await state(page)).leads.filter(
    (lead: any) => lead.sales === "Arif",
  );
  await expect(page.locator(".kcard")).toHaveCount(own.length);
  await selectMonth(page, "kanbanMonth", "2026-07");
  await expect(page.locator(".kcard")).toHaveCount(
    own.filter((lead: any) => lead.dateIn.startsWith("2026-07-")).length,
  );
  for (const count of await page
    .locator(".khead span:last-child")
    .allTextContents())
    expect(count).toBe("0");
});

test("lead qualification synchronizes DP both ways, validates terms, and preserves edits on mobile", async ({
  page,
}) => {
  await login(page);
  await goto(page, "leads");
  await page.locator("#addLead").click();
  const form = page.locator("#leadForm");
  await expect(form.locator("select[name=need] option")).toHaveText([
    "Rumah",
    "Bisnis",
    "Sekolah",
    "Other",
  ]);
  await form.locator("[name=source]").selectOption("WhatsApp");
  await form.locator("[name=need]").selectOption("Other");
  await form.locator("[name=needDetail]").fill("Klinik");
  await form.locator("[name=client]").fill("Uji Kualifikasi");
  await form.locator("[name=phone]").fill("081234567890");
  await form.locator("[name=location]").fill("Makassar");
  await expect(form.locator("[name=dpAmount]")).toBeDisabled();
  await form.locator("[name=nextFollowUp]").fill("2026-11-01");
  await form.locator("[name=estRab]").fill("500000000");
  await expect(form.locator("[name=estRab]")).toHaveValue("500.000.000");
  await expect(form.locator("[name=dp]")).toHaveValue("15");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("75.000.000");
  await form.locator("[name=estRab]").fill("");
  await expect(form.locator("[name=estRab]")).toHaveValue("");
  await expect(form.locator("[name=dpAmount]")).toBeDisabled();
  await form.locator("[name=estRab]").pressSequentially("500000000");
  await expect(form.locator("[name=estRab]")).toHaveValue("500.000.000");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("75.000.000");
  await form.locator("[name=dp]").fill("25");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("125.000.000");
  await form.locator("[name=dpAmount]").fill("150000000");
  await expect(form.locator("[name=dp]")).toHaveValue("30");
  await form.locator("[name=estRab]").fill("600000000");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("180.000.000");
  await expect(form.locator("[name=margin]")).not.toBeEditable();
  await expect(form.locator("[name=margin]")).toHaveValue("8");
  await form.locator("[name=dpAmount]").fill("80000000");
  expect(
    await form
      .locator("[name=dp]")
      .evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow),
  ).toBe(true);
  await form.locator("[name=dpAmount]").fill("90000000");
  await expect(form.locator("[name=dp]")).toHaveValue("15");
  expect(
    await form
      .locator("[name=dp]")
      .evaluate((el: HTMLInputElement) => el.checkValidity()),
  ).toBe(true);
  await form.locator("[name=dpAmount]").fill("150000000");
  await expect(form.locator("[name=dp]")).toHaveValue("25");
  const slider = form.getByRole("slider");
  await slider.focus();
  await slider.press("Home");
  await slider.press("ArrowRight");
  await expect(form.locator("[name=tenorYears]")).toHaveValue("2");
  await form.locator("[name=tenorYears]").fill("5");
  await expect(slider).toHaveValue("5");
  await expect(form).toContainText("Setara 60 bulan");
  await form.locator("[name=collateral][value='Non-SHM']").check();
  await page.screenshot({
    path: "test-results/lead-form-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(form.locator("[name=dpAmount]")).toHaveValue("150.000.000");
  expect(
    await page
      .locator(".modal")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/lead-form-mobile.png",
    fullPage: true,
  });
  // A rejected save stays open and can be retried without losing the input.
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "LEAD_VALIDATION",
          message: "Uji gagal simpan",
        }),
      });
    else await route.continue();
  });
  await form.locator("button[type=submit], button.submit").click();
  await expect(form.getByRole("alert")).toHaveText("Uji gagal simpan");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("150.000.000");
  await page.unroute("**/api/state");
  await form.locator("button.submit").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page.reload();
  const saved = await state(page);
  const lead = saved.leads.find((l: any) => l.client === "Uji Kualifikasi");
  await page.locator("#leadSearch").fill("Klinik");
  await expect(page.locator("#leadRows tr")).toHaveCount(1);
  await expect(page.locator("#leadRows")).toContainText("Uji Kualifikasi");
  expect(
    saved.leads.filter((l: any) => l.client === "Uji Kualifikasi"),
  ).toHaveLength(1);
  expect(lead).toMatchObject({
    source: "WhatsApp",
    need: "Other",
    needDetail: "Klinik",
    estRab: 600000000,
    margin: 8,
    dp: 25,
    dpAmount: 150000000,
    tenorYears: 5,
    collateral: "Non-SHM",
  });
  await goto(page, `leads/${lead.id}`);
  await page.locator("#editLead").click();
  await expect(page.locator("#leadForm [name=tenorYears]")).toHaveValue("5");
  await expect(page.locator("#leadForm [name=dpAmount]")).toHaveValue(
    "150.000.000",
  );
  await page.locator("#modalClose").click();
  await page.locator("#addMilestone").click();
  await page.locator("#mileForm button").click();
  await expect(page.locator(".stage-step.current")).toHaveText("Hot");
  await page.locator(".payFromLead").first().click();
  await page.locator("#payForm [name=amount]").fill("150000000");
  await page
    .locator("#payForm [name=proof]")
    .setInputFiles(photo("qualification-dp.png"));
  await page.locator("#payForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const linked = (await state(page)).projects.find(
    (p: any) => p.leadId === lead.id,
  );
  expect(linked.contract).toMatchObject({ tenor: 60, dp: 25, margin: 8 });
});

test("historical DP is not clamped on opening and editing a lead keeps its existing project terms", async ({
  page,
}) => {
  await login(page);
  const before = await state(page);
  for (const id of ["LD-003", "LD-004"]) {
    const old = before.leads.find((lead: any) => lead.id === id);
    await goto(page, `leads/${id}`);
    await page.locator("#editLead").click();
    await expect(page.locator("#leadForm [name=dp]")).toHaveValue(
      String(old.dp),
    );
    await page.locator("#modalClose").click();
  }
  expect(await state(page)).toEqual(before);
  await page.locator("#editLead").click();
  const form = page.locator("#leadForm");
  await form.locator("[name=estRab]").fill("1200000000");
  await expect(form.locator("[name=dp]")).toHaveValue("15");
  await expect(form.locator("[name=dpAmount]")).toHaveValue("180.000.000");
  await form.locator("[name=collateral][value=SHM]").check();
  await form.locator("button.submit").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const after = await state(page);
  expect(after.leads.find((lead: any) => lead.id === "LD-004")).toMatchObject({
    dp: 15,
    dpAmount: 180000000,
    estRab: 1200000000,
  });
  for (const old of before.projects) {
    const current = after.projects.find(
      (project: any) => project.id === old.id,
    );
    expect(current.contract).toEqual(old.contract);
    expect(current.originalContract).toBe(old.originalContract);
    expect(current.transactions).toEqual(old.transactions);
    expect(current.installments).toEqual(old.installments);
  }
});

test("legacy need becomes editable Other and its original text and estimate are preserved", async ({
  page,
}) => {
  await login(page);
  const before = await state(page);
  const old = before.leads.find((lead: any) => lead.id === "LD-001");
  await goto(page, "leads/LD-001");
  await page.locator("#editLead").click();
  const form = page.locator("#leadForm");
  await expect(form.locator("select[name=need] option")).toHaveText([
    "Rumah",
    "Bisnis",
    "Sekolah",
    "Other",
  ]);
  await expect(form.locator("[name=need]")).toHaveValue("Other");
  await expect(form.locator("[name=needDetail]")).toHaveValue(old.need);
  expect((await state(page)).leads.find((l: any) => l.id === old.id).need).toBe(
    old.need,
  );
  await form.locator("[name=collateral][value=SHM]").check();
  await form.locator("button.submit").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page.reload();
  const actual = (await state(page)).leads.find((l: any) => l.id === old.id);
  expect(actual.need).toBe("Other");
  expect(actual.needDetail).toBe(old.need);
  expect(actual.estGambar).toBe(old.estGambar);
  await page.locator("#editLead").click();
  await page.locator("#leadForm [name=needDetail]").fill("");
  await page.locator("#leadForm button.submit").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  expect(
    (await state(page)).leads.find((l: any) => l.id === old.id),
  ).toMatchObject({ need: "Other", needDetail: "" });
});

test("file uploads, payment verification, project documents and report photos work", async ({
  page,
}) => {
  await login(page);
  await goto(page, `projects/${projectId}/transaction`);
  await page.locator("#uploadPay").click();
  await page.locator("#payForm [name=amount]").fill("123456");
  await page
    .locator("#payForm [name=proof]")
    .setInputFiles(photo("proof-migration.png"));
  await page.locator("#payForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const row = page.locator("#projectTab tr").filter({ hasText: "123.456" });
  await row.locator(".verifyPay").click();
  await expect(row).toContainText("VERIFIED");
  await row.locator(".proofBtn").click();
  const downloading = page.waitForEvent("download");
  await page
    .locator("#modalBg")
    .getByRole("link", { name: "Download", exact: true })
    .click();
  expect((await downloading).suggestedFilename()).toBe("proof-migration.png");
  await page.locator("#modalClose").click();
  await goto(page, `projects/${projectId}/document`);
  await page.locator("[data-doc=akad]").click();
  await page
    .locator("#simpleDocForm [name=file]")
    .setInputFiles(photo("akad-final.png"));
  await page.locator("#simpleDocForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await expect(page.locator("[data-doc=akad]")).toContainText(
    "Tekan untuk buka dokumen",
  );
  const opening = page.waitForEvent("popup");
  await page.locator("[data-doc=akad]").click();
  const preview = await opening;
  await expect.poll(() => preview.url()).toMatch(/^blob:/);
  await preview.close();
  await goto(page, `projects/${projectId}/progress-report`);
  await page.locator("#addDaily").click();
  await page
    .locator("#progressReportForm [name=activities]")
    .fill("Pekerjaan baru setelah migrasi");
  await page
    .locator("#progressReportForm [name=file]")
    .setInputFiles([photo("a.png"), photo("b.png"), photo("c.png")]);
  await page.locator("#progressReportForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await expect(
    page
      .locator(".report-item")
      .filter({ hasText: "Pekerjaan baru setelah migrasi" })
      .locator("img"),
  ).toHaveCount(3);
  await expect
    .poll(() =>
      page
        .locator(".report-item")
        .filter({ hasText: "Pekerjaan baru setelah migrasi" })
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  const saved = (await state(page)).projects.find(
    (item: any) => item.id === projectId,
  );
  expect(
    saved.transactions.find(
      (item: any) => item.proofName === "proof-migration.png",
    ).status,
  ).toBe("VERIFIED");
  expect(
    saved.documents.find((item: any) => item.name === "akad-final.png").fileId,
  ).toBeTruthy();
  expect(saved.progressDaily[0].photos).toHaveLength(3);
});

test("address-bar data URLs reject a logged-in browser while app refresh and Bearer keep working", async ({
  page,
  context,
}) => {
  await login(page);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "rms_session" && cookie.httpOnly,
    ),
  ).toBe(true);
  const status = await page.evaluate(async () => {
    const paths = [
      "/api/directory/users",
      "/api/directory/sales",
      "/api/state",
      "/api/files/test-photo-1",
    ];
    return Promise.all(
      paths.map(async (path) => ({ path, status: (await fetch(path)).status })),
    );
  });
  expect(status.every((result) => result.status === 401)).toBe(true);
  const direct = await context.newPage();
  const response = await direct.goto("/api/directory/users");
  expect(response?.status()).toBe(401);
  expect(await response?.json()).toEqual({ error: "UNAUTHENTICATED" });
  await direct.close();
  await page.reload();
  await expect(page.locator("#userMenu")).toContainText("Super Admin");
  expect(
    await page.evaluate(() => ({
      local: { ...localStorage },
      session: Object.fromEntries(
        Object.entries(sessionStorage).filter(
          ([key]) => !["sveltekit:scroll", "sveltekit:snapshot"].includes(key),
        ),
      ),
    })),
  ).toEqual({ local: {}, session: {} });
  const appResponse = await browserJSON(page, "/api/directory/users");
  expect(appResponse.users.length).toBeGreaterThan(0);
  await page.locator("#logout").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.reload();
  await expect(page.locator("#loginForm")).toBeVisible();
});

test("Vite proxy keeps browser login working and rejects foreign authentication Origins", async ({
  page,
  request,
}) => {
  await login(page, "super_admin", "http://127.0.0.1:4176/");
  await page.reload();
  await expect(page.locator("#userMenu")).toContainText("Super Admin");
  for (const origin of ["https://evil.test", "null"]) {
    const response = await request.post(
      "http://127.0.0.1:4176/api/auth/login",
      {
        headers: { origin },
        data: {
          email: "super_admin@local.test",
          password: "local-test-password",
        },
      },
    );
    expect(response.status()).toBe(403);
  }
  const cookieOnly = await page.evaluate(
    async () => (await fetch("/api/directory/users")).status,
  );
  expect(cookieOnly).toBe(401);
});

test("task assignment, PIC submission and reviewer approval keep the API contract on Hono", async ({
  page,
}) => {
  await login(page);
  await goto(page, "tasks");
  await page.locator("#newTask").click();
  await page.locator("#taskForm [name=title]").fill("Task Migrasi Svelte");
  const users = (await browserJSON(page, "/api/directory/users")).users;
  await page
    .locator("#taskPic")
    .selectOption(String(users.find((user: any) => user.name === "Arif").id));
  await page
    .locator("#taskReviewer")
    .selectOption(
      String(users.find((user: any) => user.role === "SUPER_ADMIN").id),
    );
  await page.locator("#taskForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await expect(
    page
      .locator(".task-kanban-card")
      .filter({ hasText: "Task Migrasi Svelte" }),
  ).toBeVisible();
  await page.locator("#logout").click();
  await login(page, "arif");
  await goto(page, "tasks");
  let card = page
    .locator(".task-kanban-card")
    .filter({ hasText: "Task Migrasi Svelte" });
  await card.locator(".startTask").click();
  await card.locator(".submitTask").click();
  await expect(card).toContainText("MENUNGGU REVIEW");
  await page.locator("#logout").click();
  await login(page);
  await goto(page, "tasks");
  card = page
    .locator(".task-kanban-card")
    .filter({ hasText: "Task Migrasi Svelte" });
  await card.locator(".approveTask").click();
  await expect(card).toContainText("SELESAI");
  const saved = (await state(page)).tasks.find(
    (item: any) => item.title === "Task Migrasi Svelte",
  );
  expect(saved.status).toBe("DONE");
  expect(saved.completedAt).toBeTruthy();
});

test("QC inspection, corrective attachment and verification remain usable", async ({
  page,
}) => {
  await login(page);
  await goto(page, "qc-inspection");
  await page.locator("#newInsp").click();
  await page.locator("#inspForm [name=area]").fill("Area Migrasi");
  await page.locator("#inspForm [name=item]").fill("Pemeriksaan Migrasi");
  await page.locator("#inspForm [name=result]").selectOption("FINDING_CREATED");
  await page.locator("#inspForm button").click();
  await goto(page, "qc-findings");
  let row = page.locator("tr").filter({ hasText: "Area Migrasi" });
  await row.locator(".qCorrect").click();
  await page.locator("#corrForm textarea").fill("Perbaikan selesai");
  await page
    .locator("#corrForm [name=after]")
    .setInputFiles(photo("after.png"));
  await page.locator("#corrForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  row = page.locator("tr").filter({ hasText: "Area Migrasi" });
  await row.locator(".qVerify").click();
  await page.locator("#qClose").click();
  await expect(row).toContainText("CLOSED");
});

test("client links remain compatible and do not expose internal reports", async ({
  page,
  request,
}) => {
  const { token } = await (
    await request.post("http://127.0.0.1:4175/__test/reset")
  ).json();
  await page.goto("/client.html?token=" + token);
  await expect(page.locator(".client-hero h1")).toContainText("Ahmad");
  await expect(page.locator(".client-report-card")).toHaveCount(2);
  await expect(page.locator("body")).not.toContainText(
    "CATATAN INTERNAL RAHASIA",
  );
  await expect(
    page.locator(".client-report-card").first().locator("img"),
  ).toHaveCount(3);
  await page.screenshot({
    path: "test-results/client-portal.png",
    fullPage: true,
  });
  await page.goto("/client.html");
  await expect(page.locator("h2")).toHaveText("Link tidak valid");
});

test("role restrictions and account/password modal remain available", async ({
  page,
}) => {
  await login(page, "holding_hrd");
  await goto(page, "finance-verification");
  await expect(page.locator("#view h1")).toHaveText("Akses dibatasi");
  await page.locator("#userMenu").click();
  await page.locator("#changePassword").click();
  await expect(page.locator("#passwordForm")).toBeVisible();
  await page.locator("#modalClose").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
});

test("CRM and daily report forms retain bindings, metrics, edits and duplicate validation", async ({
  page,
}) => {
  await login(page);
  await goto(page, "activity");
  await page.locator("#addAct").click();
  const form = page.locator("#actForm");
  await form.locator("[name=leadId]").selectOption({ index: 1 });
  await expect(form.locator("[name=phone]")).not.toHaveValue("");
  await form.locator("[name=pic]").selectOption({ label: "Arif" });
  await form.locator("[name=notes]").fill("Aktivitas native Svelte");
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await expect(page.locator("#view")).toContainText("Aktivitas native Svelte");
  await goto(page, "sales-daily-report");
  await page.locator("#newSalesDaily").click();
  const report = page.locator("#dailyForm");
  await report.locator("[name=sales]").selectOption("Arif");
  await report
    .locator("[name=activityDescription]")
    .fill("Kegiatan native Svelte");
  await report.locator("[name=result]").fill("Follow up selesai");
  await report.locator("[name=nextPlan]").fill("Survey berikutnya");
  await expect(report.locator(".notice")).toContainText("Total Aktivitas 1");
  await report.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const row = page
    .locator("#dailyRows tr")
    .filter({ hasText: "Kegiatan native Svelte" });
  await row.locator(".editDaily").click();
  await expect(report.locator("[name=activityDescription]")).toHaveValue(
    "Kegiatan native Svelte",
  );
  await report.locator("[name=result]").fill("Hasil direvisi");
  await report.locator("button").click();
  await expect(row).toContainText("Hasil direvisi");
  await page.locator("#newSalesDaily").click();
  await expect(report.locator("[name=activityDescription]")).toHaveValue("");
  await report.locator("[name=sales]").selectOption("Arif");
  for (const name of ["activityDescription", "result", "nextPlan"])
    await report.locator(`[name=${name}]`).fill("Duplikat");
  await report.locator("button").click();
  await expect(report.locator("[role=alert]")).toContainText("sudah ada");
  await page.locator("#modalClose").click();
  const saved = await state(page);
  expect(saved.crm[0].notes).toBe("Aktivitas native Svelte");
  expect(saved.salesDailyReports[0].metrics.activities).toBe(1);
  expect(saved.salesDailyReports[0].result).toBe("Hasil direvisi");
});

test("project creation, editing and schedules use the existing project schema", async ({
  page,
}) => {
  await login(page);
  await goto(page, "projects");
  await page.locator("#newProject").click();
  const form = page.locator("#projectForm");
  for (const [name, value] of Object.entries({
    name: "Project Native",
    client: "Klien Native",
    location: "Makassar",
    originalContract: "500000000",
    startDate: "2026-10-15",
    targetFinish: "2027-02-01",
  }))
    await form.locator(`[name=${name}]`).fill(value);
  await form.locator("[name=salesUserId]").selectOption({ index: 1 });
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page
    .locator(".project-card")
    .filter({ hasText: "Project Native" })
    .click();
  await page.locator("#editProject").click();
  await expect(form.locator("[name=client]")).toHaveValue("Klien Native");
  await form.locator("[name=name]").fill("Project Native Revisi");
  await form.locator("button").click();
  await expect(page.locator("#view h1")).toHaveText("Project Native Revisi");
  const saved = (await state(page)).projects.find(
    (p: any) => p.name === "Project Native Revisi",
  );
  expect(saved.originalContract).toBe(500000000);
  expect(saved.contract.status).toBe("DRAFT");
  expect(saved.progressDaily).toEqual([]);
  expect(saved.clientPortal.enabled).toBe(false);
  await goto(page, `projects/${saved.id}/operation`);
  await page.locator("#editSchedule").click();
  await page.locator("#scheduleForm [name=targetFinish]").fill("2027-03-01");
  await page.locator("#scheduleForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  expect(
    (await state(page)).projects.find((p: any) => p.id === saved.id)
      .targetFinish,
  ).toBe("2027-03-01");
});

test("addendum approval and billing retain contract and installment calculations", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await goto(page, `projects/${projectId}/addendum`);
  await page.locator("#addAdd").click();
  const form = page.locator("#addForm");
  await form.locator("[name=number]").fill("NATIVE-01");
  await form.locator("[name=value]").fill("12500000");
  await form.locator("[name=description]").fill("Tambahan native");
  await form.locator("[name=addendumFile]").setInputFiles({
    name: "adendum-native.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 native test"),
  });
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const row = page.locator(".add-item").filter({ hasText: "NATIVE-01" });
  await row.locator(".editAdd").click();
  await expect(form.locator("[name=description]")).toHaveValue(
    "Tambahan native",
  );
  await form.locator("[name=description]").fill("Tambahan native revisi");
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await row.locator(".approveAdd").click();
  await expect(row).toContainText("APPROVED");
  await row.locator(".billAdd").click();
  await expect
    .poll(async () => {
      const saved = (await state(page)).projects.find(
        (p: any) => p.id === projectId,
      );
      return saved.installments.some(
        (i: any) =>
          i.seq === "Tagihan Adendum NATIVE-01" && i.dueAmount === 12500000,
      );
    })
    .toBe(true);
  const saved = await state(page);
  const p = saved.projects.find((p: any) => p.id === projectId);
  expect(p.addendums.find((a: any) => a.number === "NATIVE-01").status).toBe(
    "APPROVED",
  );
  expect(
    saved.approvals.some(
      (a: any) => a.subject.includes("NATIVE-01") && a.status === "APPROVED",
    ),
  ).toBe(true);
});

test("correspondence upload, editing and filtering persist through the Worker", async ({
  page,
}) => {
  await login(page);
  await goto(page, "correspondence");
  await page.locator("#newLetter").click();
  const form = page.locator("#letterForm");
  for (const [name, value] of Object.entries({
    number: "NATIVE-LETTER-01",
    party: "Klien Native",
    subject: "Surat native",
  }))
    await form.locator(`[name=${name}]`).fill(value);
  await form.locator("[name=file]").setInputFiles(photo("surat-native.png"));
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page.locator("#letterSearch").fill("NATIVE-LETTER-01");
  const row = page.locator("#letterRows tr");
  await expect(row).toHaveCount(1);
  await row.locator(".editLetter").click();
  await form.locator("[name=subject]").fill("Surat native direvisi");
  await form.locator("button").click();
  await expect(row).toContainText("Surat native direvisi");
  const saved = (await state(page)).correspondence.find(
    (l: any) => l.number === "NATIVE-LETTER-01",
  );
  expect(saved.subject).toBe("Surat native direvisi");
  expect(saved.fileId).toBeTruthy();
});

test("user create, edit and access dialogs use existing admin APIs", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await goto(page, "settings");
  await page.locator("#newUser").click();
  const form = page.locator("#userForm");
  await form.locator("[name=fullName]").fill("User Native");
  await form.locator("[name=email]").fill("native@local.test");
  await form.locator("[name=role]").selectOption("SALES_EXECUTIVE");
  await form.locator("[name=scopeName]").fill("Sales Native");
  await form.locator("[name=password]").fill("native-test-password");
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const row = page
    .locator("#userTable tr")
    .filter({ hasText: "native@local.test" });
  await row.locator(".editUser").click();
  await page
    .locator("#editUserForm [name=fullName]")
    .fill("User Native Revisi");
  await page.locator("#editUserForm button").click();
  await expect(row).toContainText("User Native Revisi");
  await goto(page, "user-access");
  await page.locator(".manageAccess").first().click();
  await expect(page.locator("#accessForm input[type=checkbox]")).toHaveCount(
    55,
  );
  await page.locator("#accessForm [name=CRM_CREATE]").check();
  await page.locator("#accessForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  expect(
    (await state(page)).userAccessOverrides.some((o: any) =>
      o.add.includes("CRM_CREATE"),
    ),
  ).toBe(true);
});

test("handover, project start and completion still require the original gates", async ({
  page,
}) => {
  await login(page);
  await goto(page, "projects");
  await page.locator("#newProject").click();
  const form = page.locator("#projectForm");
  for (const [name, value] of Object.entries({
    name: "Project Gate Native",
    client: "Klien Gate",
    location: "Makassar",
  }))
    await form.locator(`[name=${name}]`).fill(value);
  await form.locator("button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  const project = (await state(page)).projects.find(
    (p: any) => p.name === "Project Gate Native",
  );
  const id = project.id;
  await goto(page, `projects/${id}/handover`);
  await expect(page.locator("#startP")).toHaveCount(0);
  await expect(page.locator("#completeP")).toHaveCount(0);
  await goto(page, `projects/${id}/transaction`);
  await page.locator("#uploadPay").click();
  await page.locator("#payForm [name=type]").selectOption("DP_PROYEK");
  await page.locator("#payForm [name=amount]").fill("1000000");
  await page
    .locator("#payForm [name=proof]")
    .setInputFiles(photo("dp-gate.png"));
  await page.locator("#payForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page.locator(".verifyPay").click();
  await goto(page, `projects/${id}/document`);
  await page.locator("[data-doc=akad]").click();
  await page
    .locator("#simpleDocForm [name=file]")
    .setInputFiles(photo("akad-gate.png"));
  await page.locator("#simpleDocForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await goto(page, `projects/${id}/contract`);
  await page.locator("#editContract").click();
  await page.locator("#contractForm [name=number]").fill("AKAD-GATE-01");
  await page.locator("#contractForm [name=date]").fill("2026-10-15");
  await page.locator("#contractForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await page.locator("#signContract").click();
  await goto(page, `projects/${id}/handover`);
  await page.locator("#submitH").click();
  await page.locator("#acceptH").click();
  await page.locator("#startP").click();
  await expect(page.locator("#startP")).toHaveCount(0);
  await expect(page.locator("#completeP")).toHaveCount(0);
  await goto(page, `projects/${id}/operation`);
  await page.locator("#prog").fill("100");
  await page.locator("#prog").dispatchEvent("change");
  await expect(page.locator("#progText")).toHaveText("100%");
  await goto(page, `projects/${id}/handover`);
  await expect(page.locator("#completeP")).toHaveCount(0);
  await goto(page, `projects/${id}/document`);
  await page.locator("[data-doc=bast]").click();
  await page
    .locator("#simpleDocForm [name=file]")
    .setInputFiles(photo("bast-gate.png"));
  await page.locator("#simpleDocForm button").click();
  await expect(page.locator("#modalBg")).toHaveCount(0);
  await goto(page, `projects/${id}/handover`);
  await page.locator("#completeP").click();
  await expect
    .poll(async () => {
      const p = (await state(page)).projects.find((p: any) => p.id === id);
      return p.status;
    })
    .toBe("COMPLETED");
  const p = (await state(page)).projects.find((p: any) => p.id === id);
  expect(p.started).toBe(true);
  expect(p.completionApproved).toBe(true);
  expect(p.handover.status).toBe("ACCEPTED");
});
