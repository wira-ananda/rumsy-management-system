<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { money, date } from "../../utils/format.js";
  import { visibleLeads } from "../../access/permissions.js";
  import {
    metrics,
    allTransactions,
    allFindings,
    allInspections,
    installmentStatus,
  } from "../../domain/models.js";
  import { stages, stageNames, roles, TODAY } from "../../constants/catalog.js";
  let m = $derived(metrics());
  let leads = $derived(visibleLeads());
  let counts = $derived(
    Object.fromEntries(
      stages.map((s: any) => [
        s,
        leads.filter((l: any) => l.stage === s).length,
      ]),
    ),
  );
  let max = $derived(Math.max(1, ...Object.values(counts).map(Number)));
</script>

<PageHeader
  title={`Dashboard ${roles[runtime.session!.role as keyof typeof roles]}`}
  description="Dashboard menyesuaikan role dan tanggung jawab pengguna."
/>
<div class="stats">
  <Stat label="Project Aktif" value={m.active} /><Stat
    label="Current Contract"
    value={money(m.contract)}
  /><Stat label="Total Paid" value={money(m.paid)} tone="success" /><Stat
    label="Outstanding"
    value={money(m.outstanding)}
    tone="warning"
  />
</div>
{#if runtime.session!.role === "HOLDING_FINANCE"}<div class="stats mt">
    <Stat
      label="Pending Verification"
      value={allTransactions().filter(
        (t: any) => t.status === "PENDING_VERIFICATION",
      ).length}
      tone="warning"
    /><Stat
      label="Due / Overdue"
      value={runtime
        .data!.projects.flatMap((p: any) =>
          p.installments.map((i: any) => installmentStatus(p, i)),
        )
        .filter((s: any) => ["DUE", "OVERDUE"].includes(s)).length}
      tone="danger"
    /><Stat
      label="Verified Today"
      value={allTransactions().filter(
        (t: any) => t.status === "VERIFIED" && t.date === TODAY,
      ).length}
      tone="success"
    /><Stat label="Outstanding" value={money(m.outstanding)} tone="warning" />
  </div>
{:else if ["MANAGER_QC", "QC_TEKNIS"].includes(runtime.session!.role)}<div
    class="stats mt"
  >
    <Stat label="Inspection" value={allInspections().length} /><Stat
      label="Open Finding"
      value={m.qc}
    /><Stat label="Overdue" value={m.qcOver} tone="danger" /><Stat
      label="Waiting Verify"
      value={allFindings().filter(
        (q: any) => q.status === "WAITING_VERIFICATION",
      ).length}
      tone="warning"
    />
  </div>{/if}
<div class="grid2 mt">
  <Card title="Sales Pipeline"
    >{#each stages as stage}<div class="pipe-row">
        <span class="small muted"
          >{stageNames[stage as keyof typeof stageNames]}</span
        >
        <div class="pipe-bar">
          <div
            class="pipe-fill"
            style:width={`${Math.max(7, (counts[stage] / max) * 100)}%`}
          ></div>
        </div>
        <span class="mono small">{counts[stage]}</span>
      </div>{/each}</Card
  ><Card title="Perlu Perhatian"
    >{#each [["Rp", "Payment Verification", `${m.pending} transaksi menunggu Finance`], ["!", "QC Overdue", `${m.qcOver} finding melewati target`], ["◷", "Follow-up Due", `${m.follow} lead perlu ditindaklanjuti`]] as item, i}<div
        class="attention"
        class:danger={i === 1}
        style:margin-top={i ? "9px" : undefined}
      >
        <div class="att-icon">{item[0]}</div>
        <div>
          <div class="att-title">{item[1]}</div>
          <div class="att-text">{item[2]}</div>
        </div>
      </div>{/each}</Card
  >
</div>
