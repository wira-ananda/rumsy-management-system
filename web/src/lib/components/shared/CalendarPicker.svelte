<script lang="ts">
  import { tick } from "svelte";
  import {
    calendarDays,
    calendarDate,
    isoDay,
    dayLabel,
  } from "../../utils/calendar";

  let {
    id,
    label = "Bulan",
    value = $bindable(""),
    compact = false,
    mode = "month",
    contextMonth = "",
    onchange = () => {},
  }: {
    id: string;
    label?: string;
    value?: string;
    compact?: boolean;
    mode?: "month" | "date";
    contextMonth?: string;
    onchange?: (value: string) => void;
  } = $props();
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let popup = $state<HTMLDivElement>();
  let open = $state(false);
  let year = $state(new Date().getFullYear());
  let focusedMonth = $state(new Date().getMonth());
  let displayedMonth = $state(new Date().getMonth());
  let focusedDay = $state(isoDay(new Date()));
  let choosingMonth = $state(true);
  const grid = $derived(calendarDays(year, displayedMonth));
  let left = $state(0),
    top = $state(0);
  const selectedLabel = $derived(
    mode === "date"
      ? value
        ? dayLabel(value, true)
        : "Semua tanggal"
      : value
        ? `${months[Number(value.slice(5)) - 1]} ${value.slice(0, 4)}`
        : "Semua bulan",
  );
  const monthValue = (index: number) =>
    `${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;

  async function positionPanel() {
    await tick();
    if (!popup) return;
    const rect = trigger.getBoundingClientRect();
    const height = popup.getBoundingClientRect().height;
    left = Math.max(12, Math.min(rect.right - 280, window.innerWidth - 292));
    top =
      rect.bottom + 8 + height <= window.innerHeight - 12
        ? rect.bottom + 8
        : Math.max(12, rect.top - height - 8);
  }
  async function focusDay() {
    await positionPanel();
    popup
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusedDay}"]`)
      ?.focus();
  }
  async function movePeriod(direction: number) {
    if (choosingMonth) year += direction;
    else {
      const date = calendarDate(year, displayedMonth + direction, 1);
      year = date.getFullYear();
      displayedMonth = date.getMonth();
      focusedDay = isoDay(date);
    }
    await positionPanel();
  }
  async function chooseMonth(index: number) {
    if (mode === "month") select(monthValue(index));
    else {
      displayedMonth = index;
      focusedDay = isoDay(calendarDate(year, index, 1));
      choosingMonth = false;
      await focusDay();
    }
  }
  async function dateKey(event: KeyboardEvent, day: string) {
    const offset =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown"
            ? 7
            : event.key === "ArrowUp"
              ? -7
              : null;
    const date = calendarDate(
      Number(day.slice(0, 4)),
      Number(day.slice(5, 7)) - 1,
      Number(day.slice(8)),
    );
    if (offset === null && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (offset !== null) date.setDate(date.getDate() + offset);
    else
      date.setDate(
        event.key === "Home"
          ? 1
          : calendarDate(year, displayedMonth + 1, 0).getDate(),
      );
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    year = date.getFullYear();
    displayedMonth = date.getMonth();
    focusedDay = isoDay(date);
    await focusDay();
  }

  function close(restoreFocus = false) {
    open = false;
    if (restoreFocus) trigger?.focus();
  }
  async function show() {
    const initial = value || (mode === "date" ? contextMonth : "");
    year = initial ? Number(initial.slice(0, 4)) : new Date().getFullYear();
    focusedMonth = initial
      ? Number(initial.slice(5, 7)) - 1
      : new Date().getMonth();
    displayedMonth = focusedMonth;
    focusedDay =
      value && mode === "date"
        ? value
        : isoDay(calendarDate(year, displayedMonth, 1));
    choosingMonth = mode === "month";
    const rect = trigger.getBoundingClientRect();
    left = Math.max(12, Math.min(rect.right - 280, window.innerWidth - 292));
    open = true;
    await positionPanel();
    if (!choosingMonth) {
      await focusDay();
      return;
    }
    await tick();
    const panel = popup;
    if (!panel) return;
    const height = panel.getBoundingClientRect().height;
    top =
      rect.bottom + 8 + height <= window.innerHeight - 12
        ? rect.bottom + 8
        : Math.max(12, rect.top - height - 8);
    panel
      .querySelector<HTMLButtonElement>(`[data-month="${focusedMonth}"]`)
      ?.focus();
  }
  function select(next: string) {
    value = next;
    onchange(next);
    close(true);
  }
  async function monthKey(event: KeyboardEvent, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 12
        : event.key === "ArrowLeft"
          ? (index + 11) % 12
          : event.key === "ArrowDown"
            ? (index + 3) % 12
            : event.key === "ArrowUp"
              ? (index + 9) % 12
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 11
                  : null;
    if (next === null) return;
    event.preventDefault();
    focusedMonth = next;
    await tick();
    popup?.querySelector<HTMLButtonElement>(`[data-month="${next}"]`)?.focus();
  }
  function outside(event: PointerEvent) {
    if (open && event.target instanceof Node && !root.contains(event.target))
      close();
  }
</script>

<svelte:window
  onpointerdown={outside}
  onkeydown={(event) => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  }}
  onresize={() => close()}
  onscroll={() => close()}
/>

<div
  class="month-picker"
  class:compact
  bind:this={root}
  onfocusout={(event) => {
    if (
      open &&
      event.relatedTarget instanceof Node &&
      !root.contains(event.relatedTarget)
    )
      close();
  }}
>
  <button
    {id}
    bind:this={trigger}
    type="button"
    class="month-trigger"
    class:selected={!!value}
    aria-label={`${label}: ${selectedLabel}`}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls={open ? `${id}-popup` : undefined}
    onclick={() => (open ? close() : show())}
    onkeydown={(event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        show();
      }
    }}
  >
    <span class="selection">{selectedLabel}</span>
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" /><path
        d="M16 3v4M8 3v4M3 11h18"
      />
    </svg>
  </button>
  {#if open}
    <div
      id={`${id}-popup`}
      bind:this={popup}
      class="month-popup"
      role="dialog"
      aria-modal="false"
      aria-label={mode === "month" ? "Pilih bulan" : "Pilih tanggal"}
      style:left={`${left}px`}
      style:top={`${top}px`}
    >
      <div class="year-navigation">
        <button
          type="button"
          class="year-arrow"
          aria-label={choosingMonth ? "Tahun sebelumnya" : "Bulan sebelumnya"}
          disabled={year <= 1 && (choosingMonth || displayedMonth === 0)}
          onclick={() => movePeriod(-1)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg
          >
        </button>
        {#if choosingMonth}<b aria-live="polite">{year}</b>{:else}
          <button
            type="button"
            class="calendar-heading"
            aria-label="Pilih bulan dan tahun"
            onclick={async () => {
              choosingMonth = true;
              focusedMonth = displayedMonth;
              await positionPanel();
              popup
                ?.querySelector<HTMLButtonElement>(
                  `[data-month="${focusedMonth}"]`,
                )
                ?.focus();
            }}>{months[displayedMonth]} {year}</button
          >
        {/if}
        <button
          type="button"
          class="year-arrow"
          aria-label={choosingMonth ? "Tahun berikutnya" : "Bulan berikutnya"}
          disabled={year >= 9999 && (choosingMonth || displayedMonth === 11)}
          onclick={() => movePeriod(1)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg
          >
        </button>
      </div>
      {#if choosingMonth}<div
          class="month-grid"
          role="group"
          aria-label={`Bulan tahun ${year}`}
        >
          {#each months as month, index}
            <button
              type="button"
              class="month-option"
              class:active={value === monthValue(index)}
              data-month={index}
              tabindex={focusedMonth === index ? 0 : -1}
              aria-label={`${month} ${year}`}
              aria-pressed={value === monthValue(index)}
              onclick={() => chooseMonth(index)}
              onkeydown={(event) => monthKey(event, index)}
            >
              {shortMonths[index]}
            </button>
          {/each}
        </div>{:else}
        <div
          class="day-grid"
          role="group"
          aria-label={`${months[displayedMonth]} ${year}`}
        >
          {#each ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as name}<small
              aria-hidden="true">{name}</small
            >{/each}
          {#each grid as day}
            <button
              type="button"
              class="day-option"
              class:outside={day.month !== displayedMonth}
              class:active={value === day.value}
              data-date={day.value}
              tabindex={focusedDay === day.value ? 0 : -1}
              aria-label={dayLabel(day.value)}
              aria-pressed={value === day.value}
              disabled={day.year < 1 || day.year > 9999}
              onclick={() => select(day.value)}
              onkeydown={(event) => dateKey(event, day.value)}>{day.day}</button
            >
          {/each}
        </div>
      {/if}
      <div class="picker-actions">
        <button type="button" onclick={() => select("")}
          >{mode === "month" ? "Semua bulan" : "Semua tanggal"}</button
        >
        <button
          type="button"
          onclick={() => {
            const now = new Date();
            select(
              mode === "date"
                ? isoDay(now)
                : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
            );
          }}>{mode === "month" ? "Bulan ini" : "Hari ini"}</button
        >
      </div>
    </div>
  {/if}
</div>

<style>
  .month-picker {
    width: 180px;
    max-width: 100%;
    min-width: 0;
  }
  button {
    font: inherit;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }
  .month-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--line, #dce4ef);
    border-radius: 10px;
    background: #fff;
    color: var(--ink, #0b1f3a);
    font-size: 13px;
    text-align: left;
  }
  .month-trigger .selection {
    display: block;
    margin: 0;
    color: inherit;
    font-size: inherit;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
  }
  .month-trigger svg {
    color: var(--slate, #64748b);
    flex-shrink: 0;
  }
  .month-trigger.selected {
    border-color: #b5cce7;
  }
  .month-trigger:hover {
    border-color: #99b6d7;
  }
  button:focus-visible {
    outline: 3px solid #2b6cb52b;
    outline-offset: 2px;
  }
  .compact {
    width: 160px;
  }
  .compact .month-trigger {
    min-height: 38px;
    padding: 8px 10px;
    font-size: 12px;
  }
  .month-popup {
    position: fixed;
    z-index: 100;
    width: 280px;
    max-width: calc(100vw - 24px);
    max-height: calc(100svh - 24px);
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--line, #dce4ef);
    border-radius: 14px;
    background: #fff;
    color: var(--ink, #0b1f3a);
    box-shadow: 0 12px 36px #0b1f3a24;
    font-family: inherit;
  }
  .year-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .year-navigation b {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .year-arrow {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--line, #dce4ef);
    border-radius: 8px;
    background: #fff;
    color: inherit;
  }
  .year-arrow:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .year-arrow:not(:disabled):hover {
    background: #f1f5fa;
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .month-option {
    min-height: 38px;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: #f4f7fb;
    color: inherit;
    font-size: 12px;
    font-weight: 600;
  }
  .month-option:hover {
    background: #e7effa;
  }
  .month-option.active {
    background: var(--accent, #2b6cb5);
    color: #fff;
  }
  .calendar-heading {
    padding: 5px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-size: 13px;
    font-weight: 700;
  }
  .calendar-heading:hover {
    background: #edf3fa;
  }
  .day-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 3px;
  }
  .day-grid small {
    padding: 5px 0 8px;
    text-align: center;
    color: var(--slate, #64748b);
    font-size: 10px;
    font-weight: 600;
  }
  .day-option {
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: #f4f7fb;
    color: var(--ink, #0b1f3a);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .day-option:hover {
    background: #e7effa;
  }
  .day-option.outside {
    background: #fff;
    color: #95a3b5;
  }
  .day-option.active {
    background: var(--accent, #2b6cb5);
    color: #fff;
    font-weight: 700;
  }
  .picker-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line, #dce4ef);
  }
  .picker-actions button {
    min-height: 30px;
    padding: 4px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--accent, #2b6cb5);
    font-size: 11px;
    font-weight: 650;
  }
</style>
