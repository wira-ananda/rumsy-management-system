<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";

  import Stat from "../shared/Stat.svelte";
  import { runSelfTests } from "../../features/system/checks.js";
  import { projectTabComponents } from "../projects/tabs";
  import ChatTab from "../projects/tabs/ChatTab.svelte";
  let tests = $derived([
    ...runSelfTests(),
    {
      name: "Tab Chat memakai komponen Svelte",
      ok: projectTabComponents.chat === ChatTab,
      detail: "",
    },
  ]);
  let pass = $derived(tests.filter((x: any) => x.ok).length);
</script>

<PageHeader
  title="System Check"
  description="Pemeriksaan otomatis terhadap rule inti RMS Production."
/>
<div class="stats">
  <Stat
    label="Passed"
    value={`${pass}/${tests.length}`}
    tone={pass === tests.length ? "success" : "warning"}
  /><Stat
    label="Failed"
    value={tests.length - pass}
    tone={pass === tests.length ? "success" : "danger"}
  /><Stat label="Pipeline Engine" value="AUTO / READ ONLY" tone="info" /><Stat
    label="Storage"
    value="D1 + R2"
    tone="success"
  />
</div>
<div class="mt">
  <Card title="Hasil Pemeriksaan"
    >{#each tests as test}<div
        class="test-row"
        class:pass={test.ok}
        class:fail={!test.ok}
      >
        <span>{test.ok ? "✓" : "×"}</span>
        <div>
          <b>{test.name}</b>{#if test.detail}<div class="tiny muted">
              {test.detail}
            </div>{/if}
        </div>
      </div>{/each}</Card
  >
</div>
<div class="notice info mt">
  System Check menguji rule inti secara lokal tanpa mengubah data proyek Anda.
</div>
