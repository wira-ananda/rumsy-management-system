<script lang="ts">
  import { runtime } from "../../../stores/runtime.js";
  import { documentPresets } from "../../../constants/catalog.js";
  import { fileUrl } from "../../../services/api.js";
  import {
    documentForm,
    deleteDocument,
  } from "../../../features/projects/documents";
  import { date } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canEdit = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "ADMIN_GENERAL", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
  let documents = $derived(
    project.documents.filter(
      (item: any) => item.status !== "SUPERSEDED" && item.name,
    ),
  );
</script>

<div class="split">
  <div>
    <h3>Dokumen Project</h3>
    <div class="small muted">
      Pilih jenis dokumen. Jika dokumen sudah tersedia, tekan kartunya untuk
      langsung membuka file.
    </div>
  </div>
  {#if canEdit}<button
      class="btn ghost"
      id="addOtherDoc"
      onclick={() => documentForm(project)}>＋ Dokumen Lain</button
    >{/if}
</div>
<div class="doc-choice-grid">
  {#each documentPresets as preset}{@const document = [...project.documents]
      .reverse()
      .find(
        (item: any) =>
          item.type === preset.type && item.status === "FINAL" && item.fileId,
      )}
    <div class="doc-choice-card" class:ready={!!document}>
      <button
        class="doc-choice-main"
        data-doc={preset.key}
        data-file={document?.fileId || ""}
        onclick={() => {
          if (document) window.open(fileUrl(document.fileId), "_blank");
          else if (canEdit) documentForm(project, preset);
        }}
        ><span class="doc-choice-icon">{document ? "✓" : "＋"}</span><b
          >{preset.label}</b
        ><small
          >{document
            ? "Tekan untuk buka dokumen"
            : "Belum ada • tekan untuk upload"}</small
        ></button
      >{#if document && canEdit}<button
          class="btn ghost small docChoiceEdit"
          onclick={() => documentForm(project, null, document)}
          >Edit / Ganti</button
        >{/if}
    </div>{/each}
</div>
<div class="card mt">
  <div class="card-head">
    <h3>Semua Dokumen Project</h3>
    <span class="small muted">{documents.length} dokumen aktif</span>
  </div>
  <div class="card-body">
    <div class="stack">
      {#each documents as document}<div class="doc-item doc-row">
          <div class="doc-main">
            <div class="doc-icon">▤</div>
            <div>
              <b>{document.type}</b>
              <div class="tiny muted">
                {date(document.date)} • {document.name}
              </div>
            </div>
          </div>
          <div class="action-row">
            {#if document.fileId}<a
                class="btn ghost small"
                target="_blank"
                rel="noreferrer"
                href={fileUrl(document.fileId)}>Buka</a
              >{/if}{#if canEdit}<button
                class="btn ghost small editDoc"
                onclick={() => documentForm(project, null, document)}
                >Edit</button
              ><button
                class="btn danger small delDoc"
                onclick={() => deleteDocument(project, document)}>Hapus</button
              >{/if}
          </div>
        </div>{:else}<div class="empty">
          Belum ada dokumen. Pilih jenis dokumen di atas.
        </div>{/each}
    </div>
  </div>
</div>
