<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    title,
    children,
    actions,
  }: { title: string; children?: Snippet; actions?: Snippet } = $props();
</script>

<section class="card">
  <div class="card-head">
    <h3>{title}</h3>
    {#if actions}{@render actions()}{/if}
  </div>
  <div class="card-body">
    {#if children}{@render children()}{/if}
  </div>
</section>
