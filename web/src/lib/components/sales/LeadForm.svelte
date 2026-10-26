<script lang="ts">
  import { tick, untrack } from "svelte";
  import { TODAY } from "../../constants/catalog.js";
  import { closeDialog } from "../../stores/dialog";
  import { money } from "../../utils/format.js";
  import {
    LEAD_NEEDS,
    COLLATERALS,
    LEAD_MARGIN,
    DEFAULT_TENOR_YEARS,
    dpRupiah,
    dpPercent,
    leadTermsError,
    leadNeedCategory,
    leadNeedDetail,
  } from "../../domain/lead-terms";
  let {
    lead = {},
    sales,
    sources,
    submit,
    editing = false,
  }: {
    lead?: any;
    sales: string[];
    sources: string[];
    submit: (value: any) => Promise<void>;
    editing?: boolean;
  } = $props();
  let form = $state(
    untrack(() => ({
      dateIn: lead.dateIn || TODAY,
      client: lead.client || "",
      phone: lead.phone || "",
      source: lead.source || sources[0],
      location: lead.location || "",
      need: leadNeedCategory(lead),
      needDetail: leadNeedDetail(lead),
      estRab: Number(lead.estRab) || 0,
      margin: LEAD_MARGIN,
      dp: Math.max(20, Number(lead.dp ?? 20)),
      dpAmount: dpRupiah(
        Number(lead.estRab) || 0,
        Math.max(20, Number(lead.dp ?? 20)),
      ),
      tenorYears: lead.tenorYears ?? DEFAULT_TENOR_YEARS,
      collateral: lead.collateral || "",
      estAsstCr: Number(lead.estAsstCr) || 0,
      sales: lead.sales || sales[0],
      nextFollowUp: lead.nextFollowUp || "",
      notes: lead.notes || "",
    })),
  );
  let error = $state("");
  let busy = $state(false);
  const format = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString("id-ID") : "";
  function syncPercent() {
    form.dpAmount = dpRupiah(form.estRab, form.dp);
  }
  async function currency(
    event: Event,
    key: "estRab" | "dpAmount" | "estAsstCr",
  ) {
    const input = event.currentTarget as HTMLInputElement;
    input.setCustomValidity(
      input.value.includes("-") ? "Nominal rupiah tidak boleh negatif." : "",
    );
    if (input.value.includes("-")) return;
    const position = input.selectionStart ?? input.value.length;
    const digitsBefore = input.value
      .slice(0, position)
      .replace(/\D/g, "").length;
    const digitsOnly = input.value.replace(/\D/g, "");
    form[key] = Number(digitsOnly) || 0;
    if (key === "estRab") syncPercent();
    if (key === "dpAmount") form.dp = dpPercent(form.estRab, form.dpAmount);
    await tick();
    // Keep the caret by digit position when Indonesian grouping is inserted.
    input.value = digitsOnly ? format(form[key]) : "";
    let cursor = 0,
      digits = 0;
    while (cursor < input.value.length && digits < digitsBefore) {
      if (/\d/.test(input.value[cursor])) digits++;
      cursor++;
    }
    input.setSelectionRange(cursor, cursor);
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    error = "";
    const value = {
      ...form,
      margin: LEAD_MARGIN,
      needDetail:
        form.need === "Other" ? form.needDetail.trim() : form.needDetail,
    };
    const invalid = leadTermsError(value, lead);
    if (invalid) {
      error = invalid;
      return;
    }
    if (
      !value.client.trim() ||
      !value.phone.trim() ||
      !value.location.trim() ||
      !value.sales
    ) {
      error = "Lengkapi nama client, nomor WA, lokasi, dan Sales PIC.";
      return;
    }
    busy = true;
    try {
      await submit(value);
      closeDialog();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<form id="leadForm" onsubmit={save}>
  {#if error}<div class="notice danger form-error" role="alert">
      {error}
    </div>{/if}
  <div class="form-grid">
    <label class="field"
      ><span>TGL MASUK</span><input
        class="input"
        name="dateIn"
        type="date"
        bind:value={form.dateIn}
        required
      /></label
    >
    <label class="field"
      ><span>NAMA CLIENT</span><input
        class="input"
        name="client"
        bind:value={form.client}
        required
      /></label
    >
    <label class="field"
      ><span>NO WA</span><input
        class="input"
        name="phone"
        type="tel"
        bind:value={form.phone}
        required
      /></label
    >
    <label class="field"
      ><span>SUMBER</span><select
        class="input"
        name="source"
        bind:value={form.source}
        >{#each sources as source}<option>{source}</option>{/each}</select
      ></label
    >
    <label class="field"
      ><span>LOKASI</span><input
        class="input"
        name="location"
        bind:value={form.location}
        required
      /></label
    >
    <label class="field"
      ><span>KEBUTUHAN</span><select
        class="input"
        name="need"
        bind:value={form.need}
        required
      >
        {#each LEAD_NEEDS as need}<option>{need}</option>{/each}
      </select></label
    >
    {#if form.need === "Other"}<label class="field wide"
        ><span>KETERANGAN KEBUTUHAN (OPSIONAL)</span><input
          class="input"
          name="needDetail"
          bind:value={form.needDetail}
          placeholder="Contoh: ruko 2 lantai atau renovasi klinik"
        /><small class="tiny muted"
          >Boleh tetap Other atau tambahkan kebutuhan yang lebih spesifik.</small
        ></label
      >{/if}
    <label class="field"
      ><span>EST. RAB</span>
      <div class="currency">
        <span aria-hidden="true">Rp</span><input
          class="input"
          name="estRab"
          inputmode="numeric"
          value={format(form.estRab)}
          oninput={(event) => currency(event, "estRab")}
          required
        />
      </div></label
    >
    <label class="field"
      ><span>MARGIN (%)</span>
      <div class="fixed-rate">
        <input
          class="input"
          name="margin"
          type="number"
          value={LEAD_MARGIN}
          readonly
        /><span aria-hidden="true">%</span>
      </div>
      <small class="tiny muted">Margin tetap 8%.</small></label
    >
    <label class="field"
      ><span>DP (%)</span><input
        class="input"
        name="dp"
        type="number"
        min="20"
        max="100"
        step="any"
        bind:value={form.dp}
        oninput={syncPercent}
        required
      /><small class="tiny muted">Minimal 20% dari Est. RAB.</small></label
    >
    <label class="field"
      ><span>DP (Rp)</span>
      <div class="currency">
        <span aria-hidden="true">Rp</span><input
          class="input"
          name="dpAmount"
          inputmode="numeric"
          value={format(form.dpAmount)}
          oninput={(event) => currency(event, "dpAmount")}
          disabled={form.estRab <= 0}
          required
        />
      </div>
      <small class="tiny muted"
        >{form.estRab > 0
          ? "Ubah nominal untuk menyesuaikan persentase DP."
          : "Isi Est. RAB terlebih dahulu."}</small
      ></label
    >
    <fieldset class="tenor-field wide">
      <div class="tenor-heading">
        <label for="leadTenor">TENOR</label><label class="year-number"
          ><input
            class="input"
            id="leadTenor"
            name="tenorYears"
            aria-label="Tenor dalam tahun"
            type="number"
            min="1"
            max="15"
            step="1"
            bind:value={form.tenorYears}
            required
          /> tahun</label
        >
      </div>
      <input
        class="tenor-slider"
        aria-label="Geser tenor dalam tahun"
        aria-valuetext={`${form.tenorYears || 0} tahun`}
        type="range"
        min="1"
        max="15"
        step="1"
        bind:value={form.tenorYears}
      />
      <div class="tenor-scale">
        <span>1 tahun</span><span
          >Setara {Number(form.tenorYears || 0) * 12} bulan</span
        ><span>15 tahun</span>
      </div>
    </fieldset>
    <fieldset class="collateral-field">
      <legend>JAMINAN</legend>
      <div class="collateral-options">
        {#each COLLATERALS as collateral}<label
            class:selected={form.collateral === collateral}
            ><input
              type="radio"
              name="collateral"
              value={collateral}
              bind:group={form.collateral}
              required
            />{collateral}</label
          >{/each}
      </div>
    </fieldset>
    <label class="field"
      ><span>EST. ASST CR</span>
      <div class="currency">
        <span aria-hidden="true">Rp</span><input
          class="input"
          name="estAsstCr"
          inputmode="numeric"
          value={format(form.estAsstCr)}
          oninput={(event) => currency(event, "estAsstCr")}
        />
      </div></label
    >
    <label class="field"
      ><span>SALES PIC</span><select
        class="input"
        name="sales"
        bind:value={form.sales}
        required
        >{#each sales as name}<option>{name}</option>{/each}</select
      ><small class="tiny muted"
        >Mengikuti akun Sales aktif di User Management.</small
      ></label
    >
    <label class="field"
      ><span>NEXT FOLLOW UP</span><input
        class="input"
        name="nextFollowUp"
        type="date"
        bind:value={form.nextFollowUp}
      /></label
    >
    <label class="field wide"
      ><span>CATATAN</span><textarea
        class="input"
        name="notes"
        rows="3"
        bind:value={form.notes}></textarea></label
    >
  </div>
  <div class="notice info summary" aria-live="polite">
    DP {Number(form.dp || 0).toLocaleString("id-ID", {
      maximumFractionDigits: 4,
    })}% dari {money(form.estRab)} = <b>{money(form.dpAmount)}</b>
  </div>
  <button class="btn primary submit" disabled={busy}
    >{busy
      ? "Memproses..."
      : editing
        ? "Simpan Perubahan"
        : "Buat Lead"}</button
  >
</form>

<style>
  .wide {
    grid-column: 1 / -1;
  }
  .form-error {
    margin-bottom: 16px;
  }
  .currency,
  .fixed-rate {
    position: relative;
  }
  .currency > span {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--slate);
    font-size: 14px;
  }
  .currency .input {
    padding-left: 43px;
  }
  .fixed-rate .input {
    background: var(--bg, #f4f7fb);
  }
  .fixed-rate > span {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .tenor-field {
    background: #f5f8fc;
    border: 1px solid #dce5f1;
    border-radius: 12px;
    padding: 16px;
  }
  .tenor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .tenor-heading > label:first-child,
  legend {
    font-size: 11px;
    font-weight: 800;
    color: var(--slate);
  }
  .year-number {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .year-number input {
    width: 75px;
    text-align: center;
    min-height: 40px;
  }
  .tenor-slider {
    width: 100%;
    min-height: 40px;
    accent-color: #2d6db5;
    cursor: pointer;
  }
  .tenor-scale {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    color: var(--slate);
  }
  legend {
    margin-bottom: 8px;
  }
  .collateral-options {
    display: flex;
    gap: 8px;
  }
  .collateral-options label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 12px;
    border: 1px solid #dce5f1;
    border-radius: 10px;
    flex: 1;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .collateral-options label.selected {
    border-color: #2d6db5;
    background: #eef5ff;
  }
  .collateral-options input {
    accent-color: #2d6db5;
  }
  .summary {
    margin: 16px 0;
    font-size: 13px;
  }
  .submit {
    width: 100%;
  }
</style>
