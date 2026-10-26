<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Info from "../../shared/Info.svelte";
  import StagePath from "../../sales/StagePath.svelte";
  import { leadById } from "../../../domain/models.js";
  import { money } from "../../../utils/format.js";
  import { leadDpAmount, leadNeedLabel } from "../../../domain/lead-terms";
  let { project }: { project: any } = $props();
  let lead = $derived(leadById(project.leadId));
</script>

<Card title="Sales History"
  >{#if lead}<StagePath stage={lead.stage} />
    <div class="grid2eq mt">
      <Info label="DP (Rp)" value={money(leadDpAmount(lead))} /><Info
        label="Est. RAB"
        value={money(lead.estRab)}
      /><Info label="Est. ASST CR" value={money(lead.estAsstCr)} /><Info
        label="Catatan"
        value={lead.notes}
      />
      <Info label="Kebutuhan" value={leadNeedLabel(lead)} />
      <Info
        label="Tenor"
        value={lead.tenorYears ? `${lead.tenorYears} tahun` : "Belum diisi"}
      />
      <Info label="Jaminan" value={lead.collateral || "Belum diisi"} />
      {#if lead.estGambar}<Info
          label="Est. Gambar (arsip)"
          value={money(lead.estGambar)}
        />{/if}
    </div>
    <div class="timeline mt">
      {#each lead.milestones as milestone, index}<div class="event">
          <div class="event-time">Milestone {index + 1}</div>
          <div class="event-text"><b>{milestone}</b></div>
        </div>{/each}
    </div>{:else}<div class="empty">Tidak ada Sales History.</div>{/if}</Card
>
