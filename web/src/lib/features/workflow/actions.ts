import { runtime } from "../../stores/runtime.js";
import { TODAY, roles } from "../../constants/catalog.js";
import {
  currentActor,
  userById,
  suggestedReviewer,
} from "../../access/permissions.js";
import { addAudit, projectById } from "../../domain/models.js";
import { save, sendTaskEmail } from "../../services/api.js";
import {
  openForm,
  userChoices,
  projectChoices,
  options,
} from "../../services/forms";
import { uid } from "../../utils/format.js";
export function taskPicIds(task: any): string[] {
  const value = task.picUserIds || task.picUserId || task.pic;
  return (
    Array.isArray(value)
      ? value
      : value == null || value === ""
        ? []
        : String(value)
            .split(",")
            .map((part) => part.trim())
  )
    .filter(Boolean)
    .map(String);
}
export function taskPicUsers(task: any) {
  return taskPicIds(task)
    .map(userById)
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
}
export function isTaskPic(task: any) {
  return taskPicUsers(task).some(
    (user) => String(user.id) === String(runtime.session!.id),
  );
}
export function isTaskReviewer(task: any) {
  return String(task.reviewerUserId || "") === String(runtime.session!.id);
}
export function taskStatus(status: string) {
  return (
    (
      {
        TO_DO: "DIBERIKAN",
        ON_PROGRESS: "DIKERJAKAN",
        SUBMITTED: "MENUNGGU REVIEW",
        REVISION: "DIKEMBALIKAN",
        DONE: "SELESAI",
        CANCELLED: "BATAL",
      } as Record<string, string>
    )[status] || "DIBERIKAN"
  );
}
export function taskForm(edit: any = null) {
  const task = edit || {},
    selected = taskPicIds(task);
  openForm(
    edit ? "Edit Task" : "Buat Task",
    [
      {
        name: "title",
        label: "JUDUL TUGAS",
        value: task.title,
        required: true,
        wide: true,
      },
      {
        name: "description",
        label: "DESKRIPSI TUGAS",
        type: "textarea",
        value: task.description,
        wide: true,
      },
      {
        name: "projectId",
        label: "PROJECT",
        type: "select",
        value: task.projectId || "",
        options: projectChoices(),
      },
      {
        name: "picUserIds",
        label: "PIC (BISA LEBIH DARI 1)",
        type: "multiselect",
        id: "taskPic",
        value: selected,
        options: userChoices().filter((option) => option.value !== ""),
        hint: "Pilih beberapa PIC dengan Ctrl/Cmd + klik.",
      },
      {
        name: "reviewerUserId",
        label: "ATASAN / REVIEWER",
        type: "select",
        id: "taskReviewer",
        value: String(
          task.reviewerUserId || suggestedReviewer(selected[0])?.id || "",
        ),
        options: userChoices(),
        required: true,
      },
      {
        name: "startDate",
        label: "TANGGAL MULAI",
        type: "date",
        value: task.startDate || TODAY,
        required: true,
      },
      {
        name: "due",
        label: "TARGET SELESAI",
        type: "date",
        value: task.due || TODAY,
        required: true,
      },
      {
        name: "priority",
        label: "PRIORITY",
        type: "select",
        value: task.priority || "MEDIUM",
        options: options(["LOW", "MEDIUM", "HIGH"]),
      },
    ],
    async (form, values) => {
      const value: any = Object.fromEntries(form),
        ids: string[] = values.picUserIds.map(String),
        reviewer = userById(value.reviewerUserId);
      if (!ids.length || !reviewer)
        throw new Error("Minimal 1 PIC dan reviewer wajib dipilih.");
      const pics = ids
          .map(userById)
          .filter((user): user is NonNullable<typeof user> => Boolean(user)),
        previous = taskPicIds(task),
        identity = {
          ...value,
          picUserIds: ids,
          picUserId: ids[0],
          pic: pics.map((user) => user.name).join(", "),
          picEmail: pics.map((user) => user.email).join(", "),
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
        };
      let result = edit;
      if (edit) Object.assign(edit, identity);
      else {
        result = {
          id: uid("TSK"),
          ...identity,
          creator: currentActor(),
          creatorUserId: runtime.session!.id,
          status: "TO_DO",
          submittedAt: "",
          completedAt: "",
          reviewNote: "",
          revisionCount: 0,
          emailStatus: "PENDING",
        };
        runtime.data!.tasks.unshift(result);
      }
      await save();
      for (const id of ids)
        if (!edit || !previous.includes(id))
          await sendTaskEmail("ASSIGNED", result, id);
      await save();
    },
    {
      id: "taskForm",
      submitLabel: "Simpan Task",
      notice:
        "PIC menerima notifikasi saat task diberikan. Setelah selesai diajukan, task masuk ke reviewer untuk approval.",
      onChange: (name, values) => {
        if (name === "picUserIds") {
          const reviewer = suggestedReviewer(values.picUserIds[0]);
          if (reviewer) values.reviewerUserId = String(reviewer.id);
        }
      },
    },
  );
}
export async function taskAction(
  task: any,
  action: "START" | "SUBMIT" | "APPROVE" | "DELETE",
) {
  if (action === "DELETE") {
    if (!confirm("Hapus task ini?")) return;
    runtime.data!.tasks = runtime.data!.tasks.filter(
      (item: any) => String(item.id) !== String(task.id),
    );
    addAudit(currentActor(), "TASK", task.id, "DELETE", "Task dihapus.");
    await save();
    return;
  }
  if (action === "START" && isTaskPic(task)) {
    task.status = "ON_PROGRESS";
    task.startedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    await save();
  }
  if (action === "SUBMIT" && isTaskPic(task)) {
    task.status = "SUBMITTED";
    task.submittedAt = new Date().toISOString();
    task.reviewNote = "";
    task.updatedAt = new Date().toISOString();
    await save();
    if (task.reviewerUserId)
      await sendTaskEmail("SUBMITTED", task, task.reviewerUserId);
  }
  if (action === "APPROVE" && isTaskReviewer(task)) {
    task.status = "DONE";
    task.completedAt = new Date().toISOString();
    task.reviewNote = "Disetujui oleh " + currentActor();
    task.updatedAt = new Date().toISOString();
    await save();
    for (const user of taskPicUsers(task))
      await sendTaskEmail("APPROVED", task, user.id);
  }
}
export function taskRevisionForm(task: any) {
  openForm(
    "Kembalikan Task",
    [
      {
        name: "note",
        label: "CATATAN PERBAIKAN",
        type: "textarea",
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      if (!isTaskReviewer(task)) return;
      task.status = "REVISION";
      task.reviewNote = form.get("note");
      task.revisionCount = Number(task.revisionCount || 0) + 1;
      task.submittedAt = "";
      task.updatedAt = new Date().toISOString();
      await save();
      for (const user of taskPicUsers(task))
        await sendTaskEmail("REVISION", task, user.id);
    },
    { id: "revTaskForm", submitLabel: "Kembalikan ke PIC" },
  );
}
export async function decideApproval(approval: any, status: string) {
  approval.status = status;
  approval.decisionAt = TODAY;
  approval.comment = approval.comment || "";
  addAudit(
    roles[runtime.session!.role as keyof typeof roles],
    "APPROVAL",
    approval.id,
    status,
    approval.subject,
  );
  const project = projectById(approval.projectId);
  if (approval.type === "ADDENDUM") {
    const item = project?.addendums.find(
      (item: any) => item.id === approval.reference,
    );
    if (item) {
      if (status === "APPROVED")
        Object.assign(item, {
          status: "APPROVED",
          approvedBy: roles[runtime.session!.role as keyof typeof roles],
          approvedAt: TODAY,
          rejectedBy: "",
          rejectedAt: "",
          rejectionReason: "",
        });
      else if (status === "REJECTED")
        Object.assign(item, {
          status: "REJECTED",
          rejectedBy: roles[runtime.session!.role as keyof typeof roles],
          rejectedAt: TODAY,
          rejectionReason: approval.comment || "Ditolak pada Approval Queue.",
          approvedBy: "",
          approvedAt: "",
        });
      else if (status === "RETURNED")
        Object.assign(item, {
          status: "DRAFT",
          rejectedBy: "",
          rejectedAt: "",
          rejectionReason: "Dikembalikan untuk diperbaiki.",
          approvedBy: "",
          approvedAt: "",
        });
    }
  }
  if (approval.type === "HANDOVER" && project) {
    if (status === "APPROVED") project.handover.status = "ACCEPTED";
    if (["RETURNED", "REJECTED"].includes(status))
      project.handover.status = "RETURNED";
  }
  await save();
}
export function supportForm() {
  openForm(
    "Buat Support Request",
    [
      {
        name: "category",
        label: "CATEGORY",
        type: "select",
        value: "FINANCE",
        options: options(["FINANCE", "PURCHASING", "HRD", "LEGAL", "ARDA"]),
      },
      {
        name: "projectId",
        label: "PROJECT",
        type: "select",
        value: "",
        options: projectChoices(),
      },
      { name: "subject", label: "SUBJECT", required: true, wide: true },
      {
        name: "description",
        label: "DESCRIPTION",
        type: "textarea",
        wide: true,
      },
      {
        name: "priority",
        label: "PRIORITY",
        type: "select",
        value: "LOW",
        options: options(["LOW", "MEDIUM", "HIGH"]),
      },
      { name: "due", label: "DUE", type: "date", value: "2026-08-12" },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form);
      runtime.data!.support.unshift({
        id: uid("SUP"),
        ...value,
        requester: roles[runtime.session!.role as keyof typeof roles],
        assigned: value.category,
        status: "SUBMITTED",
      });
      await save();
    },
    { id: "supForm", submitLabel: "Submit Request" },
  );
}
