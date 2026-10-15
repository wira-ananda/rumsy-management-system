import { apiCall } from "../../services/api.js";
import { runtime } from "../../stores/runtime.js";
import { roles } from "../../constants/catalog.js";
import { openForm, options } from "../../services/forms";
import type { FormField } from "../../types/forms";
export function openPasswordModal(required = false) {
  openForm(
    required ? "Ganti Password Awal" : "Ganti Password",
    [
      {
        name: "oldPassword",
        label: "PASSWORD LAMA",
        type: "password",
        required: true,
      },
      {
        name: "newPassword",
        label: "PASSWORD BARU",
        type: "password",
        minlength: 10,
        required: true,
      },
      {
        name: "confirm",
        label: "ULANGI PASSWORD BARU",
        type: "password",
        minlength: 10,
        required: true,
      },
    ],
    async (fd) => {
      if (fd.get("newPassword") !== fd.get("confirm"))
        throw new Error("Konfirmasi password tidak sama.");
      await apiCall("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          oldPassword: fd.get("oldPassword"),
          newPassword: fd.get("newPassword"),
        }),
      });
      runtime.session!.mustChangePassword = false;
      alert("Password berhasil diubah.");
    },
    {
      id: "passwordForm",
      notice: "Minimal 10 karakter.",
      submitLabel: "Simpan Password",
    },
  );
}
export function userForm(edit: any = null, reload: () => Promise<void>) {
  let fields: FormField[] = [
    {
      name: "fullName",
      label: "NAMA",
      value: edit?.full_name || "",
      required: true,
    },
  ];
  if (!edit)
    fields.push({
      name: "email",
      label: "EMAIL",
      type: "email",
      required: true,
    });
  fields.push(
    {
      name: "role",
      label: "ROLE",
      type: "select",
      value: edit?.role || Object.keys(roles)[0],
      options: Object.entries(roles).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      name: "scopeName",
      label: "SCOPE / NAMA SALES",
      value: edit?.scope_name || edit?.full_name || "",
      hint: "Untuk Sales Executive isi nama yang dipakai pada kolom Sales PIC. Jika kosong, otomatis memakai Nama.",
    },
  );
  if (edit)
    fields.push({
      name: "active",
      label: "STATUS",
      type: "select",
      value: edit.active ? "1" : "0",
      options: [
        { value: "1", label: "Aktif" },
        { value: "0", label: "Nonaktif" },
      ],
    });
  else
    fields.push({
      name: "password",
      label: "PASSWORD AWAL",
      type: "password",
      minlength: 10,
      required: true,
      wide: true,
    });
  openForm(
    edit ? "Edit User RMS" : "Buat User RMS",
    fields,
    async (fd) => {
      let body: any = Object.fromEntries(fd);
      if (edit) body.active = body.active === "1";
      await apiCall(
        "/api/admin/users" + (edit ? "/" + encodeURIComponent(edit.id) : ""),
        { method: edit ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      try {
        let r = await apiCall("/api/directory/sales");
        runtime.salesDirectory = r.sales || [];
      } catch {}
      await reload();
      if (!edit)
        alert(
          "User berhasil dibuat. Untuk Sales Executive, assignment Lead mengikuti Scope / Nama Sales.",
        );
    },
    {
      id: edit ? "editUserForm" : "userForm",
      submitLabel: edit ? "Simpan Perubahan" : "Buat User",
    },
  );
}
