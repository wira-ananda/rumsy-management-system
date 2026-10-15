<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import { TODAY } from "../../../constants/catalog.js";
  import {
    hasFinalBast,
    finalQcReady,
    syncPipelineForProject,
  } from "../../../domain/pipeline.js";
  import { addAudit, addProjectActivity } from "../../../domain/models.js";
  import { addProjectChat } from "../../../services/chat.js";
  import { currentActor } from "../../../access/permissions.js";
  import { save } from "../../../services/api.js";
  let { project }: { project: any } = $props();
  let dp = $derived(
    project.transactions.some(
      (item: any) => item.type === "DP_PROYEK" && item.status === "VERIFIED",
    ),
  );
  let bast = $derived(hasFinalBast(project)),
    qc = $derived(finalQcReady(project));
  let canSubmit = $derived(
    [
      "MANAGER_SALES",
      "ADMIN_GENERAL",
      "SALES_EXECUTIVE",
      "HEAD_BU",
      "SUPER_ADMIN",
    ].includes(runtime.session!.role),
  );
  let canReview = $derived(
    ["MANAGER_OPERASIONAL", "HEAD_BU", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
  async function change(action: string) {
    if (action === "SUBMITTED") {
      project.handover.status = action;
      project.handover.submittedAt = TODAY;
    }
    if (action === "ACCEPTED") {
      project.handover.status = action;
      project.handover.reviewedAt = TODAY;
    }
    if (action === "RETURNED") project.handover.status = action;
    if (action === "START") {
      project.started = true;
      project.startDate = project.startDate || TODAY;
      project.status = "RUNNING";
      syncPipelineForProject(project);
    }
    if (action === "COMPLETE") {
      project.completionApproved = true;
      project.status = "COMPLETED";
      project.actualFinish = TODAY;
      syncPipelineForProject(project);
    }
    const messages: Record<
      string,
      { activity: string; chat: string; audit?: [string, string, string] }
    > = {
      SUBMITTED: {
        activity: "Handover SUBMITTED untuk review Manager Operasional.",
        chat: "Handover diajukan untuk review.",
        audit: ["HANDOVER", "SUBMIT", "Handover submitted"],
      },
      ACCEPTED: { activity: "Handover ACCEPTED.", chat: "Handover ACCEPTED." },
      RETURNED: {
        activity: "Handover RETURNED untuk revisi.",
        chat: "Handover dikembalikan untuk revisi.",
      },
      START: {
        activity: "Project Start APPROVED → Pembangunan.",
        chat: "Project Start APPROVED. Pipeline otomatis → Pembangunan.",
        audit: ["PROJECT", "START_APPROVE", "Project started"],
      },
      COMPLETE: {
        activity: "Project Completion APPROVED → SELESAI.",
        chat: "Completion APPROVED. Pipeline otomatis → Selesai.",
        audit: ["PROJECT", "COMPLETION_APPROVE", "Project completed"],
      },
    };
    const message = messages[action];
    addProjectActivity(project, currentActor(), message.activity);
    addProjectChat(project, "System", message.chat, true);
    if (message.audit)
      addAudit(
        currentActor(),
        message.audit[0],
        project.id,
        message.audit[1],
        message.audit[2],
      );
    await save();
  }
</script>

<div style="margin-bottom:14px">
  <h3>Handover & Completion</h3>
  <div class="small muted">
    Gerbang Pembangunan dan Selesai berasal dari event nyata, bukan status
    manual.
  </div>
</div>
<div class="grid2">
  <Card title="Start Gate"
    >{#each [["DP Proyek VERIFIED", dp], ["Contract SIGNED", project.contract.status === "SIGNED"], ["Handover ACCEPTED", project.handover.status === "ACCEPTED"], ["Project Start APPROVED", project.started]] as [label, ready]}<div
        class="check"
      >
        <span class="checkmark" class:no={!ready}>{ready ? "✓" : "×"}</span
        >{label}
      </div>{/each}{#if ["DRAFT", "RETURNED"].includes(project.handover.status) && canSubmit}<button
        class="btn primary mt"
        id="submitH"
        onclick={() => change("SUBMITTED")}>Submit Handover</button
      >{/if}{#if project.handover.status === "SUBMITTED" && canReview}<div
        class="mt"
      >
        <button
          class="btn primary"
          id="acceptH"
          onclick={() => change("ACCEPTED")}>Accept Handover</button
        >
        <button
          class="btn ghost"
          id="returnH"
          onclick={() => change("RETURNED")}>Return</button
        >
      </div>{/if}{#if project.handover.status === "ACCEPTED" && !project.started && dp && project.contract.status === "SIGNED" && canReview}<button
        class="btn primary mt"
        id="startP"
        onclick={() => change("START")}>Approve Project Start</button
      >{/if}</Card
  ><Card title="Completion Gate"
    >{#each [["Progress 100%", project.progress >= 100], ["Semua QC CLOSED", qc], ["BAST FINAL", bast], ["Completion APPROVED", project.completionApproved]] as [label, ready]}<div
        class="check"
      >
        <span class="checkmark" class:no={!ready}>{ready ? "✓" : "×"}</span
        >{label}
      </div>{/each}{#if project.progress >= 100 && qc && !bast && canReview}<a
        class="btn ghost mt"
        href={`#/projects/${project.id}/document`}
        >Upload BAST Final di Dokumen</a
      >{/if}{#if project.progress >= 100 && qc && bast && !project.completionApproved && canReview}<button
        class="btn primary mt"
        id="completeP"
        onclick={() => change("COMPLETE")}>Approve Completion</button
      >{/if}</Card
  >
</div>
