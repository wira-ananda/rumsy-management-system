import { test, expect, type Page } from "@playwright/test";
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
async function login(page: Page, account = "super_admin") {
  await page.goto("/");
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
  return page.evaluate(async (url) => (await fetch(url)).json(), path);
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

test("task assignment, PIC submission and reviewer approval use the original Worker", async ({
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
