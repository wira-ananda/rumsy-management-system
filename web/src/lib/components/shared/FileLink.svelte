<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    privateFileUrl,
    openPrivateFile,
  } from "../../services/private-file.js";
  let {
    fileId,
    download = false,
    filename = "",
    class: className = "link",
    children,
  }: {
    fileId: string;
    download?: boolean;
    filename?: string;
    class?: string;
    children: Snippet;
  } = $props();
  let busy = $state(false);
  let error = $state("");
  async function open(event: MouseEvent) {
    if (event.button > 1) return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    error = "";
    try {
      await openPrivateFile(fileId, download, filename);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<a
  class={className}
  href={privateFileUrl(fileId, download)}
  aria-busy={busy}
  onclick={open}
  onauxclick={open}
>
  {@render children()}
</a>
{#if error}<span class="small danger" role="alert">{error}</span>{/if}
