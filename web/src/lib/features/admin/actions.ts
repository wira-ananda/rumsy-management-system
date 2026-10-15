import { runtime } from "../../stores/runtime.js";
import { TODAY } from "../../constants/catalog.js";
import { currentActor } from "../../access/permissions.js";
import { addAudit } from "../../domain/models.js";
import { save, uploadFile, removeFile } from "../../services/api.js";
import { openForm, options, projectChoices } from "../../services/forms";
import { uid, nowLabel } from "../../utils/format.js";
export function letterForm(edit: any = null) {
  const item = edit || {};
  openForm(
    edit ? "Edit Arsip Surat" : "Tambah Arsip Surat",
    [
      {
        name: "direction",
        label: "JENIS SURAT",
        type: "select",
        value: item.direction || "MASUK",
        options: [
          { value: "MASUK", label: "Surat Masuk" },
          { value: "KELUAR", label: "Surat Keluar" },
        ],
      },
      {
        name: "date",
        label: "TANGGAL SURAT",
        type: "date",
        value: item.date || TODAY,
        required: true,
      },
      {
        name: "number",
        label: "NOMOR SURAT",
        value: item.number,
        required: true,
      },
      {
        name: "party",
        label: "DARI / KEPADA",
        value: item.party,
        required: true,
      },
      {
        name: "subject",
        label: "PERIHAL",
        value: item.subject,
        required: true,
        wide: true,
      },
      {
        name: "projectId",
        label: "PROJECT (OPSIONAL)",
        type: "select",
        value: item.projectId || "",
        options: projectChoices(),
      },
      {
        name: "file",
        label: edit ? "GANTI FILE (OPSIONAL)" : "UPLOAD FILE",
        type: "file",
        accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
        required: !edit,
      },
      {
        name: "notes",
        label: "KETERANGAN",
        type: "textarea",
        value: item.notes,
        wide: true,
      },
    ],
    async (form) => {
      const file = form.get("file") as File,
        old = item.fileId,
        up = file?.size
          ? await uploadFile(file, "CORRESPONDENCE", item.id || "GENERAL")
          : null,
        value: any = Object.fromEntries(form);
      delete value.file;
      if (edit) {
        Object.assign(edit, value);
        if (up) {
          edit.fileId = up.id;
          edit.fileName = up.name;
          if (old)
            try {
              await removeFile(old);
            } catch {}
        }
        edit.updatedBy = currentActor();
      } else
        runtime.data!.correspondence.unshift({
          id: uid("LTR"),
          ...value,
          fileId: up?.id || "",
          fileName: up?.name || "",
          createdBy: currentActor(),
          createdAt: nowLabel(),
        });
      addAudit(
        currentActor(),
        "CORRESPONDENCE",
        edit ? item.id : "NEW",
        edit ? "UPDATE" : "CREATE",
        `${value.direction} ${value.number}`,
      );
      await save();
    },
    { id: "letterForm", submitLabel: "Simpan Arsip Surat" },
  );
}
export async function deleteLetter(item: any) {
  if (!confirm(`Hapus arsip surat ${item.number}?`)) return;
  try {
    if (item.fileId) await removeFile(item.fileId);
    runtime.data!.correspondence = runtime.data!.correspondence.filter(
      (entry: any) => entry.id !== item.id,
    );
    addAudit(currentActor(), "CORRESPONDENCE", item.id, "DELETE", item.number);
    await save();
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
}
