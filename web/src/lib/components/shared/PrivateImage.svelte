<script lang="ts">
  import { loadPrivateFile } from "../../services/private-file.js";
  let {
    fileId,
    alt = "",
    class: className = "",
  }: { fileId: string; alt?: string; class?: string } = $props();
  let src = $state("");
  let error = $state("");
  $effect(() => {
    const id = fileId;
    const controller = new AbortController();
    let url = "";
    src = "";
    error = "";
    void loadPrivateFile(id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        src = url;
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          error = reason instanceof Error ? reason.message : String(reason);
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  });
</script>

{#if src}<img class={className} {src} {alt} loading="lazy" />
{:else}<span
    class={className}
    role="img"
    aria-label={error || `Memuat ${alt}`}
    title={error}>{error ? "Foto tidak dapat dimuat" : "Memuat foto…"}</span
  >{/if}
