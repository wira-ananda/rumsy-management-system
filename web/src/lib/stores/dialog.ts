import { writable } from "svelte/store";
import type { Component } from "svelte";
export interface DialogState {
  title: string;
  component: Component<any>;
  props: Record<string, any>;
}
export const dialog = writable<DialogState | null>(null);
export function closeDialog() {
  dialog.set(null);
}
export function showDialog(
  title: string,
  component: Component<any>,
  props: Record<string, any> = {},
) {
  dialog.set({ title, component, props });
}
