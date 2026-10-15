<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { money } from "../../utils/format.js";
  import { allTransactions } from "../../domain/models.js";
  import { closeDialog } from "../../stores/dialog";
  let { query }: { query: string } = $props();
  let q = $derived(query.toLowerCase());
  let leads = $derived(
    runtime.data!.leads.filter((x: any) =>
      (x.client + x.phone + x.location).toLowerCase().includes(q),
    ),
  );
  let projects = $derived(
    runtime.data!.projects.filter((x: any) =>
      (x.id + x.name + x.client).toLowerCase().includes(q),
    ),
  );
  let transactions = $derived(
    allTransactions().filter((x: any) =>
      (x.id + x.projectId + x.proofName).toLowerCase().includes(q),
    ),
  );
</script>

{#if leads.length}<h4>Lead/Client</h4>
  {#each leads as x}<div class="doc-item">
      <div>
        <b>{x.client}</b>
        <div class="tiny muted">{x.phone} • {x.location}</div>
      </div>
      <a class="btn ghost small" href={`#/leads/${x.id}`} onclick={closeDialog}
        >Buka</a
      >
    </div>{/each}{/if}
{#if projects.length}<h4>Project</h4>
  {#each projects as x}<div class="doc-item">
      <div>
        <b>{x.id}</b>
        <div class="tiny muted">{x.name}</div>
      </div>
      <a
        class="btn ghost small"
        href={`#/projects/${x.id}`}
        onclick={closeDialog}>Buka</a
      >
    </div>{/each}{/if}
{#if transactions.length}<h4>Transaction</h4>
  {#each transactions as x}<div class="doc-item">
      <div>
        <b>{x.id} • {x.label}</b>
        <div class="tiny muted">{x.projectId} • {money(x.amount)}</div>
      </div>
      <a
        class="btn ghost small"
        href={`#/projects/${x.projectId}/transaction`}
        onclick={closeDialog}>Buka</a
      >
    </div>{/each}{/if}
{#if !leads.length && !projects.length && !transactions.length}<div
    class="empty"
  >
    Tidak ada hasil.
  </div>{/if}
