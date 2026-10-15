import { runtime } from "../../stores/runtime.js";

import {
  currentActor,
  userById,
  userByName,
} from "../../access/permissions.js";
import { addAudit, addProjectActivity } from "../../domain/models.js";
import { addProjectChat } from "../../services/chat.js";
import { save, removeFile } from "../../services/api.js";
import { openForm, userChoices } from "../../services/forms";
import { uid, date } from "../../utils/format.js";
import type { FormField } from "../../types/forms";
export function projectForm(edit: any = null) {
  const project = edit || {};
  const fields: FormField[] = [
    {
      name: "name",
      label: "NAMA PROJECT",
      value: project.name,
      required: true,
    },
    {
      name: "client",
      label: "NAMA KLIEN",
      value: project.client,
      required: true,
    },
    {
      name: "location",
      label: "LOKASI",
      value: project.location,
      required: true,
    },
    {
      name: "salesUserId",
      label: "SALES PIC",
      type: "select",
      value: String(project.salesUserId || userByName(project.sales)?.id || ""),
      options: userChoices(["SALES_EXECUTIVE"]),
    },
    {
      name: "opsUserId",
      label: "PIC OPERASIONAL",
      type: "select",
      value: String(project.opsUserId || userByName(project.ops)?.id || ""),
      options: userChoices(["MANAGER_OPERASIONAL", "HEAD_BU", "ADMIN_GENERAL"]),
    },
    {
      name: "qcUserId",
      label: "PIC QC",
      type: "select",
      value: String(project.qcUserId || userByName(project.qc)?.id || ""),
      options: userChoices(["MANAGER_QC", "QC_TEKNIS"]),
    },
  ];
  if (!edit)
    fields.push(
      {
        name: "originalContract",
        label: "NILAI KONTRAK AWAL",
        type: "number",
        value: 0,
      },
      { name: "startDate", label: "TANGGAL MULAI", type: "date" },
      { name: "targetFinish", label: "TARGET SELESAI", type: "date" },
    );
  openForm(
    edit ? "Edit Project" : "Tambah Project",
    fields,
    async (form) => {
      const value: any = Object.fromEntries(form),
        sales = userById(value.salesUserId),
        ops = userById(value.opsUserId),
        qc = userById(value.qcUserId),
        identity = {
          name: value.name,
          client: value.client,
          location: value.location,
          sales: sales?.scopeName || sales?.name || "",
          salesUserId: value.salesUserId || "",
          ops: ops?.name || "",
          opsUserId: value.opsUserId || "",
          qc: qc?.name || "",
          qcUserId: value.qcUserId || "",
        };
      if (edit) {
        Object.assign(edit, identity);
        const client = runtime.data!.clients.find(
          (item: any) => item.id === edit.clientId,
        );
        if (client) {
          client.name = value.client;
          client.address = value.location;
        }
        addProjectActivity(
          edit,
          currentActor(),
          "Data project dan PIC diperbarui.",
        );
        addAudit(
          currentActor(),
          "PROJECT",
          edit.id,
          "UPDATE",
          "Informasi project diperbarui",
        );
      } else {
        let client = runtime.data!.clients.find(
          (item: any) =>
            item.name.trim().toLowerCase() ===
            value.client.trim().toLowerCase(),
        );
        if (!client) {
          client = {
            id: uid("CL"),
            name: value.client,
            phone: "",
            email: "",
            address: value.location,
            notes: "",
          };
          runtime.data!.clients.unshift(client);
        }
        const item = {
          id: `RMS-PRJ-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
          clientId: client.id,
          leadId: null,
          ...identity,
          status: "PREPARATION",
          progress: 0,
          originalContract: Number(value.originalContract || 0),
          startDate: value.startDate || "",
          targetFinish: value.targetFinish || "",
          actualFinish: "",
          contract: {
            number: "",
            date: "",
            status: "DRAFT",
            dp: 0,
            margin: 0,
            tenor: 0,
          },
          handover: {
            status: "DRAFT",
            submittedAt: "",
            reviewedAt: "",
            note: "",
          },
          started: false,
          completionApproved: false,
          transactions: [],
          installments: [],
          addendums: [],
          documents: [],
          inspections: [],
          qcFindings: [],
          progressDaily: [],
          progressWeekly: [],
          clientPortal: { enabled: false, token: "", createdAt: "" },
          activity: [],
          chat: [],
        };
        runtime.data!.projects.unshift(item);
        addProjectActivity(item, currentActor(), "Project dibuat manual.");
        addProjectChat(item, "System", "Project dossier dibuat.", true);
        addAudit(
          currentActor(),
          "PROJECT",
          item.id,
          "CREATE",
          "Project baru dibuat",
        );
      }
      await save();
    },
    {
      id: "projectForm",
      notice:
        "PIC dipilih dari akun aktif RMS sehingga nama dan email tidak perlu diketik manual.",
      submitLabel: edit ? "Simpan Perubahan" : "Buat Project",
    },
  );
}
export async function deleteProject(project: any) {
  if (!["HEAD_BU", "SUPER_ADMIN"].includes(runtime.session!.role))
    return alert("Hanya Head BU / Super Admin yang dapat menghapus project.");
  if (project.transactions.some((item: any) => item.status === "VERIFIED"))
    return alert(
      "Project tidak dapat dihapus karena sudah memiliki transaksi VERIFIED. Perbaiki data melalui Edit Project atau arsipkan project.",
    );
  if (
    !confirm(
      `Hapus Project ${project.name}? Tindakan ini untuk project salah input dan tidak dapat dibatalkan.`,
    )
  )
    return;
  const files = [
    ...project.documents.map((item: any) => item.fileId),
    ...project.transactions.map((item: any) => item.proofFileId),
    ...project.progressDaily.map((item: any) => item.fileId),
    ...project.progressWeekly.map((item: any) => item.fileId),
    ...project.chat.map((item: any) => item.fileId),
  ].filter(Boolean);
  runtime.data!.projects = runtime.data!.projects.filter(
    (item: any) => item.id !== project.id,
  );
  addAudit(
    currentActor(),
    "PROJECT",
    project.id,
    "DELETE",
    "Project salah input dihapus",
  );
  await save();
  await Promise.allSettled(files.map(removeFile));
  location.hash = "#/projects";
}
export function contractForm(project: any) {
  const contract = project.contract;
  openForm(
    "Edit Informasi Kontrak",
    [
      {
        name: "number",
        label: "NOMOR AKAD / KONTRAK",
        value: contract.number,
        required: true,
      },
      {
        name: "date",
        label: "TANGGAL AKAD",
        type: "date",
        value: contract.date,
        required: true,
      },
      {
        name: "originalContract",
        label: "NILAI KONTRAK AWAL",
        type: "number",
        value: project.originalContract,
        required: true,
      },
      {
        name: "dp",
        label: "DP (%)",
        type: "number",
        value: contract.dp,
        min: 0,
        max: 100,
      },
      {
        name: "margin",
        label: "MARGIN (%)",
        type: "number",
        value: contract.margin,
        min: 0,
        max: 100,
      },
      {
        name: "tenor",
        label: "TENOR (BULAN)",
        type: "number",
        value: contract.tenor,
        min: 0,
      },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form);
      Object.assign(contract, {
        number: value.number.trim(),
        date: value.date,
        dp: Number(value.dp || 0),
        margin: Number(value.margin || 0),
        tenor: Number(value.tenor || 0),
      });
      project.originalContract = Number(value.originalContract || 0);
      addProjectActivity(
        project,
        currentActor(),
        "Informasi kontrak diperbarui.",
      );
      addAudit(
        currentActor(),
        "CONTRACT",
        project.id,
        "UPDATE",
        "Nomor/tanggal/nilai kontrak diperbarui",
      );
      await save();
    },
    { id: "contractForm", submitLabel: "Simpan Informasi Kontrak" },
  );
}
export function scheduleForm(project: any) {
  openForm(
    "Edit Jadwal Project",
    [
      {
        name: "startDate",
        label: "TANGGAL MULAI",
        type: "date",
        value: project.startDate,
      },
      {
        name: "targetFinish",
        label: "TARGET SELESAI",
        type: "date",
        value: project.targetFinish,
        required: true,
      },
      {
        name: "opsUserId",
        label: "PIC OPERASIONAL",
        type: "select",
        value: String(project.opsUserId || userByName(project.ops)?.id || ""),
        options: userChoices([
          "MANAGER_OPERASIONAL",
          "HEAD_BU",
          "ADMIN_GENERAL",
        ]),
      },
      {
        name: "qcUserId",
        label: "PIC QC",
        type: "select",
        value: String(project.qcUserId || userByName(project.qc)?.id || ""),
        options: userChoices(["MANAGER_QC", "QC_TEKNIS"]),
      },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form);
      project.startDate = value.startDate;
      project.targetFinish = value.targetFinish;
      project.opsUserId = value.opsUserId || "";
      project.ops = userById(value.opsUserId)?.name || "";
      project.qcUserId = value.qcUserId || "";
      project.qc = userById(value.qcUserId)?.name || "";
      addProjectActivity(
        project,
        currentActor(),
        `Jadwal project diperbarui. Target selesai ${date(project.targetFinish)}.`,
      );
      addAudit(
        currentActor(),
        "PROJECT",
        project.id,
        "SCHEDULE_UPDATE",
        `Target ${project.targetFinish}`,
      );
      await save();
    },
    { id: "scheduleForm", submitLabel: "Simpan Jadwal" },
  );
}
