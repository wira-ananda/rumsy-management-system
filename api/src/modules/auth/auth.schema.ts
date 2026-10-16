// Normalization intentionally matches the existing API and its localized errors.
export interface LoginInput {
  email: string;
  password: string;
}
export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
export const parseLoginInput = (body: any): LoginInput => ({
  email: String(body.email || "")
    .trim()
    .toLowerCase(),
  password: String(body.password || ""),
});
export const parseChangePasswordInput = (body: any): ChangePasswordInput => ({
  oldPassword: String(body.oldPassword || ""),
  newPassword: String(body.newPassword || ""),
});
