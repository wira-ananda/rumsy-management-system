// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import { runtime } from '../stores/runtime.js';
import { nowLabel, uid } from '../utils/format.js';

export function addLeadChat(
	l,
	actor,
	text,
	system = false,
	attachment = '',
	attachmentFileId = '',
) {
	l.chat ??= [];
	let m = {
		id: uid('CHAT'),
		actor,
		role: system ? 'SYSTEM' : runtime.session?.role || '',
		text,
		attachment,
		attachmentFileId,
		at: nowLabel(),
		system,
	};
	l.chat.push(m);
	return m;
}

export function addProjectChat(
	p,
	actor,
	text,
	system = false,
	attachment = '',
	attachmentFileId = '',
) {
	p.chat ??= [];
	let m = {
		id: uid('CHAT'),
		actor,
		role: system ? 'SYSTEM' : runtime.session?.role || '',
		text,
		attachment,
		attachmentFileId,
		at: nowLabel(),
		system,
	};
	p.chat.push(m);
	return m;
}


