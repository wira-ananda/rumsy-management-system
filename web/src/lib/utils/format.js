// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.

export function clone(x) {
	return JSON.parse(JSON.stringify(x));
}

export function uid(p) {
	return `${p}-${Date.now().toString(36).toUpperCase()}`;
}

export function esc(s = '') {
	return String(s).replace(
		/[&<>'"]/g,
		(m) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				"'": '&#039;',
				'"': '&quot;',
			})[m],
	);
}

export function money(n) {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0,
	}).format(Number(n) || 0);
}

export function num(n) {
	return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
}

export function pct(n) {
	return `${Number(n) || 0}%`;
}

export function date(s) {
	if (!s) return '-';
	return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

export function nowLabel() {
	return (
		'10 Aug 2026 • ' +
		new Date().toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
		})
	);
}

export function nowIso() {
	return new Date().toISOString();
}

export function dt(v) {
	if (!v) return '-';
	let d = new Date(v);
	return isNaN(d)
		? esc(v)
		: d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
