<script lang="ts">
  import MonthPicker from "./MonthPicker.svelte";
  import DatePicker from "./DatePicker.svelte";
  let {
    id,
    month = $bindable(""),
    day = $bindable(""),
    compact = false,
  }: {
    id: string;
    month?: string;
    day?: string;
    compact?: boolean;
  } = $props();
</script>

<div class="period-filter" class:compact>
  <div class="period-field">
    <label for={`${id}Month`}>Bulan masuk</label>
    <MonthPicker
      id={`${id}Month`}
      label="Bulan masuk"
      bind:value={month}
      {compact}
      onchange={(next) => {
        if (day && (!next || !day.startsWith(next + "-"))) day = "";
      }}
    />
  </div>
  <div class="period-field">
    <label for={`${id}Date`}>Tanggal masuk</label>
    <DatePicker
      id={`${id}Date`}
      label="Tanggal masuk"
      bind:value={day}
      {compact}
      contextMonth={month}
      onchange={(next) => {
        if (next) month = next.slice(0, 7);
      }}
    />
  </div>
  <button
    class="period-reset"
    type="button"
    aria-label="Reset filter"
    title="Reset bulan dan tanggal"
    disabled={!month && !day}
    onclick={() => {
      month = "";
      day = "";
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.4 8M3 4v6h6" /></svg
    >
    Reset
  </button>
</div>

<style>
  .period-reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 36px;
    margin-bottom: 4px;
    padding: 7px 9px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--slate);
    font: inherit;
    font-size: 11px;
    font-weight: 650;
    white-space: nowrap;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }
  .period-reset:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .period-reset:not(:disabled):hover {
    color: var(--accent);
    border-color: #b5cce7;
    background: #f4f8fd;
  }
  .period-reset:focus-visible {
    outline: 3px solid #2b6cb52b;
    outline-offset: 2px;
  }
  .compact .period-reset {
    min-height: 34px;
    margin-bottom: 2px;
  }
  .period-filter {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }
  .period-field {
    min-width: 0;
  }
  label {
    display: block;
    margin-bottom: 7px;
    color: var(--slate);
    font-size: 10.5px;
    font-weight: 800;
  }
  .period-field :global(.month-picker) {
    width: 176px;
  }
  .compact .period-field {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .compact label {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .compact .period-field :global(.month-picker) {
    width: 158px;
  }
  @media (max-width: 600px) {
    .period-filter {
      width: 100%;
      flex: 1;
      gap: 8px;
    }
    .period-field {
      flex: 1;
      min-width: 130px;
    }
    .compact .period-field {
      display: block;
    }
    .compact label {
      margin-bottom: 5px;
      font-size: 10px;
    }
    .period-field :global(.month-picker),
    .compact .period-field :global(.month-picker) {
      width: 100%;
    }
  }
</style>
