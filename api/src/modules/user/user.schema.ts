import { ROLES } from "../../shared/constants/roles";
export const userSchema = {
  create: (body: any) => {
    const email = String(body.email || "")
        .trim()
        .toLowerCase(),
      name = String(body.fullName || "").trim(),
      role = String(body.role || ""),
      password = String(body.password || "");
    return {
      email,
      name,
      role,
      password,
      scope: String(body.scopeName || name),
      valid: !!(email && name && ROLES.has(role) && password.length >= 10),
    };
  },
  update: (body: any) => {
    const name = String(body.fullName || "").trim(),
      role = String(body.role || "");
    return {
      name,
      role,
      scope: String(body.scopeName || name).trim(),
      active: body.active ? 1 : 0,
      valid: !!(name && ROLES.has(role)),
    };
  },
};
