<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Badge from "../shared/Badge.svelte";
  import {
    visibleLeads,
    canEditLead,
    canDeleteLead,
    normSales,
  } from "../../access/permissions.js";
  import { stageNames, TODAY } from "../../constants/catalog.js";
  import { leadForm, deleteLead } from "../../features/sales/actions";
  import { date, money, pct } from "../../utils/format.js";
  let search = $state(""),
    sales = $state(""),
    stage = $state(""),
    month = $state("");
  let leads = $derived(visibleLeads());
  let filtered = $derived(
    leads.filter(
      (lead: any) =>
        (lead.client + lead.phone + lead.location)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!sales || normSales(lead.sales) === normSales(sales)) &&
        (!stage || lead.stage === stage) &&
        (!month || String(lead.dateIn || "").startsWith(month)),
    ),
  );
</script>

<PageHeader
  title="CRM & Leads"
  description="Lead master dengan data komersial lengkap. Gunakan Edit untuk memperbarui data dan Hapus untuk lead yang belum menjadi project."
  >{#snippet actions()}<button
      class="btn primary"
      id="addLead"
      onclick={() => leadForm()}>＋ Lead Baru</button
    >{/snippet}</PageHeader
>
<div class="card">
  <div class="card-body">
    <div class="filterbar">
      <label class="field grow"
        ><span>CARI</span><input
          class="input"
          id="leadSearch"
          bind:value={search}
          placeholder="Nama client, WA, lokasi..."
        /></label
      >
      <label class="field"
        ><span>SALES</span><select
          class="input"
          id="leadSales"
          bind:value={sales}
          ><option value="">Semua</option
          >{#each [...new Set(leads.map((lead: any) => lead.sales))] as name}<option
              >{name}</option
            >{/each}</select
        ></label
      >
      <label class="field"
        ><span>STATUS</span><select
          class="input"
          id="leadStage"
          bind:value={stage}
          ><option value="">Semua</option
          >{#each Object.entries(stageNames) as [key, name]}<option value={key}
              >{name}</option
            >{/each}</select
        ></label
      >
      <label class="field"
        ><span>BULAN</span><input
          class="input"
          id="leadMonth"
          type="month"
          bind:value={month}
        /></label
      >
    </div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          >{#each ["Client", "Kebutuhan", "Sales", "DP", "Margin", "Est. Gambar", "Est. RAB", "Stage", "Follow-up", "Aksi"] as label}<th
              >{label}</th
            >{/each}</tr
        ></thead
      ><tbody id="leadRows">
        {#each filtered as lead}<tr
            ><td
              ><a class="link" href={`#/leads/${lead.id}`}>{lead.client}</a>
              <div class="tiny muted">{lead.phone} • {lead.location}</div></td
            ><td>{lead.need}</td><td>{lead.sales}</td><td>{pct(lead.dp)}</td><td
              >{pct(lead.margin)}</td
            ><td class="mono">{money(lead.estGambar)}</td><td class="mono"
              >{money(lead.estRab)}</td
            ><td><Badge status={lead.stage} /></td><td
              >{date(
                lead.nextFollowUp,
              )}{#if lead.nextFollowUp && lead.nextFollowUp <= TODAY}<div
                  class="tiny danger"
                >
                  <b>DUE/OVERDUE</b>
                </div>{/if}</td
            ><td
              ><div class="action-row">
                {#if canEditLead(lead)}<button
                    class="btn ghost small editLeadRow"
                    onclick={() => leadForm(lead)}>Edit</button
                  >{/if}{#if canDeleteLead(lead)}<button
                    class="btn danger small delLeadRow"
                    onclick={() => deleteLead(lead)}>Hapus</button
                  >{/if}
              </div></td
            ></tr
          >{:else}<tr><td colspan="10" class="empty">Tidak ada data.</td></tr
          >{/each}
      </tbody>
    </table>
  </div>
</div>
