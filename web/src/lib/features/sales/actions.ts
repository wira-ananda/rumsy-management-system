import { runtime } from "../../stores/runtime.js";
import { TODAY, HOT_MILESTONES } from "../../constants/catalog.js";
import {
  currentActor,
  normSales,
  salesDirectoryNames,
  salesDisplay,
  belongsToSales,
} from "../../access/permissions.js";
import { addAudit, projectForLead } from "../../domain/models.js";
import { recomputeLeadStage } from "../../domain/pipeline.js";
import { addLeadChat } from "../../services/chat.js";
import { save } from "../../services/api.js";
import { openForm, options } from "../../services/forms";
import { uid, nowLabel, money } from "../../utils/format.js";
import LeadForm from "../../components/sales/LeadForm.svelte";
import { showDialog } from "../../stores/dialog";

export function leadForm(edit: any = null) {
  const lead = edit || {};
  const sales =
    runtime.session!.role === "SALES_EXECUTIVE"
      ? [runtime.session!.scopeName || runtime.session!.name]
      : [...new Set([...salesDirectoryNames(), lead.sales].filter(Boolean))];
  const sources = [
    ...new Set(
      [
        ...(runtime.data!.settings.leadSources || []),
        "WhatsApp",
        lead.source,
      ].filter(Boolean),
    ),
  ] as string[];
  showDialog(edit ? "Edit Lead" : "Tambah Lead Baru", LeadForm, {
    lead,
    sales,
    sources,
    editing: !!edit,
    submit: async (value: any) => {
      value.sales =
        salesDisplay(
          runtime.salesDirectory.find(
            (user) => normSales(salesDisplay(user)) === normSales(value.sales),
          ),
        ) || value.sales;
      const before = edit ? JSON.parse(JSON.stringify(edit)) : null;
      const data = runtime.data!,
        previousAudit = [...data.audit];
      let item: any;
      if (edit) {
        Object.assign(edit, value);
        recomputeLeadStage(edit);
        addAudit(
          currentActor(),
          "LEAD",
          edit.id,
          "UPDATE",
          "Data lead diperbarui dan pipeline dievaluasi ulang",
        );
      } else {
        item = {
          id: uid("LD"),
          ...value,
          estGambar: 0,
          stage: "WARM",
          lastActivity: TODAY,
          milestones: ["Kebutuhan teridentifikasi"],
        };
        runtime.data!.leads.unshift(item);
        recomputeLeadStage(item);
        addAudit(
          currentActor(),
          "LEAD",
          item.id,
          "CREATE",
          "Lead baru dibuat; pipeline dievaluasi otomatis",
        );
      }
      try {
        await save({ throwOnError: true });
      } catch (error) {
        // A conflict reloads fresh server state; only undo our optimistic
        // changes when this is still the same local snapshot.
        if (runtime.data === data) {
          if (edit && before) {
            for (const key of Object.keys(edit))
              if (!(key in before)) delete edit[key];
            Object.assign(edit, before);
          }
          if (item)
            data.leads = data.leads.filter((lead: any) => lead.id !== item.id);
          data.audit = previousAudit;
        }
        throw error;
      }
    },
  });
}

export async function deleteLead(lead: any) {
  const linked = projectForLead(lead.id);
  if (linked)
    return alert(
      `Lead ini sudah terhubung ke Project ${linked.id} dan tidak boleh dihapus. Gunakan status Hold/Batal agar riwayat tetap aman.`,
    );
  if (
    !confirm(
      `Hapus Lead ${lead.client}? Data Lead dan chat internalnya akan dihapus permanen.`,
    )
  )
    return;
  runtime.data!.leads = runtime.data!.leads.filter(
    (item: any) => item.id !== lead.id,
  );
  addAudit(
    currentActor(),
    "LEAD",
    lead.id,
    "DELETE",
    `Lead ${lead.client} dihapus`,
  );
  await save();
  location.hash = "#/leads";
}
export function milestoneForm(lead: any) {
  openForm(
    "Tambah Milestone",
    [
      {
        name: "m",
        label: "MILESTONE",
        type: "select",
        options: options(HOT_MILESTONES),
        value: HOT_MILESTONES[0],
      },
    ],
    async (form) => {
      const milestone = String(form.get("m"));
      if (!lead.milestones.includes(milestone)) lead.milestones.push(milestone);
      lead.lastActivity = TODAY;
      addLeadChat(lead, currentActor(), `Milestone: ${milestone}`);
      recomputeLeadStage(lead, true);
      await save();
    },
    { id: "mileForm" },
  );
}
export function holdForm(lead: any) {
  openForm(
    "Hold / Batal Lead",
    [
      {
        name: "side",
        label: "STATUS",
        type: "select",
        options: options(["HOLD", "BATAL"]),
        value: "HOLD",
      },
      {
        name: "reason",
        label: "ALASAN (WAJIB)",
        type: "textarea",
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      lead.previousStage = lead.stage;
      lead.pipelineSide = form.get("side");
      lead.sideReason = form.get("reason");
      lead.stage = "HOLD_BATAL";
      addAudit(
        currentActor(),
        "PIPELINE",
        lead.id,
        "HOLD_BATAL",
        `${lead.pipelineSide}: ${lead.sideReason}`,
      );
      addLeadChat(
        lead,
        "System",
        `Pipeline masuk ${lead.pipelineSide}: ${lead.sideReason}`,
        true,
      );
      await save();
    },
    { id: "sideForm" },
  );
}
export async function resumeLead(lead: any) {
  lead.pipelineSide = "";
  lead.sideReason = "";
  lead.stage = lead.previousStage || "WARM";
  recomputeLeadStage(lead, true);
  await save();
}
export function activityForm() {
  const leads =
    runtime.session!.role === "SALES_EXECUTIVE"
      ? runtime.data!.leads.filter((lead: any) => belongsToSales(lead.sales))
      : runtime.data!.leads;
  const sales =
    runtime.session!.role === "SALES_EXECUTIVE"
      ? [runtime.session!.scopeName || runtime.session!.name]
      : [...new Set([...salesDirectoryNames(), "CS"])];
  openForm(
    "Tambah CRM Activity",
    [
      { name: "date", label: "TANGGAL", type: "date", value: TODAY },
      {
        name: "leadId",
        label: "NAMA CLIENT / LEAD",
        type: "select",
        value: "",
        options: [
          { value: "", label: "Pilih Lead" },
          ...leads.map((lead: any) => ({
            value: lead.id,
            label: `${lead.client} — ${lead.phone}`,
          })),
        ],
        required: true,
      },
      { name: "phone", label: "NOMOR TELEPON", readonly: true },
      { name: "email", label: "EMAIL", readonly: true },
      {
        name: "category",
        label: "KATEGORI",
        type: "select",
        value: "Baru",
        options: options(["Baru", "Lama"]),
      },
      {
        name: "channel",
        label: "JENIS LAYANAN",
        type: "select",
        value: "Chat",
        options: options([
          "Chat",
          "Telepon",
          "Meeting Offline",
          "Meeting Online",
        ]),
      },
      {
        name: "subject",
        label: "PERIHAL",
        type: "select",
        value: "Belum teridentifikasi",
        options: options([
          "Belum teridentifikasi",
          "Tanya produk",
          "Tanya progress pembangunan",
          "Payment DP Gambar",
          "Payment DP Proyek",
          "Komplain",
        ]),
      },
      {
        name: "pic",
        label: "PIC",
        type: "select",
        value: sales[0],
        options: options(sales),
      },
      { name: "next", label: "NEXT FOLLOW UP", type: "date" },
      { name: "notes", label: "CATATAN", type: "textarea", wide: true },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form),
        lead = leads.find((item: any) => item.id === value.leadId);
      if (lead)
        Object.assign(value, {
          client: lead.client || "",
          phone: lead.phone || "",
          email: lead.email || "",
        });
      runtime.data!.crm.unshift({ id: uid("CRM"), ...value });
      await save();
    },
    {
      id: "actForm",
      onChange: (name, values) => {
        if (name === "leadId") {
          const lead = leads.find((item: any) => item.id === values.leadId);
          values.phone = lead?.phone || "";
          values.email = lead?.email || "";
        }
      },
    },
  );
}
export function salesReportMetrics(reportDate: string, sales: string) {
  const leads = runtime.data!.leads.filter(
    (lead: any) =>
      lead.dateIn === reportDate && normSales(lead.sales) === normSales(sales),
  );
  const activities = runtime.data!.crm.filter(
    (item: any) =>
      item.date === reportDate && normSales(item.pic) === normSales(sales),
  );
  const owned = runtime.data!.leads.filter(
    (lead: any) =>
      normSales(lead.sales) === normSales(sales) && lead.stage !== "HOLD_BATAL",
  );
  const count = (channel: string) =>
    activities.filter((item: any) => item.channel === channel).length;
  return {
    newLeads: leads.length,
    chat: count("Chat"),
    calls: count("Telepon"),
    meetingOffline: count("Meeting Offline"),
    meetingOnline: count("Meeting Online"),
    activities: activities.length,
    followUpDue: owned.filter((lead: any) => lead.nextFollowUp === reportDate)
      .length,
    pipelineValue: owned.reduce(
      (sum: number, lead: any) =>
        sum + Number(lead.estAsstCr > 0 ? lead.estAsstCr : lead.estRab || 0),
      0,
    ),
  };
}
export function dailyReportForm(edit: any = null) {
  const report = edit || {},
    sales =
      runtime.session!.role === "SALES_EXECUTIVE"
        ? [runtime.session!.scopeName || runtime.session!.name]
        : ([
            ...new Set(
              [
                ...salesDirectoryNames(),
                ...runtime.data!.leads.map((lead: any) => lead.sales),
              ].filter(Boolean),
            ),
          ] as string[]);
  openForm(
    edit ? "Edit Laporan Harian Sales" : "Buat Laporan Harian Sales",
    [
      {
        name: "date",
        label: "TANGGAL",
        type: "date",
        value: report.date || TODAY,
        required: true,
      },
      {
        name: "sales",
        label: "SALES",
        type: "select",
        value: report.sales || sales[0],
        options: options(sales),
      },
      {
        name: "activityDescription",
        label: "DESKRIPSI KEGIATAN / AKTIVITAS YANG DILAKUKAN",
        type: "textarea",
        value: report.activityDescription,
        required: true,
        wide: true,
      },
      {
        name: "result",
        label: "HASIL / CAPAIAN HARI INI",
        type: "textarea",
        value: report.result,
        required: true,
        wide: true,
      },
      {
        name: "obstacle",
        label: "KENDALA",
        type: "textarea",
        value: report.obstacle,
        wide: true,
      },
      {
        name: "nextPlan",
        label: "RENCANA TINDAK LANJUT / BESOK",
        type: "textarea",
        value: report.nextPlan,
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form);
      if (
        runtime.data!.salesDailyReports.some(
          (item: any) =>
            item.id !== report.id &&
            item.date === value.date &&
            normSales(item.sales) === normSales(value.sales),
        )
      )
        throw new Error(
          "Laporan harian untuk Sales dan tanggal tersebut sudah ada. Gunakan tombol Edit pada laporan yang sudah tersimpan.",
        );
      const metrics = salesReportMetrics(value.date, value.sales);
      if (edit)
        Object.assign(edit, value, {
          metrics,
          updatedAt: nowLabel(),
          updatedBy: currentActor(),
        });
      else
        runtime.data!.salesDailyReports.unshift({
          id: uid("SDR"),
          ...value,
          metrics,
          createdAt: nowLabel(),
          createdBy: currentActor(),
        });
      addAudit(
        currentActor(),
        "SALES_DAILY_REPORT",
        report.id || "NEW",
        edit ? "UPDATE" : "CREATE",
        `${value.sales} • ${value.date}`,
      );
      await save();
    },
    {
      id: "dailyForm",
      summary: (values) => {
        const metrics = salesReportMetrics(values.date, values.sales);
        return `Rekap Otomatis RMS: Lead Baru ${metrics.newLeads} • Chat ${metrics.chat} • Telepon ${metrics.calls} • Meeting Offline ${metrics.meetingOffline} • Meeting Online ${metrics.meetingOnline} • Total Aktivitas ${metrics.activities} • Follow-up jatuh tempo ${metrics.followUpDue} • Pipeline ${money(metrics.pipelineValue)}`;
      },
    },
  );
}
