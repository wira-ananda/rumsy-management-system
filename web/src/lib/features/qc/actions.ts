import { runtime } from "../../stores/runtime.js";
import { TODAY } from "../../constants/catalog.js";
import { projectById, addAudit } from "../../domain/models.js";
import { save, uploadFile } from "../../services/api.js";
import { openForm, options, projectChoices } from "../../services/forms";
import { showDialog } from "../../stores/dialog";
import VerificationDialog from "../../components/qc/VerificationDialog.svelte";
import { uid } from "../../utils/format.js";
export function inspectionForm() {
  openForm(
    "Buat QC Inspection",
    [
      {
        name: "projectId",
        label: "PROJECT",
        type: "select",
        value: runtime.data!.projects[0]?.id || "",
        options: projectChoices().filter((item) => item.value !== ""),
      },
      { name: "date", label: "DATE", type: "date", value: TODAY },
      {
        name: "category",
        label: "CATEGORY",
        type: "select",
        value: "SIPIL",
        options: options(["SIPIL", "INTERIOR"]),
      },
      { name: "area", label: "AREA", required: true },
      { name: "item", label: "WORK ITEM", required: true },
      {
        name: "result",
        label: "RESULT",
        type: "select",
        value: "PASS",
        options: options(["PASS", "FINDING_CREATED"]),
      },
    ],
    async (form) => {
      const value: any = Object.fromEntries(form),
        project = projectById(value.projectId),
        inspection = {
          id: uid("INSP"),
          date: value.date,
          category: value.category,
          area: value.area,
          item: value.item,
          result: value.result,
          inspector: "QC Teknis",
        };
      project.inspections.unshift(inspection);
      if (value.result === "FINDING_CREATED")
        project.qcFindings.unshift({
          id: uid("QC"),
          inspectionId: inspection.id,
          category: value.category,
          area: value.area,
          item: value.item,
          severity: "MINOR",
          description: "Finding baru dari inspection.",
          pic: "Manager Operasional",
          target: "2026-08-13",
          status: "OPEN",
          beforeName: "",
          afterName: "",
          corrective: "",
        });
      await save();
    },
    { id: "inspForm", submitLabel: "Simpan Inspection" },
  );
}
export function correctiveForm(projectId: string, findingId: string) {
  const project = projectById(projectId),
    finding = project.qcFindings.find((item: any) => item.id === findingId);
  openForm(
    "Submit Corrective Action",
    [
      {
        name: "corrective",
        label: "PERBAIKAN",
        type: "textarea",
        required: true,
        wide: true,
      },
      { name: "after", label: "FOTO AFTER", type: "file" },
    ],
    async (form) => {
      const file = form.get("after") as File,
        up = file?.size
          ? await uploadFile(file, "QC_CORRECTIVE", project.id)
          : null;
      finding.corrective = form.get("corrective");
      finding.afterName = up?.name || "";
      finding.afterFileId = up?.id || "";
      finding.status = "WAITING_VERIFICATION";
      await save();
    },
    { id: "corrForm", submitLabel: "Submit → Waiting Verification" },
  );
}
export function verifyDialog(projectId: string, findingId: string) {
  const project = projectById(projectId),
    finding = project.qcFindings.find((item: any) => item.id === findingId);
  showDialog("QC Verification", VerificationDialog, { finding });
}
export function escalationForm() {
  openForm(
    "Escalate to Super Admin",
    [
      {
        name: "projectId",
        label: "PROJECT",
        type: "select",
        value: runtime.data!.projects[0]?.id || "",
        options: projectChoices().filter((item) => item.value !== ""),
      },
      { name: "subject", label: "SUBJECT", required: true },
      { name: "finding", label: "FINDING" },
      {
        name: "notes",
        label: "NOTES",
        type: "textarea",
        required: true,
        wide: true,
      },
    ],
    async (form) => {
      runtime.data!.escalations.unshift({
        id: uid("ESC"),
        ...Object.fromEntries(form),
        confidential: true,
        status: "SUBMITTED",
        submittedAt: TODAY,
        reviewedAt: "",
      });
      await save();
    },
    { id: "escForm", submitLabel: "Submit Confidential" },
  );
}
export async function closeFinding(finding: any, approved: boolean) {
  finding.status = approved ? "CLOSED" : "ON_PROGRESS";
  if (approved)
    addAudit(
      "QC Teknis",
      "QC_FINDING",
      finding.id,
      "CLOSE",
      "Corrective action verified",
    );
  await save();
}
