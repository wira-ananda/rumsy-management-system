<script lang="ts">
  import { untrack } from "svelte";
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";

  import { permissions } from "../../constants/permissions";
  import { getUserOverride } from "../../access/permissions.js";
  import { save } from "../../services/api.js";
  import { closeDialog } from "../../stores/dialog";
  let { user }: { user: any } = $props();
  let selected = $state<string[]>(
    untrack(() => [...(getUserOverride(user.id).add || [])]),
  );
  let error = $state("");
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    try {
      runtime.data!.userAccessOverrides =
        runtime.data!.userAccessOverrides || [];
      let old = runtime.data!.userAccessOverrides.find(
        (x: any) => String(x.userId) === String(user.id),
      );
      if (old) old.add = selected;
      else
        runtime.data!.userAccessOverrides.push({
          userId: user.id,
          add: selected,
          remove: [],
        });
      await save();
      closeDialog();
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<form id="accessForm" onsubmit={submit}>
  {#if error}<div class="notice warn">
      {error}
    </div>{/if}{#each permissions as [name, label]}<label class="field"
      ><span
        ><input type="checkbox" {name} value={name} bind:group={selected} />
        {label}</span
      ></label
    >{/each}<button class="btn primary">Simpan</button>
</form>
