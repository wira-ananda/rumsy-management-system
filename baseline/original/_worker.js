const ROLES = new Set(['OWNER','HEAD_BU','MANAGER_OPERASIONAL','MANAGER_SALES','MANAGER_QC','ADMIN_GENERAL','SALES_EXECUTIVE','ADMIN_CRM','QC_TEKNIS','HOLDING_FINANCE','HOLDING_PURCHASING','HOLDING_HRD','HOLDING_LEGAL','HOLDING_ARDA','SUPER_ADMIN']);
const PAYMENT_UPLOAD = new Set(['MANAGER_SALES','ADMIN_GENERAL','SALES_EXECUTIVE','ADMIN_CRM','HOLDING_FINANCE','SUPER_ADMIN','HEAD_BU']);
const FINANCE_VERIFY = new Set(['HOLDING_FINANCE','SUPER_ADMIN']);
const SETTINGS_EDIT = new Set(['ADMIN_GENERAL','SUPER_ADMIN']);
const CONTRACT_SIGN = new Set(['HEAD_BU','SUPER_ADMIN']);
const PROJECT_START = new Set(['HEAD_BU','MANAGER_OPERASIONAL','SUPER_ADMIN']);
const HANDOVER_REVIEW = new Set(['MANAGER_OPERASIONAL','SUPER_ADMIN']);
const COMPLETION_APPROVE = new Set(['HEAD_BU','MANAGER_OPERASIONAL','SUPER_ADMIN']);
const ADDENDUM_APPROVE = new Set(['HEAD_BU','SUPER_ADMIN']);
const QC_EDIT = new Set(['HEAD_BU','MANAGER_OPERASIONAL','MANAGER_QC','QC_TEKNIS','SUPER_ADMIN']);
const ESCALATION_EDIT = new Set(['MANAGER_QC','OWNER','SUPER_ADMIN']);
const FILE_DELETE = new Set(['HEAD_BU','MANAGER_OPERASIONAL','ADMIN_GENERAL','SUPER_ADMIN']);

const enc=new TextEncoder();
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function cookieMap(req){const out={};(req.headers.get('cookie')||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1))});return out}
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function fromHex(s){const a=new Uint8Array(s.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(s.slice(i*2,i*2+2),16);return a}
async function sha256(s){return hex(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
async function hashPassword(password,saltHex,iterations){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromHex(saltHex),iterations},key,256);return hex(bits)}
function randomToken(bytes=32){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function safeFileName(s){return String(s||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,120)}
function emailEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]))}
function emailShell(title,body,ctaUrl='',ctaLabel='Buka RMS'){
  const cta=ctaUrl?`<div style="margin:24px 0"><a href="${emailEsc(ctaUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${emailEsc(ctaLabel)}</a></div>`:'';
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#18212f"><div style="max-width:640px;margin:0 auto;padding:28px 14px"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><div style="padding:18px 24px;background:#111827;color:#fff"><div style="font-size:13px;opacity:.75">RUMSY INTERNAL MANAGEMENT SYSTEM</div><div style="font-size:22px;font-weight:800;margin-top:4px">${emailEsc(title)}</div></div><div style="padding:24px;font-size:15px;line-height:1.65">${body}${cta}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #eef0f2;color:#6b7280;font-size:12px">Email otomatis dari RMS Rumsy. Jangan membalas email ini.</div></div></div></div></body></html>`;
}
async function sendEmail(env,to,subject,text,html=''){
  if(!env.RESEND_API_KEY||!env.EMAIL_FROM)return {sent:false,reason:'EMAIL_NOT_CONFIGURED'};
  const recipient=String(to||'').trim();if(!recipient||!recipient.includes('@'))return {sent:false,reason:'INVALID_RECIPIENT'};
  try{
    const payload={from:env.EMAIL_FROM,to:[recipient],subject:String(subject||'RMS Rumsy'),text:String(text||'')};
    if(html)payload.html=html;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','idempotency-key':crypto.randomUUID()},body:JSON.stringify(payload)});
    const out=await r.json().catch(()=>({}));if(!r.ok)return {sent:false,reason:out?.message||`EMAIL_HTTP_${r.status}`};return {sent:true,id:out.id||''};
  }catch(e){return {sent:false,reason:e?.message||'EMAIL_SEND_FAILED'}}
}
function publicProject(p){return {id:p.id,name:p.name,client:p.client,location:p.location,status:p.status,progress:Number(p.progress||0),startDate:p.startDate||'',targetFinish:p.targetFinish||'',updatedAt:(p.activity||[])[0]?.at||'',daily:(p.progressDaily||[]).filter(r=>r.published!==false).map(r=>({id:r.id,date:r.date||'',progress:Number(r.progress||0),activities:r.activities||'',issues:r.issues||'',nextPlan:r.nextPlan||'',fileId:r.fileId||'',fileName:r.fileName||'',photos:r.photos||[] })),weekly:(p.progressWeekly||[]).filter(r=>r.published!==false).map(r=>({id:r.id,start:r.start||'',end:r.end||'',progress:Number(r.progress||0),targetProgress:Number(r.targetProgress||0),activities:r.activities||'',issues:r.issues||'',nextPlan:r.nextPlan||'',fileId:r.fileId||'',fileName:r.fileName||''}))}}

function deepClone(x){return JSON.parse(JSON.stringify(x))}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}

async function sessionUser(req,env){const token=cookieMap(req).rms_session;if(!token)return null;const th=await sha256(token);const row=await env.DB.prepare(`SELECT s.id session_id,s.expires_at,u.id,u.email,u.full_name,u.role,u.scope_name,u.active,u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.active=1`).bind(th).first();return row||null}
async function audit(env,user,req,action,detail=''){try{await env.DB.prepare('INSERT INTO server_audit(user_id,action,detail,ip) VALUES(?,?,?,?)').bind(user?.id||null,action,detail,req.headers.get('cf-connecting-ip')||'').run()}catch{}}
function requireRole(user,set){return user&&set.has(user.role)}

function getProject(state,leadId){return (state.projects||[]).find(p=>p.leadId===leadId)}
function hasBast(p){return (p?.documents||[]).some(d=>d.type==='BAST'&&d.status==='FINAL'&&d.name)}
function qcReady(p){return (p?.qcFindings||[]).every(q=>q.status==='CLOSED')}
function hotReady(l){const hot=['Survey selesai','Proposal/RAB dikirim','Meeting penawaran selesai'];return !!String(l.need||'').trim()&&!!String(l.location||'').trim()&&Number(l.estRab||0)>0&&!!String(l.sales||'').trim()&&!!String(l.nextFollowUp||'').trim()&&(l.milestones||[]).some(x=>hot.includes(x))}
function stageFor(l,p){if(l.pipelineSide||l.stage==='HOLD_BATAL')return'HOLD_BATAL';if(p){const dpG=(p.transactions||[]).some(t=>t.type==='DP_GAMBAR'&&t.status==='VERIFIED');const dpP=(p.transactions||[]).some(t=>t.type==='DP_PROYEK'&&t.status==='VERIFIED');if(p.completionApproved&&Number(p.progress)>=100&&hasBast(p)&&qcReady(p))return'SELESAI';if(p.started&&p.handover?.status==='ACCEPTED'&&p.contract?.status==='SIGNED'&&dpP)return'PEMBANGUNAN';if(dpP)return'DP_PROYEK';if(dpG)return'DP_GAMBAR'}return hotReady(l)?'HOT':'WARM'}
function recomputePipeline(state){for(const l of state.leads||[])l.stage=stageFor(l,getProject(state,l.id));}

function mapById(arr){return new Map((arr||[]).map(x=>[x.id,x]))}
function enforceSensitive(oldState,next,user){const role=user.role;
  // Settings are server guarded.
  if(!SETTINGS_EDIT.has(role)) next.settings=deepClone(oldState.settings);
  // Confidential QC escalation cannot be modified outside its role.
  if(!ESCALATION_EDIT.has(role)) next.escalations=deepClone(oldState.escalations||[]);
  const oldP=mapById(oldState.projects);let newP=mapById(next.projects);
  // Project deletion is restricted and projects with verified finance records are never deletable.
  for(const [id,op] of oldP){if(!newP.has(id)){const hasVerified=(op.transactions||[]).some(t=>t.status==='VERIFIED');if(!['HEAD_BU','SUPER_ADMIN'].includes(role)||hasVerified){next.projects.push(deepClone(op))}}}
  newP=mapById(next.projects);
  for(const [id,np] of newP){const op=oldP.get(id);if(!op){
      // New payments on a newly-created project must still begin pending.
      for(const t of np.transactions||[]){if(!PAYMENT_UPLOAD.has(role)) t.__remove=true; else {t.status='PENDING_VERIFICATION';t.verifiedBy='';t.verifiedAt=''}}
      np.transactions=(np.transactions||[]).filter(t=>!t.__remove);
      continue;
    }
    // Payment: only Finance/Super Admin can change an existing payment status.
    const ot=mapById(op.transactions), nt=mapById(np.transactions);
    for(const [tid,t] of nt){const prev=ot.get(tid);if(prev){if(!FINANCE_VERIFY.has(role)&&t.status!==prev.status){t.status=prev.status;t.verifiedBy=prev.verifiedBy||'';t.verifiedAt=prev.verifiedAt||''}if(prev.status==='VERIFIED'&&!FINANCE_VERIFY.has(role)){t.amount=prev.amount;t.type=prev.type;t.installmentId=prev.installmentId}}
      else {if(!PAYMENT_UPLOAD.has(role)){nt.delete(tid);continue}t.status='PENDING_VERIFICATION';t.verifiedBy='';t.verifiedAt=''}
    }
    np.transactions=[...nt.values()];
    // Contract SIGNED is protected.
    if(op.contract?.status!==np.contract?.status && np.contract?.status==='SIGNED' && !CONTRACT_SIGN.has(role)) np.contract.status=op.contract?.status||'DRAFT';
    // Handover review, project start, completion approval.
    if(op.handover?.status!==np.handover?.status && ['ACCEPTED','RETURNED'].includes(np.handover?.status) && !HANDOVER_REVIEW.has(role)) np.handover=deepClone(op.handover);
    if(!op.started&&np.started&&!PROJECT_START.has(role)) np.started=false;
    if(!op.completionApproved&&np.completionApproved&&!COMPLETION_APPROVE.has(role)) np.completionApproved=false;
    // Addendum approval/signing protected.
    const oa=mapById(op.addendums), na=mapById(np.addendums);for(const [aid,a] of na){const pa=oa.get(aid);if(pa&&pa.status!==a.status&&['APPROVED','SIGNED'].includes(a.status)&&!ADDENDUM_APPROVE.has(role))a.status=pa.status}
    np.addendums=[...na.values()];
    // QC register protected from roles outside QC/Operations.
    if(!QC_EDIT.has(role)){np.inspections=deepClone(op.inspections||[]);np.qcFindings=deepClone(op.qcFindings||[])}
  }
  // Payment deletion guard: verified records cannot disappear except Finance/Super Admin.
  if(!FINANCE_VERIFY.has(role)) for(const [id,op] of oldP){const np=newP.get(id);if(!np)continue;const ids=new Set((np.transactions||[]).map(t=>t.id));for(const t of op.transactions||[])if(t.status==='VERIFIED'&&!ids.has(t.id))np.transactions.push(deepClone(t))}
  // Task workflow: assignee submits, configured reviewer approves or returns for revision.
  const oldTasks=mapById(oldState.tasks||[]),newTasks=mapById(next.tasks||[]);
  for(const [tid,ot] of oldTasks){const nt=newTasks.get(tid);if(!nt){if(!['HEAD_BU','SUPER_ADMIN'].includes(role))next.tasks.push(deepClone(ot));continue}if(nt.status!==ot.status){const isAssignee=String(nt.picUserId||'')===String(user.id),isReviewer=String(nt.reviewerUserId||'')===String(user.id)||role==='SUPER_ADMIN';if(['ON_PROGRESS','SUBMITTED'].includes(nt.status)&&!isAssignee){Object.assign(nt,deepClone(ot));continue}if(['DONE','REVISION'].includes(nt.status)&&!isReviewer){Object.assign(nt,deepClone(ot));continue}}}
  // Audit history may grow but cannot be truncated by normal users.
  if((next.audit||[]).length<(oldState.audit||[]).length)next.audit=deepClone(oldState.audit||[]);
  recomputePipeline(next);
  return next;
}

async function api(req,env,url){const path=url.pathname;
  if(path==='/api/health'&&req.method==='GET'){
    try{const db=await env.DB.prepare('SELECT 1 AS ok').first();const r2=!!env.FILES;return json({ok:true,db:db?.ok===1,r2});}catch(e){return json({ok:false,error:'HEALTHCHECK_FAILED',message:e?.message||String(e)},500)}
  }
  if(path==='/api/auth/login'&&req.method==='POST'){
    const b=await req.json().catch(()=>({}));const email=String(b.email||'').trim().toLowerCase();const password=String(b.password||'');
    const u=await env.DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE AND active=1').bind(email).first();
    if(!u)return json({error:'Email atau password salah.'},401);
    const got=await hashPassword(password,u.password_salt,u.password_iterations);if(got!==u.password_hash){await audit(env,u,req,'LOGIN_FAILED');return json({error:'Email atau password salah.'},401)}
    const token=randomToken(),th=await sha256(token),sid=crypto.randomUUID(),exp=new Date(Date.now()+12*3600*1000).toISOString();
    await env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)').bind(sid,u.id,th,exp).run();await audit(env,u,req,'LOGIN');
    return json({user:{id:u.id,email:u.email,name:u.full_name,role:u.role,scopeName:u.scope_name||u.full_name,mustChangePassword:!!u.must_change_password} },200,{'set-cookie':`rms_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`});
  }
  // Public client portal uses a long random per-project token and exposes only progress reports.
  if(path==='/api/client/project'&&req.method==='GET'){
    const token=String(url.searchParams.get('token')||'');if(token.length<32)return json({error:'LINK_CLIENT_TIDAK_VALID'},404);
    const row=await env.DB.prepare('SELECT data FROM app_state WHERE id=1').first();const state=JSON.parse(row.data),p=(state.projects||[]).find(x=>x.clientPortal?.enabled&&x.clientPortal?.token===token);if(!p)return json({error:'LINK_CLIENT_TIDAK_AKTIF'},404);return json({project:publicProject(p)});
  }
  if(path.startsWith('/api/client/file/')&&req.method==='GET'){
    const id=decodeURIComponent(path.slice('/api/client/file/'.length)),token=String(url.searchParams.get('token')||'');if(token.length<32)return new Response('Not found',{status:404});const row=await env.DB.prepare('SELECT data FROM app_state WHERE id=1').first(),state=JSON.parse(row.data),p=(state.projects||[]).find(x=>x.clientPortal?.enabled&&x.clientPortal?.token===token);if(!p)return new Response('Not found',{status:404});const allowed=new Set([...(p.progressDaily||[]).filter(r=>r.published!==false).flatMap(r=>[r.fileId,...(r.photos||[]).map(x=>x.id)]),...(p.progressWeekly||[]).filter(r=>r.published!==false).flatMap(r=>[r.fileId,...(r.photos||[]).map(x=>x.id)])].filter(Boolean));if(!allowed.has(id))return new Response('Not found',{status:404});const meta=await env.DB.prepare('SELECT * FROM files WHERE id=?').bind(id).first();if(!meta)return new Response('Not found',{status:404});const obj=await env.FILES.get(meta.object_key);if(!obj)return new Response('Not found',{status:404});const h=new Headers();obj.writeHttpMetadata(h);h.set('cache-control','private, no-store');h.set('content-disposition',`inline; filename="${String(meta.original_name).replaceAll('"','')}"`);return new Response(obj.body,{headers:h});
  }
  const user=await sessionUser(req,env);
  if(path==='/api/auth/me') return user?json({user:{id:user.id,email:user.email,name:user.full_name,role:user.role,scopeName:user.scope_name||user.full_name,mustChangePassword:!!user.must_change_password}}):json({error:'UNAUTHENTICATED'},401);
  if(!user)return json({error:'UNAUTHENTICATED'},401);
  if(path==='/api/directory/sales'&&req.method==='GET'){const rows=await env.DB.prepare("SELECT id,email,full_name,scope_name FROM users WHERE role='SALES_EXECUTIVE' AND active=1 ORDER BY full_name").all();return json({sales:(rows.results||[]).map(x=>({id:x.id,email:x.email,name:x.full_name,scopeName:x.scope_name||x.full_name}))});}
  if(path==='/api/directory/users'&&req.method==='GET'){const rows=await env.DB.prepare("SELECT id,email,full_name,role,scope_name FROM users WHERE active=1 ORDER BY full_name").all();return json({users:(rows.results||[]).map(x=>({id:x.id,email:x.email,name:x.full_name,role:x.role,scopeName:x.scope_name||x.full_name}))});}
  if(path==='/api/auth/logout'&&req.method==='POST'){
    const token=cookieMap(req).rms_session;if(token){const th=await sha256(token);await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(th).run()};await audit(env,user,req,'LOGOUT');return json({ok:true},200,{'set-cookie':'rms_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
  }
  if(path==='/api/auth/change-password'&&req.method==='POST'){
    const b=await req.json().catch(()=>({}));const old=String(b.oldPassword||''),nw=String(b.newPassword||'');if(nw.length<10)return json({error:'Password baru minimal 10 karakter.'},400);
    const dbu=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();const got=await hashPassword(old,dbu.password_salt,dbu.password_iterations);if(got!==dbu.password_hash)return json({error:'Password lama salah.'},400);
    const salt=randomToken(18).replace(/[^a-zA-Z0-9]/g,'').slice(0,32);const saltHex=hex(enc.encode(salt));const ph=await hashPassword(nw,saltHex,100000);await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=100000,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(ph,saltHex,user.id).run();await audit(env,user,req,'PASSWORD_CHANGED');return json({ok:true});
  }
  if(path==='/api/notify/task'&&req.method==='POST'){
    const b=await req.json().catch(()=>({})),kind=String(b.kind||''),toId=String(b.toUserId||''),t=b.task||{};if(!['ASSIGNED','SUBMITTED','APPROVED','REVISION'].includes(kind)||!toId)return json({error:'NOTIFY_INVALID'},400);
    const to=await env.DB.prepare('SELECT id,email,full_name FROM users WHERE id=? AND active=1').bind(toId).first();if(!to?.email)return json({sent:false,reason:'USER_EMAIL_NOT_FOUND'});
    const label={ASSIGNED:'Tugas Baru',SUBMITTED:'Tugas Menunggu Pemeriksaan',APPROVED:'Tugas Sudah Di-ACC',REVISION:'Tugas Perlu Dikerjakan Ulang'}[kind],base=env.RMS_URL||url.origin;
    const text=[`Halo ${to.full_name},`,``,label+':',String(t.title||'-'),t.projectId?`Project: ${t.projectId}`:'',t.description?`Deskripsi: ${t.description}`:'',t.startDate?`Mulai: ${t.startDate}`:'',t.due?`Target selesai: ${t.due}`:'',t.reviewerName?`Reviewer: ${t.reviewerName}`:'',t.reviewNote?`Catatan reviewer: ${t.reviewNote}`:'',``,`Buka RMS: ${base}`,``,`Pesan otomatis dari RMS Rumsy.`].filter(Boolean).join('\n');
    const rows=[['Tugas',t.title||'-'],['Project',t.projectId||'-'],['Deskripsi',t.description||'-'],['Mulai',t.startDate||'-'],['Target selesai',t.due||'-'],['Reviewer',t.reviewerName||'-'],['Catatan reviewer',t.reviewNote||'-']];
    const body=`<p>Halo <b>${emailEsc(to.full_name)}</b>,</p><p>${emailEsc(label)}.</p><div style="margin:18px 0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${rows.map(([a,b])=>`<div style="display:flex;border-bottom:1px solid #eef0f2;padding:10px 12px"><div style="width:145px;color:#6b7280">${emailEsc(a)}</div><div style="flex:1;font-weight:600">${emailEsc(b)}</div></div>`).join('')}</div>${kind==='REVISION'?'<p style="color:#b91c1c;font-weight:700">Silakan perbaiki tugas sesuai catatan reviewer lalu ajukan kembali.</p>':''}`;
    const html=emailShell(label,body,base,'Buka RMS & Lihat Tugas');
    const result=await sendEmail(env,to.email,`RMS • ${label} • ${String(t.title||'Task')}`,text,html);await audit(env,user,req,'TASK_EMAIL',`${kind} ${to.email} ${result.sent?'SENT':result.reason}`);return json(result);
  }
  if(path==='/api/admin/email/status'&&req.method==='GET'){
    if(!SETTINGS_EDIT.has(user.role))return json({error:'FORBIDDEN'},403);
    return json({provider:'Resend',configured:!!(env.RESEND_API_KEY&&env.EMAIL_FROM),apiKeyConfigured:!!env.RESEND_API_KEY,fromConfigured:!!env.EMAIL_FROM,from:env.EMAIL_FROM||'',rmsUrl:env.RMS_URL||url.origin});
  }
  if(path==='/api/admin/email/test'&&req.method==='POST'){
    if(!SETTINGS_EDIT.has(user.role))return json({error:'FORBIDDEN'},403);
    const b=await req.json().catch(()=>({})),to=String(b.to||user.email||'').trim();if(!to)return json({error:'EMAIL_REQUIRED'},400);
    const base=env.RMS_URL||url.origin,html=emailShell('Tes Email RMS',`<p>Halo,</p><p>Email ini menandakan bahwa <b>pengiriman email RMS Rumsy sudah aktif</b>.</p><p>Notifikasi Task akan otomatis dikirim ke PIC dan reviewer sesuai workflow.</p>`,base,'Buka RMS');
    const result=await sendEmail(env,to,'RMS Rumsy • Tes Pengiriman Email','Tes pengiriman email RMS Rumsy berhasil. '+base,html);await audit(env,user,req,'EMAIL_TEST',`${to} ${result.sent?'SENT':result.reason}`);return json(result);
  }
  if(path==='/api/state'&&req.method==='GET'){
    const row=await env.DB.prepare('SELECT version,data,updated_at FROM app_state WHERE id=1').first();let state=JSON.parse(row.data);if(!ESCALATION_EDIT.has(user.role))state.escalations=[];return json({version:row.version,data:state,updatedAt:row.updated_at});
  }
  if(path==='/api/state'&&req.method==='PUT'){
    const body=await req.json().catch(()=>null);if(!body||!body.data)return json({error:'Payload tidak valid.'},400);const row=await env.DB.prepare('SELECT version,data FROM app_state WHERE id=1').first();if(Number(body.version)!==Number(row.version))return json({error:'CONFLICT',version:row.version},409);
    const oldState=JSON.parse(row.data), incoming=body.data;if(!ESCALATION_EDIT.has(user.role))incoming.escalations=deepClone(oldState.escalations||[]);const next=enforceSensitive(oldState,incoming,user);const nextVersion=row.version+1;
    const res=await env.DB.prepare('UPDATE app_state SET data=?,version=?,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?').bind(JSON.stringify(next),nextVersion,row.version).run();if(!res.meta.changes)return json({error:'CONFLICT'},409);await audit(env,user,req,'STATE_WRITE',`version ${row.version} -> ${nextVersion}`);return json({ok:true,version:nextVersion});
  }
  if(path==='/api/files'&&req.method==='POST'){
    const form=await req.formData();const file=form.get('file');if(!(file instanceof File))return json({error:'File wajib diunggah.'},400);if(file.size>25*1024*1024)return json({error:'Ukuran file maksimum 25 MB.'},413);
    const entityType=String(form.get('entityType')||'GENERAL').slice(0,40),entityId=String(form.get('entityId')||'').slice(0,100),fid=crypto.randomUUID();const key=`${entityType}/${entityId||'general'}/${Date.now()}-${fid}-${safeFileName(file.name)}`;
    await env.FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'},customMetadata:{uploadedBy:String(user.id),originalName:file.name}});await env.DB.prepare('INSERT INTO files(id,object_key,original_name,content_type,size,entity_type,entity_id,uploaded_by) VALUES(?,?,?,?,?,?,?,?)').bind(fid,key,file.name,file.type||'',file.size,entityType,entityId,user.id).run();await audit(env,user,req,'FILE_UPLOAD',`${entityType}/${entityId} ${file.name}`);return json({id:fid,name:file.name,size:file.size,type:file.type});
  }
  if(path.startsWith('/api/files/')&&req.method==='GET'){
    const id=decodeURIComponent(path.slice('/api/files/'.length));const meta=await env.DB.prepare('SELECT * FROM files WHERE id=?').bind(id).first();if(!meta)return new Response('Not found',{status:404});const obj=await env.FILES.get(meta.object_key);if(!obj)return new Response('Not found',{status:404});const h=new Headers();obj.writeHttpMetadata(h);h.set('cache-control','private, no-store');h.set('content-disposition',`${url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="${String(meta.original_name).replaceAll('"','')}"`);return new Response(obj.body,{headers:h});
  }
  if(path.startsWith('/api/files/')&&req.method==='DELETE'){
    if(!FILE_DELETE.has(user.role))return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(path.slice('/api/files/'.length));const meta=await env.DB.prepare('SELECT * FROM files WHERE id=?').bind(id).first();if(!meta)return json({error:'FILE_NOT_FOUND'},404);await env.FILES.delete(meta.object_key);await env.DB.prepare('DELETE FROM files WHERE id=?').bind(id).run();await audit(env,user,req,'FILE_DELETE',`${meta.entity_type||''}/${meta.entity_id||''} ${meta.original_name||''}`);return json({ok:true});
  }
  if(path==='/api/admin/users'&&req.method==='GET'){
    if(user.role!=='SUPER_ADMIN')return json({error:'FORBIDDEN'},403);const rows=await env.DB.prepare('SELECT id,email,full_name,role,scope_name,active,must_change_password,created_at FROM users ORDER BY full_name').all();return json({users:rows.results});
  }
  if(path==='/api/admin/users'&&req.method==='POST'){
    if(user.role!=='SUPER_ADMIN')return json({error:'FORBIDDEN'},403);const b=await req.json().catch(()=>({}));const email=String(b.email||'').trim().toLowerCase(),name=String(b.fullName||'').trim(),role=String(b.role||''),password=String(b.password||'');if(!email||!name||!ROLES.has(role)||password.length<10)return json({error:'Data user tidak valid. Password minimal 10 karakter.'},400);
    const saltBytes=new Uint8Array(16);crypto.getRandomValues(saltBytes);const saltHex=hex(saltBytes),ph=await hashPassword(password,saltHex,100000);try{await env.DB.prepare('INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations,active,must_change_password) VALUES(?,?,?,?,?,?,100000,1,1)').bind(email,name,role,String(b.scopeName||name),ph,saltHex).run()}catch(e){return json({error:'Email sudah digunakan atau data gagal disimpan.'},400)}await audit(env,user,req,'USER_CREATED',`${email} ${role}`);return json({ok:true});
  }
  if(path.startsWith('/api/admin/users/')&&req.method==='PATCH'){
    if(user.role!=='SUPER_ADMIN')return json({error:'FORBIDDEN'},403);const id=decodeURIComponent(path.slice('/api/admin/users/'.length));const b=await req.json().catch(()=>({}));const name=String(b.fullName||'').trim(),role=String(b.role||''),scope=String(b.scopeName||name).trim(),active=b.active?1:0;if(!name||!ROLES.has(role))return json({error:'Data user tidak valid.'},400);const r=await env.DB.prepare('UPDATE users SET full_name=?,role=?,scope_name=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(name,role,scope,active,id).run();if(!r.meta?.changes)return json({error:'User tidak ditemukan.'},404);await audit(env,user,req,'USER_UPDATED',`${id} ${role} ${scope}`);return json({ok:true});
  }
  return json({error:'NOT_FOUND'},404);
}

export default {async fetch(req,env){const url=new URL(req.url);try{if(url.pathname.startsWith('/api/'))return await api(req,env,url);return env.ASSETS.fetch(req)}catch(e){console.error(e);return json({error:'INTERNAL_ERROR',message:e?.message||String(e)},500)}}};
