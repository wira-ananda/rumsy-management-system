export function publicProject(p: any) {
  return {
    id: p.id,
    name: p.name,
    client: p.client,
    location: p.location,
    status: p.status,
    progress: Number(p.progress || 0),
    startDate: p.startDate || "",
    targetFinish: p.targetFinish || "",
    updatedAt: (p.activity || [])[0]?.at || "",
    daily: (p.progressDaily || [])
      .filter((r: any) => r.published !== false)
      .map((r: any) => ({
        id: r.id,
        date: r.date || "",
        progress: Number(r.progress || 0),
        activities: r.activities || "",
        issues: r.issues || "",
        nextPlan: r.nextPlan || "",
        fileId: r.fileId || "",
        fileName: r.fileName || "",
        photos: r.photos || [],
      })),
    weekly: (p.progressWeekly || [])
      .filter((r: any) => r.published !== false)
      .map((r: any) => ({
        id: r.id,
        start: r.start || "",
        end: r.end || "",
        progress: Number(r.progress || 0),
        targetProgress: Number(r.targetProgress || 0),
        activities: r.activities || "",
        issues: r.issues || "",
        nextPlan: r.nextPlan || "",
        fileId: r.fileId || "",
        fileName: r.fileName || "",
      })),
  };
}
