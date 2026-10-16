export function cookieMap(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  (request.headers.get("cookie") || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) {
      try {
        out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1));
      } catch {
        // An invalid cookie must not turn authentication into an HTTP 500.
      }
    }
  });
  return out;
}
