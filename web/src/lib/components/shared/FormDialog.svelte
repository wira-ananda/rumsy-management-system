<script lang="ts">
  import { untrack } from "svelte";
  import { closeDialog } from "../../stores/dialog";
  import type {
    FormField,
    FormOptions,
    FormSubmit,
    FormValues,
  } from "../../types/forms";
  let {
    fields,
    submit,
    settings = {},
  }: {
    fields: FormField[];
    submit: FormSubmit;
    settings?: FormOptions;
  } = $props();
  let values = $state<FormValues>(
    untrack(() =>
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          field.value ??
            (field.type === "multiselect"
              ? []
              : field.type === "select"
                ? String(field.options?.[0]?.value ?? "")
                : ""),
        ]),
      ),
    ),
  );
  let error = $state("");
  let busy = $state(false);
  // Each dialog is mounted with a fresh, isolated copy of its form values.
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const element = event.currentTarget as HTMLFormElement;
    busy = true;
    error = "";
    try {
      const result = await submit(new FormData(element), values);
      if (result !== false) closeDialog();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<form id={settings.id} onsubmit={handleSubmit}>
  {#if settings.notice}<div class="notice info" style="margin-bottom:12px">
      {settings.notice}
    </div>{/if}
  {#if error}<div class="notice danger" role="alert" style="margin-bottom:12px">
      {error}
    </div>{/if}
  <div class="form-grid">
    {#each fields as field}
      <label class="field" style:grid-column={field.wide ? "1/-1" : undefined}>
        <span>{field.label}</span>
        {#if field.type === "textarea"}<textarea
            class="input"
            id={field.id}
            name={field.name}
            bind:value={values[field.name]}
            rows={field.rows || 3}
            required={field.required}
            placeholder={field.placeholder}
            oninput={() => settings.onChange?.(field.name, values)}></textarea>
        {:else if field.type === "select"}<select
            class="input"
            id={field.id}
            name={field.name}
            bind:value={values[field.name]}
            required={field.required}
            onchange={() => settings.onChange?.(field.name, values)}
            >{#each field.options || [] as option}<option
                value={String(option.value)}>{option.label}</option
              >{/each}</select
          >
        {:else if field.type === "multiselect"}<select
            class="input"
            id={field.id}
            name={field.name}
            multiple
            size="5"
            bind:value={values[field.name]}
            required={field.required}
            onchange={() => settings.onChange?.(field.name, values)}
            >{#each field.options || [] as option}<option
                value={String(option.value)}>{option.label}</option
              >{/each}</select
          >
        {:else if field.type === "file"}<input
            class="input"
            id={field.id}
            name={field.name}
            type="file"
            accept={field.accept}
            multiple={field.multiple}
            required={field.required}
          />
        {:else}<input
            class="input"
            id={field.id}
            name={field.name}
            type={field.type || "text"}
            bind:value={values[field.name]}
            required={field.required}
            readonly={field.readonly}
            min={field.min}
            max={field.max}
            minlength={field.minlength}
            placeholder={field.placeholder}
            oninput={() => settings.onChange?.(field.name, values)}
          />{/if}
        {#if field.hint}<small class="tiny muted">{field.hint}</small>{/if}
      </label>
    {/each}
  </div>
  {#if settings.summary}<div class="notice info" style="margin:12px 0">
      {settings.summary(values)}
    </div>{/if}
  <button class="btn primary" style="width:100%" disabled={busy}
    >{busy ? "Memproses..." : settings.submitLabel || "Simpan"}</button
  >
</form>
