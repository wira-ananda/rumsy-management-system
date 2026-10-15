<script lang="ts">
  import { closeFinding } from "../../features/qc/actions";
  import { closeDialog } from "../../stores/dialog";
  let { finding }: { finding: any } = $props();
  async function decide(approved: boolean) {
    await closeFinding(finding, approved);
    closeDialog();
  }
</script>

<div class="notice info">
  <b>Corrective:</b>
  {finding.corrective || "-"}<br /><b>After:</b>
  {finding.afterName || "-"}
</div>
<div class="split mt">
  <button class="btn ghost" id="qReturn" onclick={() => decide(false)}
    >Return to On Progress</button
  ><button class="btn primary" id="qClose" onclick={() => decide(true)}
    >Verify → Closed</button
  >
</div>
