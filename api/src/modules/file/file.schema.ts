export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const parseFileMetadata = (form: FormData) => ({
  entityType: String(form.get("entityType") || "GENERAL").slice(0, 40),
  entityId: String(form.get("entityId") || "").slice(0, 100),
});
