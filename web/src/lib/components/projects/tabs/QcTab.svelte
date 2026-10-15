<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Badge from "../../shared/Badge.svelte";
  import { date } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
</script>

<div style="margin-bottom:14px">
  <h3>QC / IC Project</h3>
  <div class="small muted">
    Inspection → Finding → Corrective Action → Verification → Closed.
  </div>
</div>
<div class="grid2">
  <Card title="Inspection"
    >{#each project.inspections as inspection}<div class="doc-item">
        <div>
          <b>{inspection.id} • {inspection.area}</b>
          <div class="tiny muted">
            {inspection.category} • {inspection.item} • {date(inspection.date)}
          </div>
        </div>
        <Badge status={inspection.result} />
      </div>{:else}<div class="empty">Belum ada inspection.</div>{/each}</Card
  ><Card title="Findings"
    >{#each project.qcFindings as finding}<div class="doc-item">
        <div>
          <b>{finding.id} • {finding.item}</b>
          <div class="tiny muted">
            {finding.area} • {finding.severity} • target {date(finding.target)}
          </div>
        </div>
        <Badge status={finding.status} />
      </div>{:else}<div class="empty">Tidak ada finding.</div>{/each}</Card
  >
</div>
