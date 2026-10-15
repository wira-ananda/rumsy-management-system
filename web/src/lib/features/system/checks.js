// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import { TODAY, nav, projectTabs, roles } from '../../constants/catalog.js';
import {
	currentContract,
	installmentPaid,
	verifiedPaid,
} from '../../domain/models.js';
import { derivePipelineStage } from '../../domain/pipeline.js';
import { addLeadChat, addProjectChat } from '../../services/chat.js';
import { runtime } from '../../stores/runtime.js';

export function runSelfTests() {
	let tests = [];
	const t = (name, ok, detail = '') => tests.push({ name, ok: !!ok, detail });
	let base = {
		id: 'TEST-LEAD',
		need: 'Rumah',
		location: 'Makassar',
		estRab: 100000000,
		sales: 'Arif',
		nextFollowUp: TODAY,
		milestones: ['Survey selesai'],
		stage: 'WARM',
		pipelineSide: '',
	};
	t(
		'WARM → HOT dengan qualification + milestone',
		derivePipelineStage(base, null) === 'HOT',
	);
	t(
		'Tetap WARM jika milestone belum ada',
		derivePipelineStage({ ...base, milestones: [] }, null) === 'WARM',
	);
	t(
		'HOLD/BATAL tidak dioverride engine',
		derivePipelineStage(
			{ ...base, stage: 'HOLD_BATAL', pipelineSide: 'HOLD' },
			null,
		) === 'HOLD_BATAL',
	);
	let proj = {
		leadId: 'TEST-LEAD',
		transactions: [{ type: 'DP_GAMBAR', status: 'PENDING_VERIFICATION' }],
		contract: { status: 'DRAFT' },
		handover: { status: 'DRAFT' },
		started: false,
		completionApproved: false,
		progress: 0,
		documents: [],
		qcFindings: [],
	};
	t(
		'DP Gambar PENDING tidak menggeser HOT',
		derivePipelineStage(base, proj) === 'HOT',
	);
	proj.transactions[0].status = 'VERIFIED';
	t(
		'HOT → DP GAMBAR hanya setelah VERIFIED',
		derivePipelineStage(base, proj) === 'DP_GAMBAR',
	);
	proj.transactions.push({ type: 'DP_PROYEK', status: 'VERIFIED' });
	t(
		'DP GAMBAR → DP PROYEK setelah DP Proyek VERIFIED',
		derivePipelineStage(base, proj) === 'DP_PROYEK',
	);
	proj.contract.status = 'SIGNED';
	proj.handover.status = 'ACCEPTED';
	proj.started = true;
	t(
		'DP PROYEK → PEMBANGUNAN setelah seluruh start gate',
		derivePipelineStage(base, proj) === 'PEMBANGUNAN',
	);
	proj.progress = 100;
	proj.completionApproved = true;
	t(
		'Progress 100 tanpa BAST belum SELESAI',
		derivePipelineStage(base, proj) === 'PEMBANGUNAN',
	);
	proj.documents = [{ type: 'BAST', status: 'FINAL', name: 'BAST.pdf' }];
	proj.qcFindings = [{ status: 'OPEN' }];
	t(
		'BAST ada tetapi QC Open belum SELESAI',
		derivePipelineStage(base, proj) === 'PEMBANGUNAN',
	);
	proj.qcFindings[0].status = 'CLOSED';
	t(
		'Completion gate lengkap → SELESAI',
		derivePipelineStage(base, proj) === 'SELESAI',
	);
	let fakeP = {
		transactions: [
			{ installmentId: 'I', status: 'VERIFIED', amount: 50 },
			{ installmentId: 'I', status: 'PENDING_VERIFICATION', amount: 50 },
		],
		installments: [],
	};
	t(
		'Installment paid hanya menghitung VERIFIED',
		installmentPaid(fakeP, { id: 'I' }) === 50,
	);
	t(
		'Pending payment tidak dihitung total paid',
		verifiedPaid({
			transactions: [
				{ status: 'VERIFIED', amount: 100 },
				{ status: 'PENDING_VERIFICATION', amount: 900 },
			],
		}) === 100,
	);
	let cp = {
		originalContract: 100,
		addendums: [
			{ status: 'DRAFT', value: 50 },
			{ status: 'APPROVED', value: 25 },
			{ status: 'SIGNED', value: -5 },
		],
	};
	t(
		'Current Contract hanya menghitung addendum Approved/Signed',
		currentContract(cp) === 120,
	);
	let chatLead = { chat: [] };
	addLeadChat(chatLead, 'Tester', 'Halo');
	t(
		'Chat Lead dapat menyimpan pesan',
		chatLead.chat.length === 1 && chatLead.chat[0].text === 'Halo',
	);
	let chatProj = { chat: [] };
	addProjectChat(chatProj, 'Tester', 'Update project');
	t(
		'Chat Project dapat menyimpan pesan',
		chatProj.chat.length === 1 && chatProj.chat[0].text === 'Update project',
	);
	t(
		'Semua lead seed memiliki chat setelah migration',
		runtime.data.leads.every((l) => Array.isArray(l.chat)),
	);
	t(
		'Semua project seed memiliki chat setelah migration',
		runtime.data.projects.every((p) => Array.isArray(p.chat)),
	);
	t('Project 360 mempunyai tab Chat', projectTabs.includes('chat'));
	t(
		'Project 360 mempunyai tab Laporan Progress',
		projectTabs.includes('progress-report'),
	);
	t(
		'Task mendukung reviewer dan actual finish',
		runtime.data.tasks.every(
			(t) => 'completedAt' in t && 'reviewerUserId' in t,
		),
	);
	t('Role catalog memuat 15 role', Object.keys(roles).length === 15);
	t(
		'Data Laporan Harian Sales tersedia',
		Array.isArray(runtime.data.salesDailyReports),
	);
	t(
		'Menu Laporan Harian Sales tersedia',
		nav.some((x) => x.route === 'sales-daily-report'),
	);
	t(
		'Pipeline mempunyai field bisnis Excel',
		runtime.data.leads.every((l) =>
			['need', 'dp', 'margin', 'estGambar', 'estRab', 'estAsstCr'].every(
				(k) => k in l,
			),
		),
	);
	t(
		'Sales tidak mendapat menu Payment Verification',
		!nav
			.find((x) => x.route === 'finance-verification')
			.roles.includes('SALES_EXECUTIVE'),
	);
	t(
		'Finance mendapat menu Payment Verification',
		nav
			.find((x) => x.route === 'finance-verification')
			.roles.includes('HOLDING_FINANCE'),
	);

	return tests;
}
