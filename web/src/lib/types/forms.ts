export type FormValues = Record<string, any>;
export interface Choice {
  value: string | number;
  label: string;
}
export interface FormField {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "month"
    | "textarea"
    | "select"
    | "file"
    | "multiselect";
  value?: any;
  options?: Choice[];
  required?: boolean;
  readonly?: boolean;
  min?: number;
  max?: number;
  minlength?: number;
  rows?: number;
  accept?: string;
  multiple?: boolean;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  id?: string;
}
export interface FormOptions {
  id?: string;
  submitLabel?: string;
  notice?: string;
  onChange?: (name: string, values: FormValues) => void;
  summary?: (values: FormValues) => string;
}
export type FormSubmit = (
  form: FormData,
  values: FormValues,
) => Promise<void | boolean> | void | boolean;
