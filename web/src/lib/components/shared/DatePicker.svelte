<script lang="ts">
  import CalendarPicker from "./CalendarPicker.svelte";
  let {
    id,
    label = "Tanggal",
    value = $bindable(""),
    compact = false,
    contextMonth = "",
    onchange,
  }: {
    id: string;
    label?: string;
    value?: string;
    compact?: boolean;
    contextMonth?: string;
    onchange?: (value: string) => void;
  } = $props();
</script>

<CalendarPicker
  mode="date"
  {id}
  {label}
  bind:value
  {compact}
  {contextMonth}
  {onchange}
/>
