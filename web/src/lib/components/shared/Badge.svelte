<script lang="ts">
  let { status }: { status: unknown } = $props();
  let text = $derived(String(status || "-"));
  let tone = $derived(
    [
      "VERIFIED",
      "PAID",
      "APPROVED",
      "SIGNED",
      "COMPLETED",
      "CLOSED",
      "SELESAI",
      "DONE",
      "ACCEPTED",
      "FINAL",
      "PASS",
    ].includes(text)
      ? "success"
      : [
            "PENDING_VERIFICATION",
            "PARTIAL",
            "ON_PROGRESS",
            "WAITING_VERIFICATION",
            "DUE",
            "HOT",
            "DP_PROYEK",
            "DP_GAMBAR",
            "RECEIVED",
            "SUBMITTED",
            "PENDING",
          ].includes(text)
        ? "warning"
        : [
              "OVERDUE",
              "REJECTED",
              "CRITICAL",
              "BATAL",
              "HOLD_BATAL",
              "NEED_REVISION",
              "MISSING",
              "RETURNED",
            ].includes(text)
          ? "danger"
          : ["RUNNING", "PEMBANGUNAN", "FINDING_CREATED"].includes(text)
            ? "info"
            : "neutral",
  );
</script>

<span class={`badge ${tone}`}>{text.replaceAll("_", " ")}</span>
