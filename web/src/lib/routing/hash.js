// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.

export function parseRoute() {
	let h = location.hash.replace(/^#\/?/, '');
	if (!h) return { page: 'dashboard' };
	let a = h.split('/');
	if (a[0] === 'projects' && a[1])
		return {
			page: 'project',
			id: decodeURIComponent(a[1]),
			tab: a[2] || 'overview',
		};
	if (a[0] === 'leads' && a[1])
		return { page: 'lead-detail', id: decodeURIComponent(a[1]) };
	if (a[0] === 'clients' && a[1])
		return { page: 'client-detail', id: decodeURIComponent(a[1]) };
	return { page: a[0] };
}

export function camel(s) {
	return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
