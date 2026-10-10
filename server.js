const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'demo-admin-key-change-me';
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'applications.json');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

function readApps() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return []; }
}
function writeApps(apps) { fs.writeFileSync(dataFile, JSON.stringify(apps, null, 2)); }
function adminOnly(req, res, next) {
  if (req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/applications', (req, res) => {
  const fields = ['fullName', 'email', 'phone', 'programme', 'twelthMarks'];
  for (const field of fields) {
    if (!String(req.body[field] || '').trim()) return res.status(400).json({ error: 'Please complete all required fields.' });
  }
  const apps = readApps();
  const application = {
    id: 'NSA-' + Date.now().toString(36).toUpperCase(),
    fullName: String(req.body.fullName).trim(),
    email: String(req.body.email).trim(),
    phone: String(req.body.phone).trim(),
    programme: String(req.body.programme).trim(),
    twelthMarks: String(req.body.twelthMarks).trim(),
    status: 'Received',
    createdAt: new Date().toISOString()
  };
  apps.unshift(application);
  writeApps(apps);
  res.status(201).json({ message: 'Application received', applicationId: application.id });
});
app.get('/api/admin/applications', adminOnly, (_req, res) => res.json(readApps()));
app.patch('/api/admin/applications/:id', adminOnly, (req, res) => {
  const allowed = ['Received', 'Under Review', 'Shortlisted', 'Accepted', 'Rejected'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const apps = readApps();
  const item = apps.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Application not found' });
  item.status = req.body.status; writeApps(apps); res.json(item);
});
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.listen(PORT, () => console.log('Northstar Admissions running on http://localhost:' + PORT));
