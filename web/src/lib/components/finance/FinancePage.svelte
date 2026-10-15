<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { visibleProjects } from "../../access/permissions.js";
  import {
    allTransactions,
    currentContract,
    verifiedPaid,
    installmentPaid,
    installmentStatus,
  } from "../../domain/models.js";
  import { date, money } from "../../utils/format.js";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let transactions = $derived(allTransactions());
  let pending = $derived(
    transactions.filter((item: any) => item.status === "PENDING_VERIFICATION"),
  );
  let schedules = $derived(
    visibleProjects().flatMap((project: any) =>
      project.installments.map((installment: any) => ({
        project,
        installment,
        paid: installmentPaid(project, installment),
        status: installmentStatus(project, installment),
      })),
    ),
  );
  let outstanding = $derived(
    runtime.data!.projects.map((project: any) => ({
      project,
      value: currentContract(project),
      paid: verifiedPaid(project),
      balance: currentContract(project) - verifiedPaid(project),
    })),
  );
  let title = $derived(
    (
      {
        "finance-verification": "Payment Verification",
        "finance-schedule": "Payment Schedule",
        "finance-ledger": "Transaction Ledger",
        "finance-outstanding": "Outstanding",
      } as Record<string, string>
    )[route.page],
  );
</script>

<PageHeader
  {title}
  description={route.page === "finance-verification"
    ? "Hanya Finance/Super Admin yang dapat Verify/Reject. Upload bukti oleh Sales/Admin tetap Pending hingga diverifikasi."
    : route.page === "finance-schedule"
      ? "Jadwal cicilan lintas project dengan status otomatis."
      : route.page === "finance-ledger"
        ? "Semua payment record terhubung ke Project ID dan bukti."
        : "Outstanding dihitung hanya dari VERIFIED payment."}
/>
{#if route.page === "finance-verification"}<div class="stats">
    <Stat label="Pending" value={pending.length} tone="warning" /><Stat
      label="Pending Amount"
      value={money(
        pending.reduce((sum: number, item: any) => sum + item.amount, 0),
      )}
    /><Stat
      label="Verified"
      value={transactions.filter((item: any) => item.status === "VERIFIED")
        .length}
      tone="success"
    /><Stat
      label="Rejected"
      value={transactions.filter((item: any) => item.status === "REJECTED")
        .length}
      tone="danger"
    />
  </div>
  <div class="mt">
    <Card title="Queue"
      ><div class="table-wrap">
        <table class="table">
          <thead
            ><tr
              >{#each ["Project", "Client", "Payment", "Amount", "Bukti", "Aksi"] as label}<th
                  >{label}</th
                >{/each}</tr
            ></thead
          ><tbody
            >{#each pending as item}<tr
                ><td
                  ><a
                    class="link"
                    href={`#/projects/${item.projectId}/transaction`}
                    >{item.projectId}</a
                  ></td
                ><td>{item.client}</td><td>{item.label}</td><td class="mono"
                  ><b>{money(item.amount)}</b></td
                ><td>{item.proofName}</td><td
                  ><a
                    class="btn primary small"
                    href={`#/projects/${item.projectId}/transaction`}>Review</a
                  ></td
                ></tr
              >{:else}<tr
                ><td colspan="6" class="empty">Tidak ada payment pending.</td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div></Card
    >
  </div>
{:else if route.page === "finance-schedule"}<Card title="Schedule"
    ><div class="table-wrap">
      <table class="table">
        <thead
          ><tr
            >{#each ["Project", "Client", "Installment", "Due", "Amount", "Paid", "Balance", "Status"] as label}<th
                >{label}</th
              >{/each}</tr
          ></thead
        ><tbody
          >{#each schedules as item}<tr
              ><td
                ><a
                  class="link"
                  href={`#/projects/${item.project.id}/installment`}
                  >{item.project.id}</a
                ></td
              ><td>{item.project.client}</td><td>{item.installment.seq}</td><td
                >{date(item.installment.due)}</td
              ><td class="mono">{money(item.installment.dueAmount)}</td><td
                class="mono">{money(item.paid)}</td
              ><td class="mono"
                >{money(
                  Math.max(0, item.installment.dueAmount - item.paid),
                )}</td
              ><td><Badge status={item.status} /></td></tr
            >{/each}</tbody
        >
      </table>
    </div></Card
  >
{:else if route.page === "finance-ledger"}<Card title="Ledger"
    ><div class="table-wrap">
      <table class="table">
        <thead
          ><tr
            >{#each ["ID", "Project", "Client", "Date", "Type", "Amount", "Proof", "Status"] as label}<th
                >{label}</th
              >{/each}</tr
          ></thead
        ><tbody
          >{#each transactions as item}<tr
              ><td class="mono">{item.id}</td><td
                ><a
                  class="link"
                  href={`#/projects/${item.projectId}/transaction`}
                  >{item.projectId}</a
                ></td
              ><td>{item.client}</td><td>{date(item.date)}</td><td
                >{item.label}</td
              ><td class="mono">{money(item.amount)}</td><td
                >{item.proofName}</td
              ><td><Badge status={item.status} /></td></tr
            >{/each}</tbody
        >
      </table>
    </div></Card
  >
{:else}<div class="stats">
    <Stat
      label="Current Contract"
      value={money(
        outstanding.reduce((sum: number, item: any) => sum + item.value, 0),
      )}
    /><Stat
      label="Verified Paid"
      value={money(
        outstanding.reduce((sum: number, item: any) => sum + item.paid, 0),
      )}
      tone="success"
    /><Stat
      label="Outstanding"
      value={money(
        outstanding.reduce((sum: number, item: any) => sum + item.balance, 0),
      )}
      tone="warning"
    /><Stat
      label="Overdue Installment"
      value={outstanding.reduce(
        (sum: number, item: any) =>
          sum +
          item.project.installments.filter(
            (installment: any) =>
              installmentStatus(item.project, installment) === "OVERDUE",
          ).length,
        0,
      )}
      tone="danger"
    />
  </div>
  <div class="mt">
    <Card title="Outstanding per Project"
      ><div class="table-wrap">
        <table class="table">
          <thead
            ><tr
              ><th>Project</th><th>Client</th><th>Current Contract</th><th
                >Paid</th
              ><th>Outstanding</th></tr
            ></thead
          ><tbody
            >{#each outstanding as item}<tr
                ><td
                  ><a class="link" href={`#/projects/${item.project.id}`}
                    >{item.project.id}</a
                  ></td
                ><td>{item.project.client}</td><td class="mono"
                  >{money(item.value)}</td
                ><td class="mono success">{money(item.paid)}</td><td
                  class="mono warning"><b>{money(item.balance)}</b></td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div></Card
    >
  </div>{/if}
