<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Info from "../../shared/Info.svelte";
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import { TODAY } from "../../../constants/catalog.js";
  import { contractForm } from "../../../features/projects/actions";
  import { save, fileUrl } from "../../../services/api.js";
  import { addProjectActivity, addAudit } from "../../../domain/models.js";
  import { syncPipelineForProject } from "../../../domain/pipeline.js";
  import { addProjectChat } from "../../../services/chat.js";
  import { currentActor } from "../../../access/permissions.js";
  import { date, money, pct } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canSign = $derived(
    ["HEAD_BU", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
  let canEdit = $derived(
    ["HEAD_BU", "ADMIN_GENERAL", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
  async function sign() {
    if (!String(project.contract.number || "").trim())
      return alert(
        "Isi Nomor Akad / Kontrak terlebih dahulu melalui Edit Kontrak.",
      );
    if (
      !project.documents.some(
        (item: any) =>
          item.type === "Akad" && item.status === "FINAL" && item.fileId,
      )
    )
      return alert(
        "Upload Dokumen Akad Final terlebih dahulu pada tab Dokumen.",
      );
    project.contract.status = "SIGNED";
    project.contract.date = project.contract.date || TODAY;
    addProjectActivity(
      project,
      currentActor(),
      "Akad/kontrak ditandai sudah ditandatangani.",
    );
    addProjectChat(
      project,
      "System",
      "Kontrak sudah ditandatangani. Syarat mulai pembangunan dievaluasi.",
      true,
    );
    addAudit(currentActor(), "CONTRACT", project.id, "SIGN", "Contract SIGNED");
    syncPipelineForProject(project);
    await save();
  }
</script>

<div class="grid2">
  <Card title="Informasi Kontrak"
    ><div class="grid2eq">
      <Info
        label="Nomor Akad / Kontrak"
        value={project.contract.number || "Belum diisi"}
      /><Info label="Tanggal Akad" value={date(project.contract.date)} /><Info
        label="Nilai Kontrak Awal"
        value={money(project.originalContract)}
      /><Info label="DP" value={pct(project.contract.dp)} /><Info
        label="Margin"
        value={pct(project.contract.margin)}
      /><Info
        label="Tenor"
        value={project.contract.tenor
          ? `${project.contract.tenor} bulan`
          : "Belum diisi"}
      /><Info label="Status"><Badge status={project.contract.status} /></Info>
    </div>
    <div class="action-row mt">
      {#if canEdit}<button
          class="btn ghost"
          id="editContract"
          onclick={() => contractForm(project)}>✎ Edit Kontrak</button
        >{/if}{#if canSign && project.contract.status !== "SIGNED"}<button
          class="btn primary"
          id="signContract"
          onclick={sign}>✓ Tandai Sudah Ditandatangani</button
        >{/if}
    </div></Card
  ><Card title="Dokumen Kontrak"
    >{#each project.documents.filter((item: any) => item.category === "CONTRACT" && item.status !== "SUPERSEDED") as document}<div
        class="doc-item"
      >
        <div>
          <b>{document.type}</b>
          <div class="tiny muted">
            {#if document.fileId}<a
                class="link"
                target="_blank"
                rel="noreferrer"
                href={fileUrl(document.fileId)}
                >{document.name || "Lihat file"}</a
              >{:else}{document.name || "Belum ada file"}{/if}
          </div>
        </div>
        <Badge status={document.status} />
      </div>{:else}<div class="empty">
        Belum ada dokumen kontrak. Buka tab Dokumen untuk upload.
      </div>{/each}</Card
  >
</div>
