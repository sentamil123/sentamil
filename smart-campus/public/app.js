const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = { page: 'overview', students: [], notices: [], tasks: [], overview: null, search: '', department: '' };
const pageNames = { overview:'Overview', students:'Students', attendance:'Attendance', academics:'Academics', notices:'Notices & events', tasks:'Operations', departments:'Departments', reports:'Reports & insights' };
const initials = name => String(name || '').split(/\s+/).slice(0,2).map(x=>x[0] || '').join('').toUpperCase();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, options={}) {
  const res = await fetch(url, { headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2800); }
function metric(title,value,icon,foot,trend='') { return `<article class="metric-card"><div class="metric-top"><span>${title}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot"><span class="trend ${trend==='warn'?'warn':''}">${trend==='warn'?'!':'↗'} ${foot.split('|')[0]}</span><span>${foot.split('|')[1]||''}</span></div></article>`; }
function studentRows(students) {
  if (!students.length) return '<tr><td colspan="5"><div class="empty-state">No students match this search.</div></td></tr>';
  return students.map(s=>`<tr><td><div class="student-name"><span class="student-avatar">${esc(initials(s.name))}</span><span>${esc(s.name)}<small class="student-id">${esc(s.id)}</small></span></div></td><td>${esc(s.department)}</td><td>${esc(s.year)}</td><td><div class="attendance-cell"><span>${Number(s.attendance)}%</span><span class="mini-track"><i class="${s.attendance<75?'risk':''}" style="width:${Number(s.attendance)}%"></i></span></div></td><td><span class="status ${s.attendance<75?'risk':''}">${s.attendance<75?'At risk':'Active'}</span></td></tr>`).join('');
}
function sectionHead(kicker,title,desc,button='') { return `<div class="section-heading"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2><p>${desc}</p></div>${button}</div>`; }
function tablePanel(title,desc,students,link=true) {
  return `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><p>${desc}</p></div>${link?'<button class="text-link" data-go="students">View directory →</button>':''}</div><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>DEPARTMENT</th><th>YEAR</th><th>ATTENDANCE</th><th>STATUS</th></tr></thead><tbody>${studentRows(students)}</tbody></table></div></section>`;
}
function overviewPage() {
 const o=state.overview||{students:6,faculty:86,departments:8,attendance:84,atRisk:1,notices:3,tasksOpen:2,weeklyAttendance:[84,88,82,91,87,93,89],departmentData:[]};
 const bars=o.weeklyAttendance.map((v,i)=>`<div class="bar-col"><div class="bar-pair"><div class="bar" style="height:${Math.max(8,v-12)}%"></div><div class="bar primary" style="height:${v}%"></div></div><span class="bar-label">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span></div>`).join('');
 const depts=o.departmentData.map(d=>`<div class="dept-row"><span class="dept-name">${esc(d.name)}</span><span class="dept-track"><span class="dept-fill" style="display:block;width:${d.value}%"></span></span><b class="dept-value">${d.value}%</b></div>`).join('');
 const activities=state.notices.slice(0,3).map((n,i)=>`<div class="activity"><span class="activity-icon">${['▤','✦','◷'][i]}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><time>${esc(n.date)} · ${esc(n.category)}</time></div></div>`).join('');
 return `<div class="metric-grid">${metric('Total students',o.students,'♙','8.2%|vs last semester')}${metric('Faculty members',o.faculty,'♧','4 new|this semester')}${metric('Average attendance',o.attendance+'%','◷','2.4%|this week')}${metric('Attendance alerts',o.atRisk,'⚑',o.atRisk+' students|below 75%','warn')}</div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Attendance overview</h2><p>Daily campus attendance · this week</p></div><div class="chart-legend"><span><i class="legend-dot"></i>Present</span></div></div><div class="bar-chart">${bars}</div><p class="data-note">Illustrative trend based on demo records · values may be updated for testing.</p></section><section class="panel"><div class="panel-head"><div><h2>Department performance</h2><p>Average attendance by department</p></div><button class="text-link" data-go="departments">Details →</button></div><div class="dept-list">${depts}</div></section></div>
 <div class="dashboard-grid"><div>${tablePanel('Student directory','Recently active student records',state.students.slice(0,5))}</div><section class="panel"><div class="panel-head"><div><h2>Campus updates</h2><p>Latest notices and announcements</p></div><button class="text-link" data-go="notices">All notices →</button></div><div class="activity-list">${activities||'<p class="data-note">No notices yet.</p>'}</div></section></div>`;
}
function studentsPage(attendanceOnly=false) {
 const rows=state.students.filter(s=>(!state.search||[s.name,s.id,s.email,s.department].some(v=>String(v).toLowerCase().includes(state.search.toLowerCase())))&&(!state.department||s.department===state.department));
 const depts=[...new Set(state.students.map(s=>s.department))];
 const btn=attendanceOnly?'<button class="btn btn-light" id="exportAttendance">↓ Export attendance</button>':'<button class="btn btn-primary" id="addStudentInside">＋ Add student</button>';
 return `${sectionHead(attendanceOnly?'ACADEMIC MONITORING':'CAMPUS DIRECTORY',attendanceOnly?'Attendance monitoring':'Student directory',attendanceOnly?'Identify low attendance and review class participation.':'Manage enrolment records across departments.',btn)}
 <div class="metric-grid">${metric('Students shown',rows.length,'♙','filtered|records')}${metric('Average attendance',Math.round(rows.reduce((n,s)=>n+s.attendance,0)/Math.max(rows.length,1))+'%','◷','all visible|students')}${metric('Below 75%',rows.filter(s=>s.attendance<75).length,'⚑','needs follow-up','warn')}${metric('Departments',depts.length,'▦','represented|in this list')}</div>
 <section class="panel"><div class="filter-row"><input id="studentSearch" placeholder="Search name, student ID, department…" value="${esc(state.search)}"><select id="departmentFilter"><option value="">All departments</option>${depts.map(d=>`<option ${state.department===d?'selected':''}>${esc(d)}</option>`).join('')}</select></div><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>DEPARTMENT</th><th>YEAR</th><th>ATTENDANCE</th><th>STATUS</th></tr></thead><tbody>${studentRows(rows)}</tbody></table></div><p class="data-note">Demo directory · use fictional records only. Attendance values can be edited through the API in this prototype.</p></section>`;
}
function noticesPage() { return `${sectionHead('CAMPUS COMMUNICATION','Notices & events','Keep students and faculty informed with a central announcement board.','<button class="btn btn-primary" id="addNoticeBtn">＋ New notice</button>')}<div class="notice-list">${state.notices.map(n=>`<article class="notice-card"><div class="notice-symbol">▧</div><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><div class="notice-meta"><span>${esc(n.category)}</span> Published ${esc(n.date)}</div></div></article>`).join('')||'<div class="panel empty-state">No notices have been published.</div>'}</div><p class="data-note">Notices are stored in the current demo data store.</p>`; }
function academicsPage() { return `${sectionHead('ACADEMIC PLANNER','Today’s timetable','A sample class schedule for campus planning.')}<section class="panel"><div class="panel-head"><div><h2>Monday schedule</h2><p>Information Technology · sample timetable</p></div><span class="pill">4 CLASSES</span></div><div class="timetable">${state.timetable.map(t=>`<div class="time-row"><div class="time-stamp">${esc(t.time)}</div><div><div class="class-name">${esc(t.subject)}</div><div class="class-faculty">${esc(t.faculty)}</div></div><div class="room-tag">${esc(t.room)}</div></div>`).join('')}</div></section>`; }
function tasksPage() { return `${sectionHead('CAMPUS OPERATIONS','Operations checklist','Track routine tasks for academic and administrative teams.')}<section class="panel"><div class="panel-head"><div><h2>Team task board</h2><p>Tick tasks to update the demo workspace.</p></div><span class="pill">${state.tasks.filter(t=>!t.done).length} OPEN</span></div>${state.tasks.map(t=>`<div class="task-row"><input class="task-check" type="checkbox" data-task="${t.id}" ${t.done?'checked':''} aria-label="Mark ${esc(t.title)} complete"><span class="task-text ${t.done?'done':''}">${esc(t.title)}</span><span class="task-owner">${esc(t.owner)}</span></div>`).join('')}</section>`; }
function departmentsPage() {
 const names=['Information Technology','Computer Science','Electronics','Mechanical','Civil','Business Administration','Science','Humanities'];
 const values=[88,92,81,85,79,90,86,84];
 return `${sectionHead('ACADEMIC STRUCTURE','Departments','A high-level view of the institution’s academic units.')}<div class="dept-cards">${names.map((d,i)=>`<article class="dept-card"><span class="dept-card-icon">${['⌘','▤','ϟ','⚙','⌂','▥','⚗','✦'][i]}</span><h3>${d}</h3><p>Department performance snapshot</p><strong>${values[i]}%</strong><small>Illustrative attendance average</small><div class="dept-track" style="margin-top:15px"><div class="dept-fill" style="width:${values[i]}%"></div></div></article>`).join('')}</div><p class="data-note">Department counts and percentages are illustrative placeholders, not official institutional data.</p>`;
}
function reportsPage() {
 const o=state.overview;
 return `${sectionHead('INSIGHTS & EXPORTS','Reports & insights','Download demo data for review, analysis, or project demonstration.')}<div class="report-grid"><article class="report-card"><span class="metric-icon">♙</span><h3>Student directory</h3><p>Export student demo records and attendance figures as CSV.</p><div class="report-stat">${state.students.length}</div><p>Sample student records</p><button class="btn btn-primary" data-export="students">↓ Download student CSV</button></article><article class="report-card"><span class="metric-icon">◷</span><h3>Attendance risk report</h3><p>Review students whose attendance is below the 75% threshold.</p><div class="report-stat">${state.students.filter(s=>s.attendance<75).length}</div><p>Students flagged for follow-up</p><button class="btn btn-primary" data-export="risk">↓ Download risk CSV</button></article><article class="report-card"><span class="metric-icon">▧</span><h3>Notice archive</h3><p>Download the latest announcements from the demo notice board.</p><div class="report-stat">${state.notices.length}</div><p>Sample notices</p><button class="btn btn-light" data-export="notices">↓ Download notices CSV</button></article><article class="report-card"><span class="metric-icon">✓</span><h3>Operations summary</h3><p>See outstanding campus tasks in this workspace.</p><div class="report-stat">${state.tasks.filter(t=>!t.done).length}</div><p>Open tasks</p><button class="btn btn-light" data-export="tasks">↓ Download tasks CSV</button></article></div><p class="data-note">Reports contain only demo records. Verify totals against an authoritative source before operational use.</p>`;
}
function render() {
 $('#crumb').textContent=pageNames[state.page]; $('#pageTitle').innerHTML=({overview:'Good morning, Admin <span>✳</span>',students:'Student directory',attendance:'Attendance overview',academics:'Academic planner',notices:'Campus communications',tasks:'Campus operations',departments:'Academic departments',reports:'Campus insights'})[state.page];
 $('#pageSubtitle').textContent=({overview:'Here’s what’s happening across your campus today.',students:'Find and review student records in one workspace.',attendance:'Spot attendance risks before they become academic issues.',academics:'Keep teaching schedules clear and accessible.',notices:'Share important updates with your campus community.',tasks:'Keep administrative work visible and organised.',departments:'An overview of academic units and their performance.',reports:'Turn campus records into useful, downloadable summaries.'})[state.page];
 $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));
 const pages={overview:overviewPage,students:()=>studentsPage(false),attendance:()=>studentsPage(true),academics:academicsPage,notices:noticesPage,tasks:tasksPage,departments:departmentsPage,reports:reportsPage};
 $('#pageContent').innerHTML=pages[state.page]();
 $('#studentNavCount').textContent=state.students.length;
}
async function load() {
 try {
  const [overview,students,notices,tasks,timetable,health]=await Promise.all([api('/api/overview'),api('/api/students'),api('/api/notices'),api('/api/tasks'),api('/api/timetable'),api('/api/health')]);
  Object.assign(state,{overview,students,notices,tasks,timetable});
  $('#apiStatus').textContent=health.ok?'connected':'offline';
 } catch(e) { $('#apiStatus').textContent='offline'; $('#pageContent').innerHTML='<section class="panel empty-state">Unable to connect to the demo API. Please refresh in a moment.</section>'; throw e; }
 render();
}
function csvDownload(name, rows) {
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}
function exportData(type='students') {
 const map={
 students:[['Student ID','Name','Department','Year','Email','Attendance %','Status'],...state.students.map(s=>[s.id,s.name,s.department,s.year,s.email,s.attendance,s.attendance<75?'At risk':'Active'])],
 risk:[['Student ID','Name','Department','Attendance %'],...state.students.filter(s=>s.attendance<75).map(s=>[s.id,s.name,s.department,s.attendance])],
 notices:[['Title','Category','Date','Details'],...state.notices.map(n=>[n.title,n.category,n.date,n.body])],
 tasks:[['Task','Owner','Completed'],...state.tasks.map(t=>[t.title,t.owner,t.done?'Yes':'No'])]
 };
 csvDownload('smart-campus-'+type+'-demo.csv',map[type]||map.students); toast('CSV report downloaded');
}
function openStudentModal() { $('#modalBackdrop').hidden=false; $('#studentForm').reset(); setTimeout(()=>$('#studentForm input[name="name"]').focus(),50); }
function closeStudentModal() { $('#modalBackdrop').hidden=true; }
async function addNotice() {
 const title=prompt('Notice title (demo only):'); if(!title||!title.trim())return;
 const category=prompt('Category (e.g. Academic, Events, Campus):','Academic'); if(!category||!category.trim())return;
 const body=prompt('Notice details:'); if(!body||!body.trim())return;
 try { await api('/api/notices',{method:'POST',body:JSON.stringify({title,category,body})}); await load(); toast('Notice published in demo workspace'); } catch(e){toast(e.message);}
}
document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-page]'); if(nav){state.page=nav.dataset.page;state.search='';state.department='';render();$('#sidebar').classList.remove('open');return;}
 const go=e.target.closest('[data-go]');if(go){state.page=go.dataset.go;render();return;}
 if(e.target.closest('#addStudentBtn')||e.target.closest('#addStudentInside')){openStudentModal();return;}
 if(e.target.closest('#closeModal')||e.target.closest('#cancelModal')||e.target.id==='modalBackdrop'){closeStudentModal();return;}
 if(e.target.closest('#exportBtn')){exportData('students');return;}
 if(e.target.closest('#noticeShortcut')){state.page='notices';render();return;}
 if(e.target.closest('#addNoticeBtn')){addNotice();return;}
 if(e.target.closest('#mobileMenu')){$('#sidebar').classList.toggle('open');return;}
 if(e.target.closest('#dismissBanner')){$('.demo-banner').remove();return;}
 const exp=e.target.closest('[data-export]');if(exp){exportData(exp.dataset.export);return;}
 if(e.target.closest('#exportAttendance')){exportData('risk');return;}
});
document.addEventListener('input',e=>{
 if(e.target.id==='studentSearch'){state.search=e.target.value;const pos=e.target.selectionStart;render();const input=$('#studentSearch');input.focus();input.setSelectionRange(pos,pos);return;}
 if(e.target.id==='globalSearch'){state.search=e.target.value;state.page='students';render();return;}
});
document.addEventListener('change',async e=>{
 if(e.target.id==='departmentFilter'){state.department=e.target.value;render();return;}
 const task=e.target.dataset.task;if(task){try{await api('/api/tasks/'+task,{method:'PATCH',body:JSON.stringify({done:e.target.checked})});state.tasks=await api('/api/tasks');render();toast('Task updated');}catch(err){toast(err.message);}}
});
$('#studentForm').addEventListener('submit',async e=>{
 e.preventDefault();const form=new FormData(e.target);const student=Object.fromEntries(form.entries());
 try{await api('/api/students',{method:'POST',body:JSON.stringify(student)});closeStudentModal();state.page='students';state.search='';await load();toast('Student added to demo directory');}catch(err){toast(err.message);}
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}if(e.key==='Escape')closeStudentModal();});
load().catch(()=>{});
