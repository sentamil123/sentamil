const modal = document.getElementById('modal');
const form = document.getElementById('admissionForm');
const message = document.getElementById('formMessage');
function openModal(programme) {
  modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  if (programme) form.elements.programme.value = programme;
}
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.programme)));
document.getElementById('close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function showStep(n) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', el.dataset.step === String(n)));
  document.querySelectorAll('.steps span').forEach((el, i) => el.classList.toggle('active', i < n));
  message.textContent = '';
}
document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
  const current = Number(btn.closest('.form-step').dataset.step);
  const controls = [...btn.closest('.form-step').querySelectorAll('input,select')];
  if (!controls.every(el => el.reportValidity())) return;
  const next = Number(btn.dataset.next);
  if (next === 3) {
    const d = new FormData(form);
    document.getElementById('review').innerHTML = ['fullName','email','phone','programme','twelthMarks'].map(k => {
      const labels = {fullName:'Full name',email:'Email address',phone:'Mobile number',programme:'Programme',twelthMarks:'Class 12 marks'};
      return '<div class="review-item"><span>'+labels[k]+'</span>'+String(d.get(k)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</div>';
    }).join('');
  }
  showStep(next);
}));
document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', () => showStep(Number(btn.dataset.prev))));
form.addEventListener('submit', async e => {
  e.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Submitting…';
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/applications', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Could not submit application');
    form.innerHTML = '<div class="review-item"><strong>Application received!</strong><p>Your demo reference number is:</p><h3>'+result.applicationId+'</h3><p>Keep this reference for your records.</p><button class="btn" type="button" id="done">Done ↗</button></div>';
    document.getElementById('done').addEventListener('click', closeModal);
  } catch(err) { message.textContent = err.message; }
  finally { submit.disabled = false; submit.textContent = 'Submit application ↗'; }
});
