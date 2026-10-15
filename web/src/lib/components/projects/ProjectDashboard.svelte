<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { money, date } from "../../utils/format.js";
  import { visibleProjects } from "../../access/permissions.js";
  import { currentContract, verifiedPaid } from "../../domain/models.js";
  import { TODAY } from "../../constants/catalog.js";
  let projects = $derived(visibleProjects());
  let findings = $derived(projects.flatMap((p: any) => p.qcFindings || []));
  let tasks = $derived(
    (runtime.data!.tasks || []).filter((t: any) =>
      projects.some((p: any) => String(p.id) === String(t.projectId)),
    ),
  );
  let contract = $derived(
    projects.reduce((s: any, p: any) => s + currentContract(p), 0),
  );
  let paid = $derived(
    projects.reduce((s: any, p: any) => s + verifiedPaid(p), 0),
  );
</script>

<PageHeader
  title="Dashboard Project"
  description="Monitoring project secara keseluruhan: progress, QC, task, nilai kontrak dan target."
/>
<div class="stats">
  <Stat label="Total Project" value={projects.length} /><Stat
    label="Project Aktif"
    value={projects.filter((p: any) => p.status !== "COMPLETED").length}
  /><Stat
    label="Project Selesai"
    value={projects.filter((p: any) => p.status === "COMPLETED").length}
    tone="success"
  /><Stat
    label="On Hold"
    value={projects.filter((p: any) =>
      ["HOLD", "HOLD_BATAL"].includes(p.status),
    ).length}
    tone="warning"
  /><Stat
    label="Terlambat"
    value={projects.filter(
      (p: any) =>
        p.status !== "COMPLETED" &&
        p.targetFinish &&
        String(p.targetFinish) < TODAY,
    ).length}
    tone="warning"
  />
</div>
<div class="stats mt">
  <Stat
    label="Progress Rata-rata"
    value={`${projects.length ? Math.round(projects.reduce((s: any, p: any) => s + Number(p.progress || 0), 0) / projects.length) : 0}%`}
  /><Stat label="Current Contract" value={money(contract)} /><Stat
    label="Total Paid"
    value={money(paid)}
    tone="success"
  /><Stat label="Outstanding" value={money(contract - paid)} tone="warning" />
</div>
<div class="grid2 mt">
  <Card title="QC Project"
    ><div class="grid2eq">
      <Info label="Total Temuan" value={findings.length} /><Info
        label="Open / Aktif"
        value={findings.filter((x: any) => x.status !== "CLOSED").length}
      /><Info
        label="Overdue"
        value={findings.filter((x: any) => x.status === "OVERDUE").length}
      /><Info
        label="Closed"
        value={findings.filter((x: any) => x.status === "CLOSED").length}
      />
    </div></Card
  ><Card title="Task Project"
    ><div class="grid2eq">
      <Info
        label="Diberikan"
        value={tasks.filter((x: any) =>
          ["TO_DO", "REVISION"].includes(x.status),
        ).length}
      /><Info
        label="Dikerjakan"
        value={tasks.filter((x: any) => x.status === "ON_PROGRESS").length}
      /><Info
        label="Menunggu Review"
        value={tasks.filter((x: any) => x.status === "SUBMITTED").length}
      /><Info
        label="Selesai"
        value={tasks.filter((x: any) => x.status === "DONE").length}
      />
    </div></Card
  >
</div>
<div class="mt">
  <Card title="Monitoring Project"
    ><div class="table-wrap">
      <table class="table">
        <thead
          ><tr
            >{#each ["ID", "Project", "Client", "Status", "Progress", "QC Aktif", "Task Aktif", "Target", "Aksi"] as h}<th
                >{h}</th
              >{/each}</tr
          ></thead
        ><tbody
          >{#each projects as p}<tr
              ><td>{p.id}</td><td>{p.name}</td><td>{p.client || "-"}</td><td
                ><Badge status={p.status} /></td
              ><td><b>{Number(p.progress || 0)}%</b></td><td
                >{(p.qcFindings || []).filter((x: any) => x.status !== "CLOSED")
                  .length}</td
              ><td
                >{(runtime.data!.tasks || []).filter(
                  (x: any) =>
                    String(x.projectId || "") === String(p.id) &&
                    !["DONE", "CANCELLED"].includes(x.status),
                ).length}</td
              ><td>{date(p.targetFinish)}</td><td
                ><a class="btn ghost small" href={`#/projects/${p.id}`}>Buka</a
                ></td
              ></tr
            >{:else}<tr
              ><td colspan="9"><div class="empty">Belum ada project.</div></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div></Card
  >
</div>
