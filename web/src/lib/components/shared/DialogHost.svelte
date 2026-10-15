<script lang="ts">
  import { dialog, closeDialog } from "../../stores/dialog";
</script>

{#if $dialog}
  {@const Content = $dialog.component}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="modalBg"
    class="modal-bg"
    role="presentation"
    onmousedown={(event) => {
      if (event.target === event.currentTarget) closeDialog();
    }}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
    >
      <div class="modal-head">
        <h3 id="modalTitle">{$dialog.title}</h3>
        <button
          class="icon-btn"
          id="modalClose"
          aria-label="Tutup"
          onclick={closeDialog}>×</button
        >
      </div>
      <div class="modal-body">
        {#key $dialog}<Content {...$dialog.props} />{/key}
      </div>
    </div>
  </div>
{/if}
