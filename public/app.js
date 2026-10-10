const modal = document.getElementById('modal');
const form = document.getElementById('admissionForm');
const message = document.getElementById('formMessage');
const menuToggle = document.getElementById('menuToggle');
function openModal(programme) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (programme && [...form.elements.programme.options].some(o => o.value === programme)) form.elements.programme.value = programme;
  document.getElementById('modalTitle').focus?.();
}
function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.programme)));
document.getElementById('close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
if (menuToggle) menuToggle.addEventListener('click', () => document.querySelector('.nav nav').classList.toggle('show'));
document.querySelectorAll('.nav nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.nav nav').classList.remove('show')));
function showStep(n) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', el.dataset.step === String(n)));
  document.querySelectorAll('.steps span').forEach((el, i) => el.classList.toggle('active', i < n));
  message.textContent = '';
}
document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => {
  const controls = [...btn.closest('.form-step').querySelectorAll('input,select')];
  if (!controls.every(el => el.reportValidity())) return;
  const next = Number(btn.dataset.next);
  if (next === 3) {
    const d = new FormData(form);
    const labels = {fullName:'Full name',email:'Email address',phone:'Mobile number',programme:'Area of interest',twelthMarks:'Class 12 marks'};
    const review = document.getElementById('review');
    review.replaceChildren();
    Object.keys(labels).forEach(k => {
      const item = document.createElement('div'); item.className = 'review-item';
      const label = document.createElement('span'); label.textContent = labels[k];
      const value = document.createElement('div'); value.textContent = d.get(k);
      item.append(label, value); review.append(item);
    });
  }
  showStep(next);
}));
document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', () => showStep(Number(btn.dataset.prev))));
form.addEventListener('submit', async e => {
  e.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  const oldText = submit.textContent;
  submit.disabled = true; submit.textContent = 'Submitting…';
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/applications', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Could not submit application');
    const success = document.createElement('div'); success.className = 'review-item';
    const heading = document.createElement('h3'); heading.textContent = 'Application received';
    const p = document.createElement('p'); p.textContent = 'Your demo reference number:';
    const ref = document.createElement('h2'); ref.textContent = result.applicationId;
    const note = document.createElement('p'); note.textContent = 'Keep this reference for your records.';
    const done = document.createElement('button'); done.className = 'btn'; done.type = 'button'; done.textContent = 'Done ↗'; done.addEventListener('click', closeModal);
    success.append(heading,p,ref,note,done); form.replaceChildren(success);
  } catch(err) { message.textContent = err.message; }
  finally { submit.disabled = false; if (submit.isConnected) submit.textContent = oldText; }
});
