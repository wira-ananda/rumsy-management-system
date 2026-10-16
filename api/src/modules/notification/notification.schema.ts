export const taskNotificationInput = (body: any) => ({
  kind: String(body.kind || ""),
  toUserId: String(body.toUserId || ""),
  task: body.task || {},
});
export const TASK_NOTIFICATION_KINDS = [
  "ASSIGNED",
  "SUBMITTED",
  "APPROVED",
  "REVISION",
];
