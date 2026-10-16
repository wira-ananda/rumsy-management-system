export const getBearerToken = (authorization: string | null): string | null => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization || "");
  return match?.[1] || null;
};
