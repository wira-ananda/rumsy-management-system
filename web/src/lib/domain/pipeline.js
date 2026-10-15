// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import { HOT_MILESTONES, stageNames } from '../constants/catalog.js';
import { addAudit, leadById, projectForLead } from './models.js';
import { save } from '../services/api.js';
import { addLeadChat } from '../services/chat.js';
import { runtime } from '../stores/runtime.js';

export function leadForecastValue(l) {
	const asst = Number(l?.estAsstCr || 0),
		rab = Number(l?.estRab || 0);
	return asst > 0 ? asst : rab > 0 ? rab : 0;
}

export function hotQualification(l) {
	return {
		need: !!String(l.need || '').trim(),
		location: !!String(l.location || '').trim(),
		estRab: Number(l.estRab || 0) > 0,
		sales: !!String(l.sales || '').trim(),
		nextAction: !!String(l.nextFollowUp || '').trim(),
		milestone: (l.milestones || []).some((x) => HOT_MILESTONES.includes(x)),
	};
}

export function finalQcReady(p) {
	return (p.qcFindings || []).every((q) => q.status === 'CLOSED');
}

export function hasFinalBast(p) {
	return (p.documents || []).some(
		(d) => d.type === 'BAST' && d.status === 'FINAL' && d.name,
	);
}

export function derivePipelineStage(l, p = projectForLead(l.id)) {
	if (!l) return 'WARM';
	if (l.pipelineSide || l.stage === 'HOLD_BATAL') return 'HOLD_BATAL';
	if (p) {
		const dpG = (p.transactions || []).some(
			(t) => t.type === 'DP_GAMBAR' && t.status === 'VERIFIED',
		);
		const dpP = (p.transactions || []).some(
			(t) => t.type === 'DP_PROYEK' && t.status === 'VERIFIED',
		);
		if (
			p.completionApproved &&
			Number(p.progress) >= 100 &&
			hasFinalBast(p) &&
			finalQcReady(p)
		)
			return 'SELESAI';
		if (
			p.started &&
			p.handover?.status === 'ACCEPTED' &&
			p.contract?.status === 'SIGNED' &&
			dpP
		)
			return 'PEMBANGUNAN';
		if (dpP) return 'DP_PROYEK';
		if (dpG) return 'DP_GAMBAR';
	} else if (
		['DP_GAMBAR', 'DP_PROYEK', 'PEMBANGUNAN', 'SELESAI'].includes(l.stage)
	) {
		// Seed demo lama dipertahankan sebagai contoh visual jika belum mempunyai dossier Project.
		return l.stage;
	}
	const q = hotQualification(l);
	return q.need &&
		q.location &&
		q.estRab &&
		q.sales &&
		q.nextAction &&
		q.milestone
		? 'HOT'
		: 'WARM';
}

export function recomputeLeadStage(l, withAudit = true) {
	if (!l) return false;
	let target = derivePipelineStage(l),
		prev = l.stage;
	if (prev === target) return false;
	l.stage = target;
	if (withAudit) {
		addAudit(
			'System',
			'PIPELINE',
			l.id,
			'AUTO_MOVE',
			`${prev} → ${target} berdasarkan milestone/event tervalidasi`,
		);
		addLeadChat(
			l,
			'System',
			`Pipeline otomatis berubah ${stageNames[prev] || prev} → ${stageNames[target] || target}.`,
			true,
		);
	}
	return true;
}

export function normalizeLeadStages() {
	let changed = false;
	runtime.data.leads.forEach((l) => {
		if (recomputeLeadStage(l, false)) changed = true;
	});
	if (changed) save();
}

export function syncPipelineForProject(p) {
	let l = leadById(p.leadId);
	if (!l) return false;
	return recomputeLeadStage(l, true);
}



export function nextStageInfo(l) {
	let p = projectForLead(l.id);
	if (l.stage === 'WARM') {
		let q = hotQualification(l),
			missing = [
				!q.need && 'kebutuhan',
				!q.location && 'lokasi',
				!q.estRab && 'Est. RAB',
				!q.sales && 'Sales PIC',
				!q.nextAction && 'next follow-up',
				!q.milestone && 'milestone Survey/Proposal/Meeting',
			].filter(Boolean);
		return {
			next: 'HOT',
			text: missing.length
				? `Lengkapi: ${missing.join(', ')}`
				: 'Qualification siap dievaluasi',
		};
	}
	if (l.stage === 'HOT') {
		let pending = p?.transactions?.find(
			(t) =>
				['DP_GAMBAR', 'DP_PROYEK'].includes(t.type) &&
				t.status === 'PENDING_VERIFICATION',
		);
		return {
			next:
				pending?.type === 'DP_PROYEK' ? 'DP PROYEK' : 'DP GAMBAR / DP PROYEK',
			text: pending
				? `${pending.label} menunggu verifikasi Finance`
				: 'Upload bukti DP lalu Finance melakukan verifikasi',
		};
	}
	if (l.stage === 'DP_GAMBAR') {
		let pending = p?.transactions?.find(
			(t) => t.type === 'DP_PROYEK' && t.status === 'PENDING_VERIFICATION',
		);
		return {
			next: 'DP PROYEK',
			text: pending
				? 'DP Proyek menunggu verifikasi Finance'
				: 'Upload bukti DP Proyek lalu Finance verifikasi',
		};
	}
	if (l.stage === 'DP_PROYEK') {
		if (!p)
			return { next: 'PEMBANGUNAN', text: 'Tautkan/buka Project dossier' };
		let miss = [
			p.contract.status !== 'SIGNED' && 'Contract SIGNED',
			p.handover.status !== 'ACCEPTED' && 'Handover ACCEPTED',
			!p.started && 'Project Start APPROVED',
		].filter(Boolean);
		return {
			next: 'PEMBANGUNAN',
			text: miss.length ? `Menunggu: ${miss.join(', ')}` : 'Start gate lengkap',
		};
	}
	if (l.stage === 'PEMBANGUNAN') {
		if (!p) return { next: 'SELESAI', text: 'Project dossier belum tersedia' };
		let miss = [
			Number(p.progress) < 100 && 'Progress 100%',
			!finalQcReady(p) && 'Final QC Closed',
			!hasFinalBast(p) && 'BAST FINAL',
			!p.completionApproved && 'Completion Approval',
		].filter(Boolean);
		return {
			next: 'SELESAI',
			text: miss.length
				? `Menunggu: ${miss.join(', ')}`
				: 'Completion gate lengkap',
		};
	}
	if (l.stage === 'HOLD_BATAL')
		return {
			next: '-',
			text: `${l.pipelineSide || 'HOLD/BATAL'}: ${l.sideReason || '-'}`,
		};
	return { next: '-', text: 'Pipeline selesai' };
}
