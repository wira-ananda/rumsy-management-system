import { runtime } from "../../stores/runtime.js";
import { TODAY, roles } from "../../constants/catalog.js";
import { currentActor } from "../../access/permissions.js";
import { addAudit } from "../../domain/models.js";
import { save, uploadFile, removeFile } from "../../services/api.js";
import { openForm } from "../../services/forms";
import { decideApproval } from "../workflow/actions";
import { uid } from "../../utils/format.js";
export function addendumForm(project: any, edit: any = null) {
  const item = edit || {};
  openForm(
    edit ? "Edit Addendum" : "Buat Addendum",
    [
      { name: "number", label: "NO.", value: item.number, required: true },
      {
        name: "date",
        label: "TANGGAL",
        type: "date",
        value: item.date || TODAY,
        required: true,
      },
      {
        name: "value",
        label: "VALUE CHANGE",
        type: "number",
        value: item.value || 0,
        required: true,
      },
      {
        name: "addendumFile",
        label: edit
          ? "UPLOAD FILE ADDENDUM (OPSIONAL)"
          : "UPLOAD FILE ADDENDUM (WAJIB)",
        type: "file",
        accept: ".pdf,.doc,.docx",
        required: !edit,
      },
      {
        name: "description",
        label: "DESKRIPSI",
        type: "textarea",
        value: item.description,
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      const file = form.get("addendumFile") as File;
      if (!edit && !file?.size) throw new Error("File addendum wajib diupload");
      const up = file?.size
          ? await uploadFile(file, "ADDENDUM", project.id)
          : null,
        value: any = Object.fromEntries(form);
      const fields = {
        number: value.number,
        date: value.date,
        value: Number(value.value),
        description: value.description,
        status: "DRAFT",
        approvedBy: "",
        approvedAt: "",
        rejectedBy: "",
        rejectedAt: "",
        rejectionReason: "",
        fileId: up?.id || item.fileId,
        fileName: up?.name || item.fileName,
      };
      let result = edit;
      if (edit) Object.assign(edit, fields);
      else {
        result = { id: uid("ADD"), ...fields };
        project.addendums.push(result);
      }
      const old = runtime.data!.approvals.find(
        (approval: any) =>
          approval.type === "ADDENDUM" &&
          approval.reference === result.id &&
          approval.status === "PENDING",
      );
      if (!old)
        runtime.data!.approvals.unshift({
          id: uid("APR"),
          type: "ADDENDUM",
          reference: result.id,
          projectId: project.id,
          subject: `Approval Addendum ${result.number}`,
          requestedBy: currentActor(),
          approver: "Head BU",
          status: "PENDING",
          comment: "",
          requestedAt: TODAY,
          decisionAt: "",
        });
      else
        Object.assign(old, {
          subject: `Approval Addendum ${result.number}`,
          requestedBy: currentActor(),
          requestedAt: TODAY,
          comment: "",
        });
      addAudit(
        currentActor(),
        "ADDENDUM",
        result.id,
        edit ? "UPDATE" : "CREATE",
        `Addendum ${value.number}`,
      );
      await save();
    },
    {
      id: "addForm",
      notice:
        "Addendum yang diedit akan kembali ke DRAFT dan perlu diproses melalui Approval Queue kembali.",
      submitLabel: edit ? "Simpan Perubahan" : "Simpan Draft",
    },
  );
}
export async function deleteAddendum(project: any, item: any) {
  if (!confirm(`Hapus Addendum ${item.number}?`)) return;
  try {
    if (item.fileId) await removeFile(item.fileId);
    project.addendums = project.addendums.filter(
      (entry: any) => entry.id !== item.id,
    );
    runtime.data!.approvals = runtime.data!.approvals.filter(
      (entry: any) =>
        !(entry.type === "ADDENDUM" && entry.reference === item.id),
    );
    addAudit(
      currentActor(),
      "ADDENDUM",
      item.id,
      "DELETE",
      `Addendum ${item.number} dihapus.`,
    );
    await save();
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
}
export async function approveAddendum(item: any) {
  const approval = runtime.data!.approvals.find(
    (entry: any) => entry.type === "ADDENDUM" && entry.reference === item.id,
  );
  if (approval) await decideApproval(approval, "APPROVED");
  else {
    item.status = "APPROVED";
    item.approvedBy = roles[runtime.session!.role as keyof typeof roles];
    item.approvedAt = TODAY;
    await save();
  }
}
export async function billAddendum(project: any, item: any) {
  project.installments.push({
    id: uid("INS"),
    type: "ADENDUM",
    seq: `Tagihan Adendum ${item.number}`,
    due: TODAY,
    dueAmount: Number(item.value),
  });
  addAudit(
    "Finance Holding",
    "PAYMENT_SCHEDULE",
    item.id,
    "CREATE",
    "Tagihan addendum dibuat",
  );
  await save();
  alert("Tagihan addendum ditambahkan ke Payment Schedule.");
}
