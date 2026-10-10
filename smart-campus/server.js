const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'campus.json');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const seed = {
  students: [
    { id: 'STU2401', name: 'Aarav Kumar', department: 'Information Technology', year: 'III Year', email: 'aarav.demo@campus.test', attendance: 92, status: 'Active' },
    { id: 'STU2402', name: 'Nila Priya', department: 'Computer Science', year: 'II Year', email: 'nila.demo@campus.test', attendance: 87, status: 'Active' },
    { id: 'STU2403', name: 'Kavin Raj', department: 'Electronics', year: 'III Year', email: 'kavin.demo@campus.test', attendance: 68, status: 'At risk' },
    { id: 'STU2404', name: 'Meera S', department: 'Information Technology', year: 'I Year', email: 'meera.demo@campus.test', attendance: 95, status: 'Active' },
    { id: 'STU2405', name: 'Arjun Dev', department: 'Mechanical', year: 'IV Year', email: 'arjun.demo@campus.test', attendance: 73, status: 'At risk' },
    { id: 'STU2406', name: 'Divya R', department: 'Computer Science', year: 'II Year', email: 'divya.demo@campus.test', attendance: 89, status: 'Active' }
  ],
  notices: [
    { id: 1, title: 'Semester examination timetable published', category: 'Examinations', date: '2026-10-08', body: 'Please check your department notice board for the latest timetable.' },
    { id: 2, title: 'Campus innovation challenge registrations', category: 'Events', date: '2026-10-07', body: 'Student teams can register with their faculty coordinator.' },
    { id: 3, title: 'Library hours extended this week', category: 'Campus', date: '2026-10-06', body: 'The central library will remain open until 8 PM during exam preparation week.' }
  ],
  timetable: [
    { time: '09:00 AM', subject: 'Data Structures', room: 'IT-204', faculty: 'Dr. Priya' },
    { time: '10:00 AM', subject: 'Database Systems', room: 'IT-108', faculty: 'Prof. Karthik' },
    { time: '11:15 AM', subject: 'Web Technology Lab', room: 'LAB-03', faculty: 'Ms. Revathi' },
    { time: '01:30 PM', subject: 'Computer Networks', room: 'IT-205', faculty: 'Dr. Anand' }
  ],
  tasks: [
    { id: 1, title: 'Review low-attendance list', done: false, owner: 'Academic office' },
    { id: 2, title: 'Publish lab internal marks', done: true, owner: 'IT department' },
    { id: 3, title: 'Confirm seminar hall booking', done: false, owner: 'Events team' }
  ]
};

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Data read failed; using demo seed:', error.message);
    return structuredClone(seed);
  }
}
function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Smart Campus', mode: process.env.DATABASE_URL ? 'database-configured' : 'demo-file-storage', time: new Date().toISOString() }));
app.get('/api/overview', (_req, res) => {
  const data = readData();
  const atRisk = data.students.filter(s => Number(s.attendance) < 75).length;
  res.json({
    students: data.students.length,
    faculty: 86,
    departments: 8,
    attendance: Math.round(data.students.reduce((n, s) => n + Number(s.attendance || 0), 0) / Math.max(data.students.length, 1)),
    atRisk,
    notices: data.notices.length,
    tasksOpen: data.tasks.filter(t => !t.done).length,
    weeklyAttendance: [84, 88, 82, 91, 87, 93, 89],
    departmentData: [{ name: 'IT', value: 88 }, { name: 'CSE', value: 92 }, { name: 'ECE', value: 81 }, { name: 'MECH', value: 85 }, { name: 'CIVIL', value: 79 }]
  });
});
app.get('/api/students', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const dept = String(req.query.department || '');
  const data = readData();
  res.json(data.students.filter(s => (!q || [s.id, s.name, s.email, s.department].some(v => String(v).toLowerCase().includes(q))) && (!dept || s.department === dept)));
});
app.post('/api/students', (req, res) => {
  const { name, department, year, email } = req.body || {};
  if (![name, department, year, email].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ error: 'All fields are required.' });
  const data = readData();
  const student = { id: 'STU' + Date.now().toString().slice(-6), name: name.trim(), department, year, email: email.trim(), attendance: 100, status: 'Active' };
  data.students.unshift(student);
  writeData(data);
  res.status(201).json(student);
});
app.patch('/api/students/:id/attendance', (req, res) => {
  const attendance = Number(req.body && req.body.attendance);
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) return res.status(400).json({ error: 'Attendance must be between 0 and 100.' });
  const data = readData();
  const student = data.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  student.attendance = attendance;
  student.status = attendance < 75 ? 'At risk' : 'Active';
  writeData(data);
  res.json(student);
});
app.get('/api/notices', (_req, res) => res.json(readData().notices));
app.post('/api/notices', (req, res) => {
  const { title, category, body } = req.body || {};
  if (![title, category, body].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ error: 'Title, category and details are required.' });
  const data = readData();
  const notice = { id: Date.now(), title: title.trim(), category: category.trim(), body: body.trim(), date: new Date().toISOString().slice(0, 10) };
  data.notices.unshift(notice);
  writeData(data);
  res.status(201).json(notice);
});
app.get('/api/timetable', (_req, res) => res.json(readData().timetable));
app.get('/api/tasks', (_req, res) => res.json(readData().tasks));
app.patch('/api/tasks/:id', (req, res) => {
  const data = readData();
  const task = data.tasks.find(t => String(t.id) === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  task.done = Boolean(req.body && req.body.done);
  writeData(data);
  res.json(task);
});
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log('Smart Campus server listening on port ' + PORT));
