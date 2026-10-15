<script lang="ts">
  let { text = "Tidak ada data." }: { text?: string } = $props();
</script>

<div class="empty">{text}</div>
