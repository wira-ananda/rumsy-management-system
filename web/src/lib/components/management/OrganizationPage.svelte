<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
</script>

<PageHeader
  title="Organization"
  description="Struktur mengikuti organisasi Rumsy; Shared Service Holding tetap terpisah."
/>
<div class="org">
  <div class="org-row">
    <div class="org-box"><b>Owner</b><small>Executive Monitoring</small></div>
  </div>
  <div class="org-line"></div>
  <div class="org-row">
    <div class="org-box primary">
      <b>Head Bisnis Unit / Manager Rumsy</b><small>RMS-01</small>
    </div>
  </div>
  <div class="org-line"></div>
  <div class="org-grid">
    <div class="org-box"><b>Manager Operasional</b><small>RMS-02</small></div>
    <div class="org-box">
      <b>Manager Marketing & Sales</b><small>RMS-03</small>
    </div>
    <div class="org-box"><b>Manager QC / IC</b><small>RMS-04</small></div>
  </div>
  <div class="org-grid" style="margin-top:12px">
    <div class="org-box"><b>Admin General</b><small>RMS-05</small></div>
    <div class="org-box"><b>Sales Executive</b><small>RMS-06</small></div>
    <div class="org-box">
      <b>Admin CRM & Telemarketing</b><small>RMS-07</small>
    </div>
  </div>
  <div class="org-row" style="margin-top:12px">
    <div class="org-box"><b>IC / QC Teknis</b><small>RMS-10</small></div>
  </div>
  <div class="notice info" style="margin-top:20px">
    <b>Shared Service Holding:</b> Finance • Purchasing • HRD • Legal & Syariah •
    Arda
  </div>
</div>
