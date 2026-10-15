<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
</script>

<PageHeader
  title="Audit Log"
  description="Riwayat sensitif tidak dihapus: actor, action, entity, timestamp dan detail."
/><Card title="Audit Trail"
  >{#each runtime.data!.audit as a}<div class="audit-row">
      <div>{a.at}</div>
      <div><b>{a.actor}</b></div>
      <div>{a.detail}</div>
      <div class="mono">{a.entity} • {a.entityId}<br />{a.action}</div>
    </div>{/each}</Card
>
