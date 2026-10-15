<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    label,
    value,
    children,
  }: { label: string; value?: unknown; children?: Snippet } = $props();
</script>

<div class="info">
  <span
    style="font-size:10px;text-transform:uppercase;font-weight:800;color:var(--slate)"
    >{label}</span
  >
  <div>
    {#if children}{@render children()}{:else}{String(value ?? "-")}{/if}
  </div>
</div>
