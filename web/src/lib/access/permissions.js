// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import { roles } from '../constants/catalog.js';
import { runtime } from '../stores/runtime.js';

export function getUserOverride(userId) {
	let u = (runtime.data.userAccessOverrides || []).find(
		(x) => String(x.userId) === String(userId),
	);
	return u || { add: [], remove: [] };
}

export function hasCustomPermission(permission, userId = runtime.session.id) {
	let o = getUserOverride(userId);
	if ((o.remove || []).includes(permission)) return false;
	return (o.add || []).includes(permission);
}

export function normSales(s = '') {
	return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function salesDisplay(x) {
	return String(
		x?.scopeName || x?.scope_name || x?.name || x?.full_name || '',
	).trim();
}

export function salesDirectoryNames() {
	return [
		...new Set(
			(runtime.salesDirectory || []).map(salesDisplay).filter(Boolean),
		),
	];
}

export function salesIdentityKeys() {
	let a = [
		runtime.session?.scopeName,
		runtime.session?.name,
		(runtime.session?.email || '').split('@')[0],
	]
		.filter(Boolean)
		.map(normSales);
	return [...new Set(a)];
}

export function belongsToSales(value) {
	let v = normSales(value),
		keys = salesIdentityKeys();
	return !!v && keys.some((k) => v === k || v.includes(k) || k.includes(v));
}

export function visibleLeads() {
	return runtime.session?.role === 'SALES_EXECUTIVE'
		? runtime.data.leads.filter((l) => belongsToSales(l.sales))
		: runtime.data.leads;
}

export function visibleProjects() {
	return runtime.session?.role === 'SALES_EXECUTIVE'
		? runtime.data.projects.filter((p) => belongsToSales(p.sales))
		: runtime.session?.role === 'QC_TEKNIS'
			? runtime.data.projects.filter((p) => p.qc)
			: runtime.data.projects;
}

export function currentActor() {
	return runtime.session?.name || roles[runtime.session?.role] || 'RMS User';
}

export function userById(id) {
	return runtime.userDirectory.find((u) => String(u.id) === String(id));
}

export function userByName(name) {
	let n = String(name || '')
		.trim()
		.toLowerCase();
	return runtime.userDirectory.find(
		(u) =>
			String(u.name || '')
				.trim()
				.toLowerCase() === n ||
			String(u.scopeName || '')
				.trim()
				.toLowerCase() === n,
	);
}



export function supervisorRole(role) {
	return (
		{
			SALES_EXECUTIVE: 'MANAGER_SALES',
			ADMIN_CRM: 'MANAGER_SALES',
			QC_TEKNIS: 'MANAGER_QC',
			MANAGER_OPERASIONAL: 'HEAD_BU',
			MANAGER_SALES: 'HEAD_BU',
			MANAGER_QC: 'HEAD_BU',
			ADMIN_GENERAL: 'HEAD_BU',
			HEAD_BU: 'SUPER_ADMIN',
			HOLDING_FINANCE: 'HEAD_BU',
			HOLDING_PURCHASING: 'HEAD_BU',
			HOLDING_HRD: 'HEAD_BU',
			HOLDING_LEGAL: 'HEAD_BU',
			HOLDING_ARDA: 'HEAD_BU',
			SUPER_ADMIN: 'HEAD_BU',
		}[role] || 'HEAD_BU'
	);
}

export function suggestedReviewer(userId) {
	let u = userById(userId);
	if (!u) return null;
	return (
		runtime.userDirectory.find((x) => x.role === supervisorRole(u.role)) ||
		runtime.userDirectory.find((x) => x.role === 'HEAD_BU') ||
		runtime.userDirectory.find((x) => x.role === 'SUPER_ADMIN') ||
		null
	);
}

export function canEditLead(l) {
	return (
		['HEAD_BU', 'MANAGER_SALES', 'ADMIN_CRM', 'SUPER_ADMIN'].includes(
			runtime.session?.role,
		) ||
		(runtime.session?.role === 'SALES_EXECUTIVE' && belongsToSales(l?.sales))
	);
}

export function canDeleteLead(l) {
	return ['HEAD_BU', 'MANAGER_SALES', 'ADMIN_CRM', 'SUPER_ADMIN'].includes(
		runtime.session?.role,
	);
}

export function canManageSalesDaily(r = null) {
	return (
		['HEAD_BU', 'MANAGER_SALES', 'ADMIN_CRM', 'SUPER_ADMIN'].includes(
			runtime.session?.role,
		) ||
		(runtime.session?.role === 'SALES_EXECUTIVE' &&
			(!r || belongsToSales(r.sales)))
	);
}

export function canSee(item) {
	return item.roles.includes(runtime.session.role);
}

export function canManageProject() {
	return [
		'HEAD_BU',
		'MANAGER_OPERASIONAL',
		'ADMIN_GENERAL',
		'SUPER_ADMIN',
	].includes(runtime.session.role);
}
