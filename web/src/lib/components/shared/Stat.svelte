<script lang="ts">
  let {
    label,
    value,
    tone = "",
    sub = "",
  }: {
    label: string;
    value: string | number;
    tone?: string;
    sub?: string;
  } = $props();
</script>

<div class="stat">
  <div class="stat-label">{label}</div>
  <div class={`stat-value ${tone}`}>{value}</div>
  {#if sub}<div class="stat-sub">{sub}</div>{/if}
</div>
