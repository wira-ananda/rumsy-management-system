<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import ChatThread from "../shared/ChatThread.svelte";
  import StagePath from "./StagePath.svelte";
  import { runtime } from "../../stores/runtime.js";
  import {
    leadById,
    projectForLead,
    ensureProjectForLead,
  } from "../../domain/models.js";
  import { hotQualification, nextStageInfo } from "../../domain/pipeline.js";
  import { canEditLead, canDeleteLead } from "../../access/permissions.js";
  import {
    leadForm,
    deleteLead,
    milestoneForm,
    holdForm,
    resumeLead,
  } from "../../features/sales/actions";
  import { paymentForm } from "../../features/projects/payments";
  import { money, date, pct } from "../../utils/format.js";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let lead = $derived(leadById(route.id));
  let project = $derived(lead ? projectForLead(lead.id) : null);
  let next = $derived(lead ? nextStageInfo(lead) : null);
  let qualified = $derived(lead ? hotQualification(lead) : null);
  let canPay = $derived(
    [
      "MANAGER_SALES",
      "ADMIN_GENERAL",
      "SALES_EXECUTIVE",
      "ADMIN_CRM",
      "HOLDING_FINANCE",
      "SUPER_ADMIN",
      "HEAD_BU",
    ].includes(runtime.session!.role),
  );
  let canSide = $derived(
    ["HEAD_BU", "MANAGER_SALES", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
</script>

{#if lead && next && qualified}
  <PageHeader
    title={lead.client}
    description={`${lead.id} • ${lead.phone} • ${lead.location}`}
    >{#snippet actions()}<div class="action-row">
        {#if canEditLead(lead)}<button
            class="btn ghost"
            id="editLead"
            onclick={() => leadForm(lead)}>Edit Lead</button
          >{/if}{#if canDeleteLead(lead)}<button
            class="btn danger"
            id="deleteLead"
            onclick={() => deleteLead(lead)}>Hapus Lead</button
          >{/if}
      </div>{/snippet}</PageHeader
  >
  <StagePath stage={lead.stage} />
  <div class="notice info mt"><b>Next: {next.next}</b><br />{next.text}</div>
  <div class="grid2 mt">
    <Card title="Data Client"
      ><div class="grid2eq">
        <Info label="Tanggal Masuk" value={date(lead.dateIn)} /><Info
          label="Sumber"
          value={lead.source}
        /><Info label="Lokasi" value={lead.location} /><Info
          label="Kebutuhan"
          value={lead.need}
        /><Info label="Sales PIC" value={lead.sales} /><Info
          label="Current Stage"><Badge status={lead.stage} /></Info
        >
      </div></Card
    ><Card title="Commercial Estimation"
      ><div class="grid2eq">
        <Info label="% DP" value={pct(lead.dp)} /><Info
          label="% Margin"
          value={pct(lead.margin)}
        /><Info label="Est. Gambar" value={money(lead.estGambar)} /><Info
          label="Est. RAB"
          value={money(lead.estRab)}
        /><Info label="Est. ASST CR" value={money(lead.estAsstCr)} /><Info
          label="Next Follow-up"
          value={date(lead.nextFollowUp)}
        />
      </div></Card
    >
  </div>
  <div class="grid2 mt">
    <Card title="Milestone"
      ><div class="stack">
        {#each lead.milestones as milestone}<div class="check">
            <span class="checkmark">✓</span>{milestone}
          </div>{/each}<button
          class="btn ghost small"
          id="addMilestone"
          onclick={() => milestoneForm(lead)}>＋ Tambah Milestone</button
        >
      </div></Card
    >
    <Card title="Qualification & Pipeline Control"
      ><div class="notice info">{lead.notes || "-"}</div>
      <div class="mt">
        {#each [["Kebutuhan tersedia", qualified.need], ["Lokasi tersedia", qualified.location], ["Est. RAB tersedia", qualified.estRab], ["Sales PIC tersedia", qualified.sales], ["Next follow-up tersedia", qualified.nextAction], ["Milestone Survey / Proposal / Meeting", qualified.milestone]] as [label, ready]}<div
            class="check"
          >
            <span class="checkmark">{ready ? "✓" : "○"}</span>{label}
          </div>{/each}
      </div>
      {#if canPay && lead.stage === "HOT"}<div class="action-row mt">
          <button
            class="btn primary payFromLead"
            onclick={() =>
              paymentForm(ensureProjectForLead(lead), "DP_GAMBAR", lead.id)}
            >Upload DP Gambar</button
          ><button
            class="btn ghost payFromLead"
            onclick={() =>
              paymentForm(ensureProjectForLead(lead), "DP_PROYEK", lead.id)}
            >Upload DP Proyek (skip gambar)</button
          >
        </div>{:else if canPay && lead.stage === "DP_GAMBAR"}<button
          class="btn primary mt payFromLead"
          onclick={() =>
            paymentForm(ensureProjectForLead(lead), "DP_PROYEK", lead.id)}
          >Upload DP Proyek</button
        >{/if}
      {#if project}<div class="mt">
          <a class="btn ghost" href={`#/projects/${project.id}`}
            >Buka Project Dossier {project.id}</a
          >
        </div>{/if}{#if canSide}<div class="mt pipeline-side-actions">
          {#if lead.stage === "HOLD_BATAL"}<button
              class="btn primary"
              id="resumeLead"
              onclick={() => resumeLead(lead)}>Aktifkan Kembali</button
            >{:else}<button
              class="btn ghost"
              id="holdLead"
              onclick={() => holdForm(lead)}>Hold / Batal</button
            >{/if}
        </div>{/if}</Card
    >
  </div>
  <div class="mt"><ChatThread entity={lead} kind="LEAD" /></div>
{:else}<PageHeader title="Lead tidak ditemukan" />{/if}
