import {
  SETTINGS_EDIT,
  ESCALATION_EDIT,
  PAYMENT_UPLOAD,
  FINANCE_VERIFY,
  CONTRACT_SIGN,
  HANDOVER_REVIEW,
  PROJECT_START,
  COMPLETION_APPROVE,
  ADDENDUM_APPROVE,
  QC_EDIT,
} from "../../shared/constants/roles";
import { deepClone, mapById } from "../../shared/utils/collection";
import { recomputePipeline } from "../pipeline/pipeline.service";
export function enforceSensitive(oldState: any, next: any, user: any) {
  const role = user.role;
  // Settings are server guarded.
  if (!SETTINGS_EDIT.has(role)) next.settings = deepClone(oldState.settings);
  // Confidential QC escalation cannot be modified outside its role.
  if (!ESCALATION_EDIT.has(role))
    next.escalations = deepClone(oldState.escalations || []);
  const oldP = mapById(oldState.projects);
  let newP = mapById(next.projects);
  // Project deletion is restricted and projects with verified finance records are never deletable.
  for (const [id, op] of oldP) {
    if (!newP.has(id)) {
      const hasVerified = (op.transactions || []).some(
        (t: any) => t.status === "VERIFIED",
      );
      if (!["HEAD_BU", "SUPER_ADMIN"].includes(role) || hasVerified) {
        next.projects.push(deepClone(op));
      }
    }
  }
  newP = mapById(next.projects);
  for (const [id, np] of newP) {
    const op = oldP.get(id);
    if (!op) {
      // New payments on a newly-created project must still begin pending.
      for (const t of np.transactions || []) {
        if (!PAYMENT_UPLOAD.has(role)) t.__remove = true;
        else {
          t.status = "PENDING_VERIFICATION";
          t.verifiedBy = "";
          t.verifiedAt = "";
        }
      }
      np.transactions = (np.transactions || []).filter((t: any) => !t.__remove);
      continue;
    }
    // Payment: only Finance/Super Admin can change an existing payment status.
    const ot = mapById(op.transactions),
      nt = mapById(np.transactions);
    for (const [tid, t] of nt) {
      const prev = ot.get(tid);
      if (prev) {
        if (!FINANCE_VERIFY.has(role) && t.status !== prev.status) {
          t.status = prev.status;
          t.verifiedBy = prev.verifiedBy || "";
          t.verifiedAt = prev.verifiedAt || "";
        }
        if (prev.status === "VERIFIED" && !FINANCE_VERIFY.has(role)) {
          t.amount = prev.amount;
          t.type = prev.type;
          t.installmentId = prev.installmentId;
        }
      } else {
        if (!PAYMENT_UPLOAD.has(role)) {
          nt.delete(tid);
          continue;
        }
        t.status = "PENDING_VERIFICATION";
        t.verifiedBy = "";
        t.verifiedAt = "";
      }
    }
    np.transactions = [...nt.values()];
    // Contract SIGNED is protected.
    if (
      op.contract?.status !== np.contract?.status &&
      np.contract?.status === "SIGNED" &&
      !CONTRACT_SIGN.has(role)
    )
      np.contract.status = op.contract?.status || "DRAFT";
    // Handover review, project start, completion approval.
    if (
      op.handover?.status !== np.handover?.status &&
      ["ACCEPTED", "RETURNED"].includes(np.handover?.status) &&
      !HANDOVER_REVIEW.has(role)
    )
      np.handover = deepClone(op.handover);
    if (!op.started && np.started && !PROJECT_START.has(role))
      np.started = false;
    if (
      !op.completionApproved &&
      np.completionApproved &&
      !COMPLETION_APPROVE.has(role)
    )
      np.completionApproved = false;
    // Addendum approval/signing protected.
    const oa = mapById(op.addendums),
      na = mapById(np.addendums);
    for (const [aid, a] of na) {
      const pa = oa.get(aid);
      if (
        pa &&
        pa.status !== a.status &&
        ["APPROVED", "SIGNED"].includes(a.status) &&
        !ADDENDUM_APPROVE.has(role)
      )
        a.status = pa.status;
    }
    np.addendums = [...na.values()];
    // QC register protected from roles outside QC/Operations.
    if (!QC_EDIT.has(role)) {
      np.inspections = deepClone(op.inspections || []);
      np.qcFindings = deepClone(op.qcFindings || []);
    }
  }
  // Payment deletion guard: verified records cannot disappear except Finance/Super Admin.
  if (!FINANCE_VERIFY.has(role))
    for (const [id, op] of oldP) {
      const np = newP.get(id);
      if (!np) continue;
      const ids = new Set((np.transactions || []).map((t: any) => t.id));
      for (const t of op.transactions || [])
        if (t.status === "VERIFIED" && !ids.has(t.id))
          np.transactions.push(deepClone(t));
    }
  // Task workflow: assignee submits, configured reviewer approves or returns for revision.
  const oldTasks = mapById(oldState.tasks || []),
    newTasks = mapById(next.tasks || []);
  for (const [tid, ot] of oldTasks) {
    const nt = newTasks.get(tid);
    if (!nt) {
      if (!["HEAD_BU", "SUPER_ADMIN"].includes(role))
        next.tasks.push(deepClone(ot));
      continue;
    }
    if (nt.status !== ot.status) {
      const isAssignee = String(nt.picUserId || "") === String(user.id),
        isReviewer =
          String(nt.reviewerUserId || "") === String(user.id) ||
          role === "SUPER_ADMIN";
      if (["ON_PROGRESS", "SUBMITTED"].includes(nt.status) && !isAssignee) {
        Object.assign(nt, deepClone(ot));
        continue;
      }
      if (["DONE", "REVISION"].includes(nt.status) && !isReviewer) {
        Object.assign(nt, deepClone(ot));
        continue;
      }
    }
  }
  // Audit history may grow but cannot be truncated by normal users.
  if ((next.audit || []).length < (oldState.audit || []).length)
    next.audit = deepClone(oldState.audit || []);
  recomputePipeline(next);
  return next;
}
