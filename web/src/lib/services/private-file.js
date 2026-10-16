import { authenticatedFetch } from "./auth-token.js";

export function privateFileUrl(id, download = false) {
  return id
    ? `/api/files/${encodeURIComponent(id)}${download ? "?download=1" : ""}`
    : "";
}

export async function loadPrivateFile(id, signal) {
  const response = await authenticatedFetch(privateFileUrl(id), { signal });
  if (!response.ok)
    throw new Error(`File tidak dapat dimuat (HTTP ${response.status}).`);
  return response.blob();
}

export async function openPrivateFile(id, download = false, filename = "") {
  const preview = download ? null : window.open("about:blank", "_blank");
  if (preview) preview.opener = null;
  try {
    const blob = await loadPrivateFile(id);
    const url = URL.createObjectURL(blob);
    // Active HTML/SVG documents are downloaded instead of executing on our origin.
    const canPreview =
      /^(image\/(png|jpeg|gif|webp|avif)|application\/pdf|text\/plain)(;|$)/i.test(
        blob.type,
      );
    if (preview && canPreview) preview.location.replace(url);
    else {
      preview?.close();
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `rms-file-${id}`;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
