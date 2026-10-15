<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    title,
    description = "",
    actions,
  }: { title: string; description?: string; actions?: Snippet } = $props();
</script>

<div class="pagehead">
  <div>
    <div class="eyebrow">RUMSY INTERNAL • PRODUCTION</div>
    <h1>{title}</h1>
    {#if description}<p>{description}</p>{/if}
  </div>
  {#if actions}{@render actions()}{/if}
</div>
