<script lang="ts">
  import CalendarPicker from "./CalendarPicker.svelte";
  let {
    id,
    label = "Bulan",
    value = $bindable(""),
    compact = false,
    onchange,
  }: {
    id: string;
    label?: string;
    value?: string;
    compact?: boolean;
    onchange?: (value: string) => void;
  } = $props();
</script>

<CalendarPicker {id} {label} bind:value {compact} {onchange} />
