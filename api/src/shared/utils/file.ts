export function safeFileName(s: any) {
  return String(s || "file")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);
}
