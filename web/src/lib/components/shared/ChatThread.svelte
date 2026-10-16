<script lang="ts">
  import { save, uploadFile } from "../../services/api.js";
  import FileLink from "./FileLink.svelte";
  import { addLeadChat, addProjectChat } from "../../services/chat.js";
  import { addAudit, addProjectActivity } from "../../domain/models.js";
  import { currentActor } from "../../access/permissions.js";
  let { entity, kind }: { entity: any; kind: "LEAD" | "PROJECT" } = $props();
  let message = $state("");
  let busy = $state(false);
  let error = $state("");
  async function send(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const attachment = new FormData(form).get("attachment") as File;
    busy = true;
    error = "";
    try {
      const up = attachment?.size
        ? await uploadFile(attachment, kind + "_CHAT", entity.id)
        : null;
      if (kind === "LEAD")
        addLeadChat(
          entity,
          currentActor(),
          message,
          false,
          up?.name || "",
          up?.id || "",
        );
      else {
        addProjectChat(
          entity,
          currentActor(),
          message,
          false,
          up?.name || "",
          up?.id || "",
        );
        addProjectActivity(
          entity,
          currentActor(),
          `Mengirim pesan di Chat Project${up ? " + lampiran " + up.name : ""}.`,
        );
      }
      addAudit(
        currentActor(),
        kind + "_CHAT",
        entity.id,
        "MESSAGE",
        "Pesan internal " + kind.toLowerCase(),
      );
      await save();
      message = "";
      form.reset();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    } finally {
      busy = false;
    }
  }
</script>

<div class="chat-box">
  <div class="chat-title">
    <b>{kind === "LEAD" ? "Chat Internal Lead" : "Chat Project"}</b><span
      class="tiny muted">Internal • tersimpan di Cloudflare</span
    >
  </div>
  <div class="chat-messages">
    {#each entity.chat || [] as chat}<div
        class="chat-msg"
        class:system={chat.system}
      >
        <div class="chat-meta">
          <b>{chat.actor}</b><span>{chat.at || ""}</span>
        </div>
        <div>{chat.text}</div>
        {#if chat.attachment}<div class="chat-attachment">
            📎 {#if chat.attachmentFileId}<FileLink
                fileId={chat.attachmentFileId}
                filename={chat.attachment}>{chat.attachment}</FileLink
              >{:else}{chat.attachment}{/if}
          </div>{/if}
      </div>{:else}<div class="empty">Belum ada pesan.</div>{/each}
  </div>
  <form
    id={kind === "LEAD" ? "leadChatForm" : "projectChatForm"}
    class="chat-form"
    onsubmit={send}
  >
    {#if error}<div class="notice danger">{error}</div>{/if}
    <textarea
      class="input"
      name="message"
      rows="2"
      bind:value={message}
      placeholder="Tulis pesan internal..."
      required></textarea>
    <div class="chat-actions">
      <input type="file" class="input" name="attachment" /><button
        class="btn primary"
        disabled={busy}>Kirim</button
      >
    </div>
  </form>
</div>
