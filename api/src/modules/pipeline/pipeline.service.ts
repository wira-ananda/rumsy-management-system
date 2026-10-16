export function getProject(state: any, leadId: any) {
  return (state.projects || []).find((p: any) => p.leadId === leadId);
}

export function hasBast(p: any) {
  return (p?.documents || []).some(
    (d: any) => d.type === "BAST" && d.status === "FINAL" && d.name,
  );
}

export function qcReady(p: any) {
  return (p?.qcFindings || []).every((q: any) => q.status === "CLOSED");
}

export function hotReady(l: any) {
  const hot = [
    "Survey selesai",
    "Proposal/RAB dikirim",
    "Meeting penawaran selesai",
  ];
  return (
    !!String(l.need || "").trim() &&
    !!String(l.location || "").trim() &&
    Number(l.estRab || 0) > 0 &&
    !!String(l.sales || "").trim() &&
    !!String(l.nextFollowUp || "").trim() &&
    (l.milestones || []).some((x: any) => hot.includes(x))
  );
}

export function stageFor(l: any, p: any) {
  if (l.pipelineSide || l.stage === "HOLD_BATAL") return "HOLD_BATAL";
  if (p) {
    const dpG = (p.transactions || []).some(
      (t: any) => t.type === "DP_GAMBAR" && t.status === "VERIFIED",
    );
    const dpP = (p.transactions || []).some(
      (t: any) => t.type === "DP_PROYEK" && t.status === "VERIFIED",
    );
    if (
      p.completionApproved &&
      Number(p.progress) >= 100 &&
      hasBast(p) &&
      qcReady(p)
    )
      return "SELESAI";
    if (
      p.started &&
      p.handover?.status === "ACCEPTED" &&
      p.contract?.status === "SIGNED" &&
      dpP
    )
      return "PEMBANGUNAN";
    if (dpP) return "DP_PROYEK";
    if (dpG) return "DP_GAMBAR";
  }
  return hotReady(l) ? "HOT" : "WARM";
}

export function recomputePipeline(state: any) {
  for (const l of state.leads || [])
    l.stage = stageFor(l, getProject(state, l.id));
}
