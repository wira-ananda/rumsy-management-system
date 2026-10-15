import FormDialog from "../components/shared/FormDialog.svelte";
import { showDialog, closeDialog } from "../stores/dialog";
import { runtime } from "../stores/runtime.js";
import { roles } from "../constants/catalog.js";
import type {
  Choice,
  FormField,
  FormOptions,
  FormSubmit,
} from "../types/forms";
export { closeDialog };
export const options = (values: readonly (string | number)[]): Choice[] =>
  values.map((value) => ({ value, label: String(value) }));
export function userChoices(filterRoles?: string[]): Choice[] {
  return [
    { value: "", label: "- Pilih PIC -" },
    ...runtime.userDirectory
      .filter((user) => !filterRoles || filterRoles.includes(user.role || ""))
      .map((user) => ({
        value: String(user.id),
        label: `${user.name} • ${roles[user.role as keyof typeof roles] || user.role} • ${user.email}`,
      })),
  ];
}
export function projectChoices(): Choice[] {
  return [
    { value: "", label: "- Tidak terkait project -" },
    ...runtime.data!.projects.map((project: any) => ({
      value: project.id,
      label: `${project.id} • ${project.name}`,
    })),
  ];
}
export function openForm(
  title: string,
  fields: FormField[],
  submit: FormSubmit,
  settings: FormOptions = {},
) {
  showDialog(title, FormDialog, { fields, submit, settings });
}
