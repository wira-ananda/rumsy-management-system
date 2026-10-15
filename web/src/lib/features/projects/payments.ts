import { runtime } from "../../stores/runtime.js";
import { TODAY } from "../../constants/catalog.js";
import { currentActor } from "../../access/permissions.js";
import {
  addAudit,
  addProjectActivity,
  leadById,
  installmentStatus,
} from "../../domain/models.js";
import { syncPipelineForProject } from "../../domain/pipeline.js";
import { addLeadChat, addProjectChat } from "../../services/chat.js";
import { save, uploadFile } from "../../services/api.js";
import { openForm, options } from "../../services/forms";
import { showDialog } from "../../stores/dialog";
import ProofDialog from "../../components/projects/ProofDialog.svelte";
import { uid, money } from "../../utils/format.js";
export function paymentForm(project: any, preset = "", returnLeadId = "") {
  openForm(
    "Upload Pembayaran + Bukti",
    [
      {
        name: "type",
        label: "JENIS PEMBAYARAN",
        type: "select",
        value: preset || "DP_GAMBAR",
        options: options([
          "DP_GAMBAR",
          "DP_PROYEK",
          "CICILAN",
          "ADENDUM",
          "PELUNASAN",
        ]),
      },
      {
        name: "installmentId",
        label: "ALOKASI CICILAN",
        type: "select",
        value: "",
        options: [
          { value: "", label: "-" },
          ...project.installments
            .filter((item: any) => installmentStatus(project, item) !== "PAID")
            .map((item: any) => ({
              value: item.id,
              label: `${item.seq} • ${money(item.dueAmount)}`,
            })),
        ],
      },
      {
        name: "date",
        label: "TANGGAL",
        type: "date",
        value: TODAY,
        required: true,
      },
      { name: "amount", label: "NOMINAL", type: "number", required: true },
      {
        name: "bank",
        label: "BANK TUJUAN",
        type: "select",
        value: runtime.data!.settings.banks[0],
        options: options(runtime.data!.settings.banks),
      },
      {
        name: "sender",
        label: "NAMA PENGIRIM",
        value: project.client,
        required: true,
      },
      { name: "reference", label: "NO. REFERENSI" },
      {
        name: "proof",
        label: "BUKTI (WAJIB)",
        type: "file",
        accept: ".pdf,.jpg,.jpeg,.png",
        required: true,
      },
      { name: "notes", label: "CATATAN", type: "textarea", wide: true },
    ],
    async (form) => {
      const file = form.get("proof") as File;
      if (!file?.size) throw new Error("Bukti pembayaran wajib diunggah.");
      const up = await uploadFile(file, "PAYMENT", project.id),
        value: any = Object.fromEntries(form);
      const transaction = {
        id: uid("TRX"),
        installmentId: value.installmentId,
        type: value.type,
        label: value.type.replaceAll("_", " "),
        date: value.date,
        amount: Number(value.amount),
        status: "PENDING_VERIFICATION",
        proofName: up.name,
        proofFileId: up.id,
        proofData: null,
        bank: value.bank,
        sender: value.sender,
        reference: value.reference,
        verifiedBy: "",
        verifiedAt: "",
        notes: value.notes,
      };
      project.transactions.unshift(transaction);
      addProjectActivity(
        project,
        currentActor(),
        `Bukti ${transaction.label} ${money(transaction.amount)} diunggah — Pending Verification.`,
      );
      addProjectChat(
        project,
        "System",
        `${transaction.label} ${money(transaction.amount)} diunggah dan menunggu verifikasi Finance.`,
        true,
      );
      const lead = leadById(project.leadId);
      if (lead)
        addLeadChat(
          lead,
          "System",
          `${transaction.label} sudah diunggah; stage belum berubah sampai Finance VERIFY.`,
          true,
        );
      addAudit(
        currentActor(),
        "PAYMENT",
        transaction.id,
        "UPLOAD",
        `${project.id} ${transaction.label} ${money(transaction.amount)}`,
      );
      runtime.data!.notifications.unshift({
        id: uid("N"),
        type: "PAYMENT",
        text: `${transaction.label} ${project.client} menunggu verifikasi Finance`,
        read: false,
        date: TODAY,
      });
      await save();
      location.hash = returnLeadId
        ? `#/leads/${returnLeadId}`
        : `#/projects/${project.id}/transaction`;
    },
    { id: "payForm", submitLabel: "Upload → Pending Verification" },
  );
}
export function proofDialog(transaction: any) {
  showDialog(`Bukti ${transaction.label}`, ProofDialog, { transaction });
}
export async function verifyPayment(project: any, transaction: any) {
  if (transaction.status !== "PENDING_VERIFICATION") return;
  transaction.status = "VERIFIED";
  transaction.verifiedBy = currentActor();
  transaction.verifiedAt =
    TODAY +
    " " +
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const moved = syncPipelineForProject(project);
  addProjectActivity(
    project,
    currentActor(),
    `${transaction.label} ${money(transaction.amount)} VERIFIED.${moved ? " Pipeline diperbarui otomatis." : ""}`,
  );
  addProjectChat(
    project,
    "System",
    `${transaction.label} VERIFIED oleh Finance. Pipeline dievaluasi otomatis.`,
    true,
  );
  const lead = leadById(project.leadId);
  if (lead)
    addLeadChat(
      lead,
      "System",
      `${transaction.label} VERIFIED. Current stage: ${lead.stage}.`,
      true,
    );
  addAudit(
    currentActor(),
    "PAYMENT",
    transaction.id,
    "VERIFY",
    `${project.id} ${transaction.label} ${money(transaction.amount)}`,
  );
  await save();
}
export async function rejectPayment(project: any, transaction: any) {
  transaction.status = "REJECTED";
  addProjectChat(
    project,
    "System",
    `${transaction.label} ditolak Finance; tidak memengaruhi pipeline.`,
    true,
  );
  addAudit(
    currentActor(),
    "PAYMENT",
    transaction.id,
    "REJECT",
    "Bukti pembayaran ditolak",
  );
  await save();
}
export function reversalForm(project: any, transaction: any) {
  openForm(
    "Payment Reversal",
    [
      {
        name: "reason",
        label: "ALASAN",
        type: "textarea",
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      transaction.status = "REVERSED";
      addAudit(
        currentActor(),
        "PAYMENT",
        transaction.id,
        "REVERSE",
        form.get("reason"),
      );
      addProjectChat(
        project,
        "System",
        `${transaction.label} direversal: ${form.get("reason")}`,
        true,
      );
      syncPipelineForProject(project);
      await save();
    },
    {
      id: "revForm",
      notice:
        "Transaksi VERIFIED tidak dihapus. Sistem membuat reversal/correction dan mengevaluasi ulang pipeline.",
      submitLabel: "Buat Reversal",
    },
  );
}
export function installmentForm(project: any) {
  openForm(
    "Tambah Payment Schedule",
    [
      {
        name: "type",
        label: "TYPE",
        type: "select",
        value: "CICILAN",
        options: options([
          "CICILAN",
          "DP_PROYEK",
          "DP_GAMBAR",
          "ADENDUM",
          "PELUNASAN",
        ]),
      },
      { name: "seq", label: "LABEL", required: true },
      { name: "due", label: "DUE DATE", type: "date", required: true },
      {
        name: "dueAmount",
        label: "AMOUNT DUE",
        type: "number",
        required: true,
      },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form);
      project.installments.push({
        ...value,
        id: uid("INS"),
        dueAmount: Number(value.dueAmount),
      });
      await save();
    },
    { id: "insForm", submitLabel: "Simpan Jadwal" },
  );
}
