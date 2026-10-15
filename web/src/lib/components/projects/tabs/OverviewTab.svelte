<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Info from "../../shared/Info.svelte";
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import {
    currentContract,
    verifiedPaid,
    projectClientUrl,
    makeClientToken,
  } from "../../../domain/models.js";
  import { save } from "../../../services/api.js";
  import { date, money, nowIso } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let copied = $state(false);
  let required = $derived(
    runtime.data!.settings.requiredDocs.map((type: string) => ({
      type,
      ok:
        project.documents.some(
          (document: any) =>
            document.type === type &&
            document.name &&
            ["FINAL", "SIGNED"].includes(document.status),
        ) ||
        (type === "Payment Schedule" && project.installments.length),
    })),
  );
  let completeness = $derived(
    Math.round(
      (required.filter((item: any) => item.ok).length /
        Math.max(1, required.length)) *
        100,
    ),
  );
  let canPortal = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "ADMIN_GENERAL", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
  let portal = $derived(projectClientUrl(project));
  async function enable() {
    project.clientPortal = {
      enabled: true,
      token: makeClientToken(),
      createdAt: nowIso(),
    };
    await save();
  }
  async function reset() {
    if (
      !confirm("Buat ulang link? Link client lama akan langsung tidak berlaku.")
    )
      return;
    await enable();
  }
  async function disable() {
    project.clientPortal.enabled = false;
    await save();
  }
</script>

<div class="grid2">
  <Card title="Project Snapshot"
    ><div class="grid2eq">
      <Info label="Status Operasional"><Badge status={project.status} /></Info
      ><Info label="Progress" value={project.progress + "%"} /><Info
        label="Tanggal Mulai"
        value={date(project.startDate)}
      /><Info label="Target Selesai" value={date(project.targetFinish)} /><Info
        label="Nomor Akad"
        value={project.contract.number || "Belum diisi"}
      /><Info label="Handover"><Badge status={project.handover.status} /></Info>
    </div></Card
  ><Card title="Document Completeness"
    ><div class="stat-value">{completeness}%</div>
    <div class="progress"><div style:width={`${completeness}%`}></div></div>
    <div class="checklist-grid mt">
      {#each required as item}<div class="checkitem">
          <span>{item.type}</span><Badge
            status={item.ok ? "READY" : "MISSING"}
          />
        </div>{/each}
    </div></Card
  >
</div>
<div class="grid2 mt">
  <Card title="Payment Summary"
    ><div class="grid2eq">
      <Info
        label="Current Contract"
        value={money(currentContract(project))}
      /><Info label="Verified Paid" value={money(verifiedPaid(project))} /><Info
        label="Outstanding"
        value={money(currentContract(project) - verifiedPaid(project))}
      /><Info
        label="Pending Verification"
        value={project.transactions.filter(
          (item: any) => item.status === "PENDING_VERIFICATION",
        ).length}
      />
    </div></Card
  ><Card title="QC Summary"
    ><div class="grid2eq">
      {#each ["OPEN", "OVERDUE", "WAITING_VERIFICATION", "CLOSED"] as status}<Info
          label={status.replaceAll("_", " ")}
          value={project.qcFindings.filter(
            (item: any) => item.status === status,
          ).length}
        />{/each}
    </div></Card
  >
</div>
<div class="mt">
  <Card title="Portal Client"
    >{#if project.clientPortal?.enabled && portal}<div class="notice success">
        <b>Portal client aktif</b><br /><span class="small"
          >Client hanya melihat progress proyek, laporan harian dan laporan
          mingguan yang dipublikasikan.</span
        >
      </div>
      <div class="client-link-box mt">
        <input
          class="input"
          id="clientPortalLink"
          value={portal}
          readonly
        /><button
          class="btn primary"
          id="copyClientLink"
          onclick={async () => {
            await navigator.clipboard.writeText(portal);
            copied = true;
          }}>{copied ? "Tersalin ✓" : "Salin Link"}</button
        >
      </div>
      {#if canPortal}<button
          class="btn ghost mt"
          id="resetClientLink"
          onclick={reset}>Buat Ulang Link</button
        >
        <button class="btn danger mt" id="disableClientLink" onclick={disable}
          >Nonaktifkan</button
        >{/if}{:else if canPortal}<div class="empty">
        Portal client belum aktif.
      </div>
      <button class="btn primary mt" id="enableClientLink" onclick={enable}
        >Aktifkan Portal Client</button
      >{:else}<div class="empty">
        Portal client belum diaktifkan.
      </div>{/if}</Card
  >
</div>
