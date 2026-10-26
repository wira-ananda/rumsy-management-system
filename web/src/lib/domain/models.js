// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import {
	currentActor,
	suggestedReviewer,
	userByName,
	visibleLeads,
	visibleProjects,
} from '../access/permissions.js';
import { TODAY } from '../constants/catalog.js';
import { save } from '../services/api.js';
import { addLeadChat, addProjectChat } from '../services/chat.js';
import { runtime } from '../stores/runtime.js';
import { nowLabel, uid } from '../utils/format.js';
import { leadNeedLabel } from './lead-terms.ts';

export function currentContract(p) {
	return (
		p.originalContract +
		p.addendums
			.filter((a) => ['APPROVED', 'SIGNED'].includes(a.status))
			.reduce((s, a) => s + Number(a.value || 0), 0)
	);
}

export function verifiedPaid(p) {
	return p.transactions
		.filter((t) => t.status === 'VERIFIED')
		.reduce((s, t) => s + Number(t.amount || 0), 0);
}

export function installmentPaid(p, ins) {
	return p.transactions
		.filter((t) => t.installmentId === ins.id && t.status === 'VERIFIED')
		.reduce((s, t) => s + Number(t.amount || 0), 0);
}

export function installmentStatus(p, ins) {
	let paid = installmentPaid(p, ins),
		due = Number(ins.dueAmount);
	if (paid >= due) return 'PAID';
	if (paid > 0) return ins.due < TODAY ? 'OVERDUE' : 'PARTIAL';
	if (ins.due < TODAY) return 'OVERDUE';
	if (ins.due === TODAY) return 'DUE';
	return 'UPCOMING';
}

export function allTransactions() {
	return runtime.data.projects.flatMap((p) =>
		p.transactions.map((t) => ({
			...t,
			projectId: p.id,
			projectName: p.name,
			client: p.client,
		})),
	);
}

export function allFindings() {
	return runtime.data.projects.flatMap((p) =>
		p.qcFindings.map((q) => ({ ...q, projectId: p.id, projectName: p.name })),
	);
}

export function allInspections() {
	return runtime.data.projects.flatMap((p) =>
		p.inspections.map((i) => ({ ...i, projectId: p.id, projectName: p.name })),
	);
}

export function metrics() {
	let ps = visibleProjects(),
		trs = ps.flatMap((p) => p.transactions),
		contract = ps.reduce((s, p) => s + currentContract(p), 0),
		paid = trs
			.filter((t) => t.status === 'VERIFIED')
			.reduce((s, t) => s + Number(t.amount), 0),
		q = ps.flatMap((p) => p.qcFindings);
	return {
		projects: ps.length,
		active: ps.filter((p) => p.status !== 'COMPLETED').length,
		contract,
		paid,
		outstanding: contract - paid,
		pending: trs.filter((t) => t.status === 'PENDING_VERIFICATION').length,
		qc: q.filter((x) => x.status !== 'CLOSED').length,
		qcOver: q.filter((x) => x.status === 'OVERDUE').length,
		follow: visibleLeads().filter(
			(l) =>
				l.nextFollowUp &&
				l.nextFollowUp <= TODAY &&
				!['SELESAI', 'HOLD_BATAL'].includes(l.stage),
		).length,
	};
}

export function addAudit(actor, entity, entityId, action, detail) {
	runtime.data.audit.unshift({
		at:
			'2026-08-10 ' +
			new Date().toLocaleTimeString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
			}),
		actor,
		entity,
		entityId,
		action,
		detail,
	});
}

export function addProjectActivity(p, actor, text) {
	p.activity.unshift({ at: nowLabel(), actor, text });
}

export function leadById(id) {
	return runtime.data.leads.find((l) => l.id === id);
}

export function projectById(id) {
	return runtime.data.projects.find((p) => p.id === id);
}

export function projectForLead(id) {
	return runtime.data.projects.find((p) => p.leadId === id);
}

export function projectClientUrl(p) {
	return p.clientPortal?.token
		? `${location.origin}/client.html?token=${encodeURIComponent(p.clientPortal.token)}`
		: '';
}

export function makeClientToken() {
	return (crypto.randomUUID() + crypto.randomUUID()).replaceAll('-', '');
}

export function ensureDataShape() {
	runtime.data.correspondence ??= [];
	runtime.data.salesDailyReports ??= [];
	runtime.data.leads ??= [];
	runtime.data.clients ??= [];
	runtime.data.projects ??= [];
	runtime.data.tasks ??= [];
	runtime.data.leads.forEach((l) => {
		l.milestones ??= [];
		l.chat ??= [
			{
				id: uid('CHAT'),
				actor: 'System',
				role: 'SYSTEM',
				text: `Thread internal lead ${l.client} aktif.`,
				attachment: '',
				at: 'System',
				system: true,
			},
		];
		l.pipelineSide ??= '';
		l.previousStage ??= '';
	});
	runtime.data.projects.forEach((p) => {
		p.transactions ??= [];
		p.installments ??= [];
		p.addendums ??= [];
		p.documents ??= [];
		p.inspections ??= [];
		p.qcFindings ??= [];
		p.activity ??= [];
		p.progressDaily ??= [];
		p.progressWeekly ??= [];
		p.clientPortal ??= { enabled: false, token: '', createdAt: '' };
		p.chat ??= [
			{
				id: uid('CHAT'),
				actor: 'System',
				role: 'SYSTEM',
				text: `Thread internal project ${p.id} aktif.`,
				attachment: '',
				at: 'System',
				system: true,
			},
		];
		p.handover ??= {
			status: 'DRAFT',
			submittedAt: '',
			reviewedAt: '',
			note: '',
		};
		p.contract ??= {
			number: '',
			date: '',
			status: 'DRAFT',
			dp: 0,
			margin: 0,
			tenor: 0,
		};
		p.targetFinish ??= '';
		p.startDate ??= '';
		p.ops ??= 'Manager Operasional';
		p.qc ??= 'QC Teknis';
		if (!p.opsUserId) {
			let u = userByName(p.ops);
			if (u) p.opsUserId = u.id;
		}
		if (!p.qcUserId) {
			let u = userByName(p.qc);
			if (u) p.qcUserId = u.id;
		}
		if (!p.salesUserId) {
			let u = userByName(p.sales);
			if (u) p.salesUserId = u.id;
		}
	});
	runtime.data.tasks.forEach((t) => {
		t.description ??= '';
		t.startDate ??= '';
		t.due ??= '';
		t.submittedAt ??= '';
		t.completedAt ??= '';
		t.reviewNote ??= '';
		t.revisionCount ??= 0;
		t.emailStatus ??= '';
		if (!t.picUserId) {
			let u = userByName(t.pic);
			if (u) t.picUserId = u.id;
		}
		if (!t.reviewerUserId && t.picUserId) {
			let r = suggestedReviewer(t.picUserId);
			if (r) {
				t.reviewerUserId = r.id;
				t.reviewerName = r.name;
			}
		}
	});
}

export function ensureClientForLead(l) {
	let c = runtime.data.clients.find(
		(x) => x.name === l.client || x.phone === l.phone,
	);
	if (c) return c;
	c = {
		id: uid('CL'),
		name: l.client,
		phone: l.phone,
		email: '',
		address: l.location,
		notes: `Dibuat otomatis dari ${l.id}`,
	};
	runtime.data.clients.push(c);
	return c;
}

export function ensureProjectForLead(l) {
	let p = projectForLead(l.id);
	if (p) return p;
	let c = ensureClientForLead(l);
	p = {
		id: `RMS-PRJ-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
		clientId: c.id,
		leadId: l.id,
		name: `${leadNeedLabel(l)} - ${l.client}`,
		client: l.client,
		location: l.location,
		sales: l.sales,
		salesUserId: userByName(l.sales)?.id || '',
		ops: 'Manager Operasional',
		opsUserId:
			runtime.userDirectory.find((u) => u.role === 'MANAGER_OPERASIONAL')?.id ||
			'',
		qc: 'QC Teknis',
		qcUserId:
			runtime.userDirectory.find((u) => u.role === 'QC_TEKNIS')?.id || '',
		status: 'PREPARATION',
		progress: 0,
		originalContract: Number(l.estRab || 0),
		startDate: '',
		targetFinish: '',
		actualFinish: '',
		contract: {
			number: '',
			date: TODAY,
			status: 'DRAFT',
			dp: Number(l.dp || 0),
			margin: Number(l.margin || 0),
			tenor: Number.isInteger(l.tenorYears) && l.tenorYears >= 1 && l.tenorYears <= 15 ? l.tenorYears * 12 : 36,
		},
		handover: { status: 'DRAFT', submittedAt: '', reviewedAt: '', note: '' },
		started: false,
		completionApproved: false,
		transactions: [],
		installments: [],
		addendums: [],
		documents: [],
		inspections: [],
		qcFindings: [],
		progressDaily: [],
		progressWeekly: [],
		clientPortal: { enabled: false, token: '', createdAt: '' },
		activity: [],
		chat: [],
	};
	runtime.data.projects.unshift(p);
	addProjectActivity(
		p,
		currentActor(),
		`Dossier project dibuat otomatis dari ${l.id}.`,
	);
	addProjectChat(
		p,
		'System',
		`Project dossier dibuat dari lead ${l.client}.`,
		true,
	);
	addLeadChat(
		l,
		'System',
		`Project dossier ${p.id} dibuat dan ditautkan ke lead.`,
		true,
	);
	addAudit(
		currentActor(),
		'PROJECT',
		p.id,
		'CREATE_FROM_LEAD',
		`Dibuat dari ${l.id}`,
	);
	save();
	return p;
}
