<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Info from "../../shared/Info.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import { leadById } from "../../../domain/models.js";
  import { pct } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let client = $derived(
    runtime.data!.clients.find((item: any) => item.id === project.clientId),
  );
  let lead = $derived(leadById(project.leadId));
</script>

<div class="grid2">
  <Card title="Client Profile"
    ><div class="grid2eq">
      <Info label="Nama" value={client?.name || project.client} /><Info
        label="WhatsApp"
        value={client?.phone || lead?.phone || "-"}
      /><Info label="Email" value={client?.email || "-"} /><Info
        label="Alamat"
        value={client?.address || project.location}
      />
    </div></Card
  ><Card title="Sales Origin"
    >{#if lead}<div class="grid2eq">
        <Info label="Sumber Lead" value={lead.source} /><Info
          label="Kebutuhan"
          value={lead.need}
        /><Info label="Sales" value={lead.sales} /><Info
          label="DP / Margin"
          value={`${pct(lead.dp)} / ${pct(lead.margin)}`}
        />
      </div>{:else}<div class="empty">
        Project tidak terhubung ke lead.
      </div>{/if}</Card
  >
</div>
