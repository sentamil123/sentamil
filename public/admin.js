const keyInput = document.getElementById('key');
const msg = document.getElementById('msg');
const results = document.getElementById('results');
let adminKey = '';
async function request(url, options = {}) {
  const res = await fetch(url, {...options, headers:{'Content-Type':'application/json','x-admin-key':adminKey,...(options.headers||{})}});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function loadApps() {
  adminKey = keyInput.value;
  try {
    const apps = await request('/api/admin/applications');
    msg.textContent = apps.length + ' application(s) found.';
    results.innerHTML = apps.map(a => '<article class="app"><h3>'+escapeHtml(a.fullName)+'</h3><p>'+escapeHtml(a.email)+' · '+escapeHtml(a.phone)+'<br>'+escapeHtml(a.programme)+' · Class 12: '+escapeHtml(a.twelthMarks)+'<br>Reference: '+escapeHtml(a.id)+' · Submitted: '+new Date(a.createdAt).toLocaleString()+'</p><label>Status <select data-id="'+escapeHtml(a.id)+'">'+['Received','Under Review','Shortlisted','Accepted','Rejected'].map(s=>'<option '+(a.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></label></article>').join('');
    results.querySelectorAll('select').forEach(sel => sel.addEventListener('change', async () => {
      try { await request('/api/admin/applications/'+encodeURIComponent(sel.dataset.id), {method:'PATCH',body:JSON.stringify({status:sel.value})}); msg.textContent = 'Status updated.'; }
      catch(e) { msg.textContent = e.message; }
    }));
  } catch(e) { msg.textContent = e.message; }
}
function escapeHtml(v) { return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
document.getElementById('load').addEventListener('click', loadApps);
