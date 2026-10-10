const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'demo-admin-key-change-me';
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'applications.json');
const programmes = new Set([
  'Tamil Language & Literature',
  'Computing & Artificial Intelligence',
  'Business & Management',
  'Engineering & Innovation',
  'Science & Research'
]);

app.disable('x-powered-by');
app.use(express.json({ limit: '30kb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

function readApps() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return []; }
}
function writeApps(apps) { fs.writeFileSync(dataFile, JSON.stringify(apps, null, 2)); }
function clean(value, max = 160) { return String(value || '').trim().slice(0, max); }
function adminOnly(req, res, next) {
  if (!process.env.ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Admin access is not configured or the key is incorrect.' });
  }
  next();
}
app.get('/api/health', (_req, res) => res.json({ status: 'ok', application: 'Tamil Academy' }));
app.post('/api/applications', (req, res) => {
  const fullName = clean(req.body.fullName, 100);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 20);
  const programme = clean(req.body.programme, 100);
  const twelthMarks = clean(req.body.twelthMarks, 40);
  if (!fullName || !email || !phone || !programme || !twelthMarks) return res.status(400).json({ error: 'Please complete all required fields.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!/^[+\d() .-]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  if (!programmes.has(programme)) return res.status(400).json({ error: 'Please select a listed programme.' });
  const apps = readApps();
  const application = {
    id: 'TA-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    fullName, email, phone, programme, twelthMarks,
    status: 'Received', createdAt: new Date().toISOString()
  };
  apps.unshift(application);
  try { writeApps(apps); } catch { return res.status(500).json({ error: 'Application could not be saved. Please try again later.' }); }
  res.status(201).json({ message: 'Application received', applicationId: application.id });
});
app.get('/api/admin/applications', adminOnly, (_req, res) => res.json(readApps()));
app.patch('/api/admin/applications/:id', adminOnly, (req, res) => {
  const allowed = ['Received', 'Under Review', 'Shortlisted', 'Accepted', 'Rejected'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const apps = readApps();
  const item = apps.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Application not found' });
  item.status = req.body.status;
  try { writeApps(apps); } catch { return res.status(500).json({ error: 'Could not save status change.' }); }
  res.json(item);
});
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.listen(PORT, () => console.log('Tamil Academy portal running on port ' + PORT));
