import { runtime } from "../../stores/runtime.js";
import { TODAY } from "../../constants/catalog.js";
import { currentActor } from "../../access/permissions.js";
import { addAudit, addProjectActivity } from "../../domain/models.js";
import { save, uploadFile, removeFile } from "../../services/api.js";
import { openForm, options } from "../../services/forms";
import { uid, nowIso } from "../../utils/format.js";
import type { FormField } from "../../types/forms";
export function documentForm(
  project: any,
  preset: any = null,
  edit: any = null,
) {
  const fields: FormField[] = [];
  if (!preset && (!edit || edit.category === "OTHER"))
    fields.push({
      name: "type",
      label: "NAMA DOKUMEN",
      value: edit?.type,
      required: true,
      wide: true,
    });
  fields.push(
    {
      name: "file",
      label: edit ? "GANTI FILE (OPSIONAL)" : "PILIH FILE",
      type: "file",
      accept: ".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png",
      required: !edit,
      wide: true,
    },
    {
      name: "date",
      label: "TANGGAL DOKUMEN",
      type: "date",
      value: edit?.date || TODAY,
    },
  );
  openForm(
    edit ? `Edit ${edit.type}` : `Upload ${preset?.label || "Dokumen Lain"}`,
    fields,
    async (form) => {
      const file = form.get("file") as File,
        oldFile = edit?.fileId;
      if (edit) {
        if (edit.category === "OTHER")
          edit.type = String(form.get("type") || edit.type).trim();
        edit.date = form.get("date") || edit.date;
        if (file?.size) {
          const up = await uploadFile(file, "DOCUMENT", project.id);
          edit.fileId = up.id;
          edit.name = up.name;
          edit.version = Number(edit.version || 1) + 1;
          if (oldFile)
            try {
              await removeFile(oldFile);
            } catch {}
        }
        addProjectActivity(project, currentActor(), `${edit.type} diperbarui.`);
        addAudit(currentActor(), "DOCUMENT", edit.id, "UPDATE", edit.type);
      } else {
        if (!file?.size) throw new Error("File wajib diunggah.");
        const type = preset?.type || String(form.get("type") || "").trim(),
          category = preset?.category || "OTHER",
          version =
            project.documents
              .filter((item: any) => item.type === type)
              .reduce(
                (max: number, item: any) =>
                  Math.max(max, Number(item.version || 0)),
                0,
              ) + 1,
          up = await uploadFile(file, "DOCUMENT", project.id);
        project.documents
          .filter((item: any) => item.type === type && item.status === "FINAL")
          .forEach((item: any) => (item.status = "SUPERSEDED"));
        project.documents.push({
          id: uid("DOC"),
          category,
          type,
          name: up.name,
          fileId: up.id,
          status: "FINAL",
          version,
          date: form.get("date") || TODAY,
        });
        addProjectActivity(project, currentActor(), `${type} diupload.`);
        addAudit(
          currentActor(),
          "DOCUMENT",
          project.id,
          "UPLOAD",
          `${type} v${version}`,
        );
      }
      await save();
    },
    {
      id: edit ? "editDocForm" : "simpleDocForm",
      submitLabel: edit ? "Simpan Perubahan" : "Upload Dokumen",
    },
  );
}
export async function deleteDocument(project: any, document: any) {
  if (!confirm(`Hapus dokumen ${document.type}?`)) return;
  try {
    if (document.fileId) await removeFile(document.fileId);
    project.documents = project.documents.filter(
      (item: any) => item.id !== document.id,
    );
    addProjectActivity(project, currentActor(), `${document.type} dihapus.`);
    addAudit(currentActor(), "DOCUMENT", document.id, "DELETE", document.type);
    await save();
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
}
export function progressForm(
  project: any,
  kind: "DAILY" | "WEEKLY",
  edit: any = null,
) {
  const daily = kind === "DAILY",
    report = edit || {},
    fields: FormField[] = daily
      ? [
          {
            name: "date",
            label: "TANGGAL",
            type: "date",
            value: report.date || TODAY,
            required: true,
          },
        ]
      : [
          {
            name: "start",
            label: "PERIODE MULAI",
            type: "date",
            value: report.start || TODAY,
            required: true,
          },
          {
            name: "end",
            label: "PERIODE SELESAI",
            type: "date",
            value: report.end || TODAY,
            required: true,
          },
        ];
  fields.push({
    name: "progress",
    label: "PROGRESS AKTUAL (%)",
    type: "number",
    value: report.progress ?? project.progress,
    min: 0,
    max: 100,
    required: true,
  });
  if (!daily)
    fields.push({
      name: "targetProgress",
      label: "TARGET PROGRESS (%)",
      type: "number",
      value: report.targetProgress ?? project.progress,
      min: 0,
      max: 100,
    });
  fields.push(
    {
      name: "activities",
      label: "URAIAN PEKERJAAN / PROGRESS",
      type: "textarea",
      value: report.activities,
      required: true,
      wide: true,
    },
    {
      name: "issues",
      label: "KENDALA / CATATAN",
      type: "textarea",
      value: report.issues,
      wide: true,
    },
    {
      name: "nextPlan",
      label: "RENCANA SELANJUTNYA",
      type: "textarea",
      value: report.nextPlan,
      wide: true,
    },
    {
      name: "file",
      label: "FOTO PROGRESS",
      type: "file",
      accept: "image/*",
      multiple: true,
      hint: edit
        ? "Opsional saat mengedit."
        : "Minimal 3 foto untuk laporan baru.",
    },
    {
      name: "published",
      label: "PUBLIKASIKAN KE CLIENT",
      type: "select",
      value: report.published === false ? "0" : "1",
      options: [
        { value: "1", label: "Ya" },
        { value: "0", label: "Tidak" },
      ],
    },
  );
  openForm(
    `${edit ? "Edit" : "Tambah"} Laporan ${daily ? "Harian" : "Mingguan"}`,
    fields,
    async (form) => {
      const files = (form.getAll("file") as File[]).filter(
        (file) => file.size > 0,
      );
      if (files.length < 3 && !edit)
        throw new Error("Minimal upload 3 foto progress.");
      const uploads = [];
      for (const file of files)
        uploads.push(
          await uploadFile(
            file,
            daily ? "PROGRESS_DAILY" : "PROGRESS_WEEKLY",
            project.id,
          ),
        );
      const value: any = {
        progress: Number(form.get("progress") || 0),
        activities: form.get("activities"),
        issues: form.get("issues"),
        nextPlan: form.get("nextPlan"),
        published: form.get("published") === "1",
        updatedBy: currentActor(),
        updatedAt: nowIso(),
      };
      if (daily) value.date = form.get("date");
      else
        Object.assign(value, {
          start: form.get("start"),
          end: form.get("end"),
          targetProgress: Number(form.get("targetProgress") || 0),
        });
      const photos = uploads.map((item) => ({ id: item.id, name: item.name }));
      if (edit) {
        const old = edit.fileId;
        Object.assign(edit, value);
        if (uploads.length)
          Object.assign(edit, {
            fileId: uploads[0].id,
            fileName: uploads[0].name,
            photos,
          });
        if (old && uploads.length)
          try {
            await removeFile(old);
          } catch {}
      } else
        project[daily ? "progressDaily" : "progressWeekly"].unshift({
          id: uid(daily ? "DPR" : "WPR"),
          ...value,
          fileId: uploads[0]?.id || "",
          fileName: uploads[0]?.name || "",
          photos,
          createdBy: currentActor(),
          createdAt: nowIso(),
        });
      project.progress = Math.max(
        Number(project.progress || 0),
        value.progress,
      );
      addProjectActivity(
        project,
        currentActor(),
        `Laporan ${daily ? "harian" : "mingguan"} progress ${value.progress}% disimpan.`,
      );
      addAudit(
        currentActor(),
        "PROGRESS_REPORT",
        project.id,
        edit ? "UPDATE" : "CREATE",
        daily ? "Harian" : "Mingguan",
      );
      await save();
    },
    { id: "progressReportForm", submitLabel: "Simpan Laporan" },
  );
}
export async function deleteProgress(project: any, kind: string, report: any) {
  if (!confirm("Hapus laporan progress ini?")) return;
  if (report.fileId)
    try {
      await removeFile(report.fileId);
    } catch {}
  const key = kind === "DAILY" ? "progressDaily" : "progressWeekly";
  project[key] = project[key].filter((item: any) => item.id !== report.id);
  await save();
}
