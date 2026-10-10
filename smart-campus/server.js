const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const app=express(), PORT=process.env.PORT||3000;
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,'data'), DATA_FILE=path.join(DATA_DIR,'campus.json');
app.disable('x-powered-by');
app.set('trust proxy',1);
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(req.secure || req.headers['x-forwarded-proto']==='https') res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public'),{maxAge:'1h'}));
const seed={
 college:{name:'Northbridge Institute of Technology',tagline:'Learn. Lead. Make an impact.',location:'Tamil Nadu, India',established:2004,about:'A student-focused institution encouraging academic excellence, practical learning, innovation and community.',email:'info@northbridge.example',phone:'+91 98765 00000',departments:['Information Technology','Computer Science','Electronics','Mechanical','Civil']},
 students:[
 {id:'STU2401',name:'Aarav Kumar',department:'Information Technology',year:'III Year',email:'aarav.demo@campus.test',attendance:92,rollNo:'IT2024-01',feesTotal:60000,feesPaid:45000},
 {id:'STU2402',name:'Nila Priya',department:'Computer Science',year:'II Year',email:'nila.demo@campus.test',attendance:87,rollNo:'CS2025-02',feesTotal:60000,feesPaid:60000},
 {id:'STU2403',name:'Kavin Raj',department:'Electronics',year:'III Year',email:'kavin.demo@campus.test',attendance:68,rollNo:'EC2024-03',feesTotal:62000,feesPaid:40000},
 {id:'STU2404',name:'Meera S',department:'Information Technology',year:'I Year',email:'meera.demo@campus.test',attendance:95,rollNo:'IT2026-04',feesTotal:60000,feesPaid:30000},
 {id:'STU2405',name:'Arjun Dev',department:'Mechanical',year:'IV Year',email:'arjun.demo@campus.test',attendance:73,rollNo:'ME2023-05',feesTotal:65000,feesPaid:50000},
 {id:'STU2406',name:'Divya R',department:'Computer Science',year:'II Year',email:'divya.demo@campus.test',attendance:89,rollNo:'CS2025-06',feesTotal:60000,feesPaid:60000}],
 staff:[{id:'STF001',name:'Demo Faculty',email:'staff@campus.test',department:'Information Technology',role:'staff',password:'Staff@123'}],
 notices:[
 {id:1,title:'Welcome to the new academic portal',category:'Campus',date:'2026-10-10',body:'Explore campus updates, class schedules and academic information in one place.'},
 {id:2,title:'Semester examination preparation',category:'Examinations',date:'2026-10-09',body:'Students should check their department timetable and contact their faculty for clarifications.'},
 {id:3,title:'Innovation club registrations open',category:'Events',date:'2026-10-08',body:'Students interested in projects and innovation can contact their department coordinator.'}],
 timetable:[
 {id:1,department:'Information Technology',year:'III Year',day:'Monday',time:'09:00 AM',subject:'Data Structures',room:'IT-204',faculty:'Demo Faculty'},
 {id:2,department:'Information Technology',year:'III Year',day:'Monday',time:'10:00 AM',subject:'Database Systems',room:'IT-108',faculty:'Demo Faculty'},
 {id:3,department:'Information Technology',year:'III Year',day:'Monday',time:'11:15 AM',subject:'Web Technology Lab',room:'LAB-03',faculty:'Demo Faculty'},
 {id:4,department:'Information Technology',year:'III Year',day:'Monday',time:'01:30 PM',subject:'Computer Networks',room:'IT-205',faculty:'Demo Faculty'}],
 attendanceRecords:[],feesRecords:[],tasks:[{id:1,title:'Review low-attendance list',done:false,owner:'Academic office'},{id:2,title:'Publish lab internal marks',done:true,owner:'IT department'}]
};
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
 const hash=crypto.scryptSync(String(password),salt,64).toString('hex');
 return salt+':'+hash;
}
function verifyPassword(password,stored){
 if(typeof stored!=='string'||!stored.includes(':')) return false;
 const [salt,expected]=stored.split(':');
 if(!salt||!expected) return false;
 const actual=crypto.scryptSync(String(password),salt,64);
 const target=Buffer.from(expected,'hex');
 return target.length===actual.length&&crypto.timingSafeEqual(actual,target);
}
function readData(){try{if(!fs.existsSync(DATA_FILE)){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DATA_FILE,JSON.stringify(seed,null,2));}const d=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));d.college=d.college||seed.college;d.staff=d.staff||seed.staff;d.attendanceRecords=d.attendanceRecords||[];d.feesRecords=d.feesRecords||[];d.tasks=d.tasks||seed.tasks;d.notices=d.notices||seed.notices;d.timetable=(d.timetable||seed.timetable).map((t,i)=>({id:t.id||Date.now()+i,department:t.department||'Information Technology',year:t.year||'III Year',day:t.day||'Monday',...t}));d.students=(d.students||seed.students).map((s,i)=>({...seed.students.find(x=>x.id===s.id),...s,rollNo:s.rollNo||s.id,feesTotal:Number(s.feesTotal||60000),feesPaid:Number(s.feesPaid||0)}));
 let migrated=false;
 d.staff=(d.staff||seed.staff).map(st=>{
   if(!st.passwordHash&&st.password){const next={...st,passwordHash:hashPassword(st.password)};delete next.password;migrated=true;return next;}
   if(st.password){const next={...st};delete next.password;migrated=true;return next;}
   return st;
 });
 if(migrated) console.log('Migrated staff credentials to password hashes.');
 writeData(d);return d;}catch(e){console.error('Data read error',e.message);return structuredClone(seed)}}
function writeData(d){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));}
const sessions=new Map();
const loginAttempts=new Map();
const SESSION_TTL=8*60*60*1000;
function token(){return crypto.randomBytes(32).toString('hex')}
function auth(req,res,next){
 const t=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const session=sessions.get(t);
 if(!session||session.expiresAt<Date.now()){if(session)sessions.delete(t);return res.status(401).json({error:'Please log in again.'});}
 req.user=session.user;req.sessionToken=t;next();
}
function limitLogin(req,res,next){
 const key=req.ip||req.socket.remoteAddress||'unknown',now=Date.now(),windowMs=15*60*1000,max=10;
 let entry=loginAttempts.get(key);
 if(!entry||now-entry.start>windowMs){entry={start:now,count:0};loginAttempts.set(key,entry);}
 if(entry.count>=max){res.setHeader('Retry-After',String(Math.ceil((windowMs-(now-entry.start))/1000)));return res.status(429).json({error:'Too many login attempts. Please wait 15 minutes and try again.'});}
 req.recordLoginFailure=()=>{entry.count++;};
 req.clearLoginFailures=()=>loginAttempts.delete(key);
 next();
}
function role(r){return (req,res,next)=>req.user.role===r?next():res.status(403).json({error:'This account does not have permission.'})}
function safeStudent(s){const {feesTotal,feesPaid,...rest}=s;return rest}
app.get('/api/health',(_q,r)=>r.json({ok:true,app:'Smart Campus',mode:'demo-file-storage',time:new Date().toISOString()}));
app.get('/api/public/overview',(_q,r)=>{const d=readData();r.json({college:d.college,students:d.students.length,faculty:d.staff.length,departments:d.college.departments.length,notices:d.notices,events:d.notices.filter(n=>n.category==='Events')})});
app.post('/api/login',limitLogin,(req,res)=>{const {role:kind,username,password}=req.body||{};const d=readData();let user=null;
 if(typeof username!=='string'||typeof password!=='string'||username.length>160||password.length>256||!['staff','student'].includes(kind)){
   req.recordLoginFailure();return res.status(400).json({error:'Enter a valid account type, username and password.'});
 }
 if(kind==='staff'){const candidate=d.staff.find(s=>s.email.toLowerCase()===username.trim().toLowerCase());if(candidate&&verifyPassword(password,candidate.passwordHash))user=candidate;}
 if(kind==='student'){user=d.students.find(s=>(s.id.toLowerCase()===username.trim().toLowerCase()||s.email.toLowerCase()===username.trim().toLowerCase())&&password===s.id)}
 if(!user){req.recordLoginFailure();return res.status(401).json({error:'Login details are incorrect. Check the demo credentials and try again.'});}
 req.clearLoginFailures();
 const t=token();const u=kind==='staff'?{id:user.id,name:user.name,email:user.email,role:'staff',department:user.department}:{id:user.id,name:user.name,email:user.email,role:'student',department:user.department,year:user.year};sessions.set(t,{user:u,expiresAt:Date.now()+SESSION_TTL});res.json({token:t,user:u,expiresIn:SESSION_TTL});
});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.post('/api/logout',auth,(req,res)=>{sessions.delete(req.sessionToken);res.json({ok:true});});
app.get('/api/student/me',auth,role('student'),(req,res)=>{const d=readData(),s=d.students.find(x=>x.id===req.user.id);if(!s)return res.status(404).json({error:'Student record not found'});res.json({student:safeStudent(s),fees:{total:s.feesTotal,paid:s.feesPaid,due:Math.max(0,s.feesTotal-s.feesPaid)},attendanceRecords:d.attendanceRecords.filter(a=>a.studentId===s.id),timetable:d.timetable.filter(t=>t.department===s.department&&t.year===s.year),notices:d.notices})});
app.get('/api/staff/dashboard',auth,role('staff'),(_q,res)=>{const d=readData();res.json({students:d.students.map(s=>({...safeStudent(s),feesDue:Math.max(0,s.feesTotal-s.feesPaid)})),staff:d.staff.map(({password,...s})=>s),timetable:d.timetable,attendanceRecords:d.attendanceRecords,feesRecords:d.feesRecords,notices:d.notices,college:d.college})});
app.post('/api/staff/attendance',auth,role('staff'),(req,res)=>{const {studentId,date,status,subject}=req.body||{};if(!studentId||!date||!['Present','Absent','Late'].includes(status))return res.status(400).json({error:'Student, date and status are required.'});const d=readData(),s=d.students.find(x=>x.id===studentId);if(!s)return res.status(404).json({error:'Student not found'});const rec={id:Date.now(),studentId,date,status,subject:String(subject||'General')};d.attendanceRecords.unshift(rec);const records=d.attendanceRecords.filter(a=>a.studentId===studentId);s.attendance=Math.round(records.filter(a=>a.status==='Present'||a.status==='Late').length/records.length*100);writeData(d);res.status(201).json(rec)});
app.post('/api/staff/timetable',auth,role('staff'),(req,res)=>{const {department,year,day,time,subject,room,faculty}=req.body||{};if(![department,year,day,time,subject,room,faculty].every(v=>typeof v==='string'&&v.trim()))return res.status(400).json({error:'Fill all timetable fields.'});const d=readData(),item={id:Date.now(),department,year,day,time,subject,room,faculty};d.timetable.push(item);writeData(d);res.status(201).json(item)});
app.post('/api/staff/fees',auth,role('staff'),(req,res)=>{const {studentId,amount,note}=req.body||{},n=Number(amount);if(!studentId||!Number.isFinite(n)||n<=0)return res.status(400).json({error:'Choose a student and enter a valid amount.'});const d=readData(),s=d.students.find(x=>x.id===studentId);if(!s)return res.status(404).json({error:'Student not found'});const due=Math.max(0,s.feesTotal-s.feesPaid);if(n>due)return res.status(400).json({error:'Payment exceeds the remaining fee balance of ₹'+due.toLocaleString('en-IN')+'.'});s.feesPaid=s.feesPaid+n;const rec={id:Date.now(),studentId,amount:n,note:String(note||'Fee payment').slice(0,200),date:new Date().toISOString().slice(0,10)};d.feesRecords.unshift(rec);writeData(d);res.status(201).json({record:rec,fees:{total:s.feesTotal,paid:s.feesPaid,due:s.feesTotal-s.feesPaid}})});
app.post('/api/staff/notices',auth,role('staff'),(req,res)=>{const {title,category,body}=req.body||{};if(![title,category,body].every(v=>typeof v==='string'&&v.trim()))return res.status(400).json({error:'Fill all notice fields.'});const d=readData(),n={id:Date.now(),title:title.trim(),category:category.trim(),body:body.trim(),date:new Date().toISOString().slice(0,10)};d.notices.unshift(n);writeData(d);res.status(201).json(n)});
app.get('/api/students',auth,role('staff'),(req,res)=>res.json(readData().students.map(s=>({...safeStudent(s),feesDue:s.feesTotal-s.feesPaid}))));
app.get('/api/notices',(_q,res)=>res.json(readData().notices));
app.get('*',(_q,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log('Smart Campus server listening on port '+PORT));
