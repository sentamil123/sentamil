const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = process.env.DATABASE_URL ? new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined,max:5}) : null;
const secret = process.env.JWT_SECRET;
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'6mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.use('/api',rateLimit({windowMs:60000,limit:180,standardHeaders:true,legacyHeaders:false}));
const run=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const userOut=u=>({id:String(u.id),username:u.username,displayName:u.display_name,bio:u.bio||'',avatarUrl:u.avatar_url||null,createdAt:u.created_at});
const validUser=s=>typeof s==='string'&&/^[a-z0-9._]{3,24}$/.test(s);
async function init(){
 if(!pool)return;
 const ddl=[
 "CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,username VARCHAR(24) UNIQUE NOT NULL,email VARCHAR(254) UNIQUE NOT NULL,password_hash TEXT NOT NULL,display_name VARCHAR(60) NOT NULL,bio VARCHAR(160) NOT NULL DEFAULT '',avatar_url TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
 "CREATE TABLE IF NOT EXISTS posts(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,caption VARCHAR(500) NOT NULL DEFAULT '',media_url TEXT,media_type VARCHAR(10) NOT NULL DEFAULT 'text' CHECK(media_type IN ('text','image','video')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
 "CREATE TABLE IF NOT EXISTS follows(follower_id BIGINT REFERENCES users(id) ON DELETE CASCADE,following_id BIGINT REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(follower_id,following_id),CHECK(follower_id<>following_id))",
 "CREATE TABLE IF NOT EXISTS post_likes(user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,post_id))",
 "CREATE TABLE IF NOT EXISTS comments(id BIGSERIAL PRIMARY KEY,post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,body VARCHAR(240) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
 "CREATE TABLE IF NOT EXISTS saved_posts(user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,post_id))",
 "CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC)",
 "CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id,created_at DESC)",
 "CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id,created_at)"
 ];
 for(const q of ddl) await pool.query(q);
}
const db=(req,res,next)=>{if(!pool)return res.status(503).json({error:'Database not configured. Set DATABASE_URL.'});if(!secret||secret.length<32)return res.status(503).json({error:'Authentication not configured. Set JWT_SECRET (32+ characters).'});next()};
const auth=run(async(req,res,next)=>{
 const token=(req.get('authorization')||'').replace(/^Bearer /,'');
 if(!token)return res.status(401).json({error:'Please sign in.'});
 try{const c=jwt.verify(token,secret,{issuer:'nexto'});const r=await pool.query('SELECT id,username,email,display_name,bio,avatar_url,created_at FROM users WHERE id=$1',[c.sub]);if(!r.rowCount)return res.status(401).json({error:'Account not found.'});req.user=r.rows[0];next()}catch(e){return res.status(401).json({error:'Session expired. Please sign in again.'})}
});
const tokenFor=u=>jwt.sign({sub:String(u.id)},secret,{expiresIn:'7d',issuer:'nexto'});
app.get('/api/health',run(async(_q,res)=>{let database='not_configured';if(pool){await pool.query('SELECT 1');database='connected'}res.json({app:'Nexto',status:'ok',database,version:'2.0.0'})}));
app.post('/api/auth/register',db,run(async(req,res)=>{
 const username=String(req.body.username||'').trim().replace(/^@/,'').toLowerCase(),email=String(req.body.email||'').trim().toLowerCase(),password=req.body.password,displayName=String(req.body.displayName||'').trim();
 if(!validUser(username))return res.status(400).json({error:'Username: 3–24 letters, numbers, dots or underscores.'});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'Enter a valid email.'});
 if(typeof password!=='string'||password.length<10||password.length>128)return res.status(400).json({error:'Password must be 10–128 characters.'});
 if(!displayName||displayName.length>60)return res.status(400).json({error:'Name must be 1–60 characters.'});
 try{const r=await pool.query('INSERT INTO users(username,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING *',[username,email,await bcrypt.hash(password,12),displayName]);res.status(201).json({user:userOut(r.rows[0]),token:tokenFor(r.rows[0])})}catch(e){if(e.code==='23505')return res.status(409).json({error:'Username or email already registered.'});throw e}
}));
app.post('/api/auth/login',db,run(async(req,res)=>{
 const identity=String(req.body.identity||'').trim().toLowerCase(),password=req.body.password;
 if(!identity||typeof password!=='string')return res.status(400).json({error:'Enter username/email and password.'});
 const r=await pool.query('SELECT * FROM users WHERE username=$1 OR email=$1 LIMIT 1',[identity]),u=r.rows[0];
 if(!u||!(await bcrypt.compare(password,u.password_hash)))return res.status(401).json({error:'Incorrect username/email or password.'});
 res.json({user:userOut(u),token:tokenFor(u)});
}));
app.get('/api/auth/me',db,auth,(req,res)=>res.json({user:userOut(req.user)}));
app.patch('/api/users/me',db,auth,run(async(req,res)=>{
 const name=String(req.body.displayName??req.user.display_name).trim(),bio=String(req.body.bio??req.user.bio).trim(),avatar=req.body.avatarUrl===undefined?req.user.avatar_url:req.body.avatarUrl,username=String(req.body.username??req.user.username).trim().replace(/^@/,'').toLowerCase();
 if(!validUser(username))return res.status(400).json({error:'Username must be 3–24 letters, numbers, dots or underscores.'});
 if(!name||name.length>60||bio.length>160)return res.status(400).json({error:'Name or bio is too long.'});
 if(avatar!==null&&avatar!==undefined&&(typeof avatar!=='string'||avatar.length>1500000||!/^data:image\\/(png|jpeg|webp|gif);base64,/.test(avatar)))return res.status(400).json({error:'Use a small PNG, JPG, WEBP or GIF profile photo.'});
 try{const r=await pool.query('UPDATE users SET username=$1,display_name=$2,bio=$3,avatar_url=$4 WHERE id=$5 RETURNING *',[username,name,bio,avatar,req.user.id]);res.json({user:userOut(r.rows[0])})}catch(e){if(e.code==='23505')return res.status(409).json({error:'That username is already taken.'});throw e}
}));
const postSQL='SELECT p.id,p.user_id,p.caption,p.media_url,p.media_type,p.created_at,u.username,u.display_name,u.avatar_url,(SELECT COUNT(*)::int FROM post_likes l WHERE l.post_id=p.id) likes_count,(SELECT COUNT(*)::int FROM comments c WHERE c.post_id=p.id) comments_count,EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) liked,EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id=p.id AND s.user_id=$1) saved,(SELECT COUNT(*)::int FROM follows f WHERE f.following_id=p.user_id) followers_count FROM posts p JOIN users u ON u.id=p.user_id';
const postOut=p=>({id:String(p.id),userId:String(p.user_id),user:p.username,name:p.display_name,avatarUrl:p.avatar_url,caption:p.caption,image:p.media_type==='image'?p.media_url:null,video:p.media_type==='video'?p.media_url:null,mediaType:p.media_type,time:p.created_at,likes:p.likes_count,commentsCount:p.comments_count,liked:p.liked,saved:p.saved,followers:p.followers_count});
app.get('/api/posts',db,run(async(req,res)=>{
 let viewer=0;try{viewer=jwt.verify((req.get('authorization')||'').replace(/^Bearer /,''),secret,{issuer:'nexto'}).sub}catch{}
 const limit=Math.min(Math.max(Number(req.query.limit)||30,1),50);const r=await pool.query(postSQL+' ORDER BY p.created_at DESC LIMIT $2',[viewer,limit]);res.json({posts:r.rows.map(postOut)});
}));
app.post('/api/posts',db,auth,run(async(req,res)=>{
 const caption=String(req.body.caption||'').trim(),url=req.body.mediaUrl||null,type=req.body.mediaType||'text';
 if(caption.length>500)return res.status(400).json({error:'Caption max is 500 characters.'});
 if(!caption&&!url)return res.status(400).json({error:'Add a caption or photo/video.'});
 if(!['text','image','video'].includes(type))return res.status(400).json({error:'Unsupported media type.'});
 if(type==='text'&&url)return res.status(400).json({error:'Invalid text post.'});
 if(type!=='text'&&(!url||typeof url!=='string'||url.length>4000000||!(url.startsWith('https://')||/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,/.test(url))))return res.status(400).json({error:'Use a supported image or small MP4/WebM video.'});
 const r=await pool.query('INSERT INTO posts(user_id,caption,media_url,media_type) VALUES($1,$2,$3,$4) RETURNING id',[req.user.id,caption,url,type]);const p=await pool.query(postSQL+' WHERE p.id=$2',[req.user.id,r.rows[0].id]);res.status(201).json({post:postOut(p.rows[0])});
}));
app.delete('/api/posts/:id',db,auth,run(async(req,res)=>{const r=await pool.query('DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:'Post not found or not yours.'});res.json({ok:true})}));
app.post('/api/posts/:id/like',db,auth,run(async(req,res)=>{
 const old=await pool.query('DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2 RETURNING post_id',[req.user.id,req.params.id]);let liked=!old.rowCount;
 if(liked){const p=await pool.query('SELECT id FROM posts WHERE id=$1',[req.params.id]);if(!p.rowCount)return res.status(404).json({error:'Post not found.'});await pool.query('INSERT INTO post_likes(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.id])}
 const c=await pool.query('SELECT COUNT(*)::int count FROM post_likes WHERE post_id=$1',[req.params.id]);res.json({liked,likes:c.rows[0].count});
}));
app.post('/api/posts/:id/save',db,auth,run(async(req,res)=>{
 const old=await pool.query('DELETE FROM saved_posts WHERE user_id=$1 AND post_id=$2 RETURNING post_id',[req.user.id,req.params.id]);let saved=!old.rowCount;
 if(saved){const p=await pool.query('SELECT id FROM posts WHERE id=$1',[req.params.id]);if(!p.rowCount)return res.status(404).json({error:'Post not found.'});await pool.query('INSERT INTO saved_posts(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.id])}res.json({saved});
}));
app.get('/api/posts/saved',db,auth,run(async(req,res)=>{const r=await pool.query(postSQL+' JOIN saved_posts s ON s.post_id=p.id AND s.user_id=$1 ORDER BY s.created_at DESC LIMIT 50',[req.user.id]);res.json({posts:r.rows.map(postOut)})}));
app.get('/api/posts/:id/comments',db,run(async(req,res)=>{const r=await pool.query('SELECT c.id,c.body,c.created_at,u.username,u.display_name,u.avatar_url FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at LIMIT 100',[req.params.id]);res.json({comments:r.rows.map(c=>({id:String(c.id),text:c.body,user:c.username,name:c.display_name,avatarUrl:c.avatar_url,createdAt:c.created_at}))})}));
app.post('/api/posts/:id/comments',db,auth,run(async(req,res)=>{const body=String(req.body.body||'').trim();if(!body||body.length>240)return res.status(400).json({error:'Comment must be 1–240 characters.'});const r=await pool.query('INSERT INTO comments(post_id,user_id,body) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM posts WHERE id=$1) RETURNING id,body,created_at',[req.params.id,req.user.id,body]);if(!r.rowCount)return res.status(404).json({error:'Post not found.'});res.status(201).json({comment:{id:String(r.rows[0].id),text:body,user:req.user.username,name:req.user.display_name,createdAt:r.rows[0].created_at}})}));
app.post('/api/users/:id/follow',db,auth,run(async(req,res)=>{if(String(req.user.id)===String(req.params.id))return res.status(400).json({error:'Cannot follow yourself.'});const old=await pool.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2 RETURNING following_id',[req.user.id,req.params.id]);const following=!old.rowCount;if(following){const p=await pool.query('SELECT id FROM users WHERE id=$1',[req.params.id]);if(!p.rowCount)return res.status(404).json({error:'User not found.'});await pool.query('INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.id])}res.json({following})}));
app.get('/api/users',db,auth,run(async(req,res)=>{
 const q=String(req.query.q||'').trim().toLowerCase().slice(0,40);
 const sql="SELECT u.id,u.username,u.display_name,u.bio,u.avatar_url,u.created_at,(SELECT COUNT(*)::int FROM follows f WHERE f.following_id=u.id) followers,EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=u.id) following FROM users u WHERE u.id<>$1 AND ($2='' OR u.username LIKE '%'||$2||'%' OR lower(u.display_name) LIKE '%'||$2||'%') ORDER BY followers DESC LIMIT 20";
 const r=await pool.query(sql,[req.user.id,q]);res.json({users:r.rows.map(u=>({...userOut(u),followers:u.followers,following:u.following}))});
}));
app.get('/api/users/me/following',db,auth,run(async(req,res)=>{const r=await pool.query('SELECT u.id,u.username,u.email,u.display_name,u.bio,u.avatar_url,u.created_at FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=$1 ORDER BY f.created_at DESC',[req.user.id]);res.json({users:r.rows.map(userOut)})}));
app.get('/api/users/me/followers',db,auth,run(async(req,res)=>{const r=await pool.query('SELECT u.id,u.username,u.email,u.display_name,u.bio,u.avatar_url,u.created_at FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.following_id=$1 ORDER BY f.created_at DESC',[req.user.id]);res.json({users:r.rows.map(userOut)})}));
app.get('/api/users/:username',db,run(async(req,res)=>{let viewer=0;try{viewer=jwt.verify((req.get('authorization')||'').replace(/^Bearer /,''),secret,{issuer:'nexto'}).sub}catch{}const r=await pool.query('SELECT u.id,u.username,u.email,u.display_name,u.bio,u.avatar_url,u.created_at,(SELECT COUNT(*)::int FROM posts p WHERE p.user_id=u.id) posts,(SELECT COUNT(*)::int FROM follows f WHERE f.following_id=u.id) followers,(SELECT COUNT(*)::int FROM follows f WHERE f.follower_id=u.id) following,EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$2 AND f.following_id=u.id) is_following FROM users u WHERE u.username=$1',[req.params.username.toLowerCase(),viewer]);if(!r.rowCount)return res.status(404).json({error:'User not found.'});const u=r.rows[0];res.json({user:{...userOut(u),posts:u.posts,followers:u.followers,following:u.following,isFollowing:u.is_following}})}));
app.get('/api/users/:username/posts',db,run(async(req,res)=>{let viewer=0;try{viewer=jwt.verify((req.get('authorization')||'').replace(/^Bearer /,''),secret,{issuer:'nexto'}).sub}catch{}const r=await pool.query(postSQL+' WHERE u.username=$2 ORDER BY p.created_at DESC LIMIT 50',[viewer,req.params.username.toLowerCase()]);res.json({posts:r.rows.map(postOut)})}));
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,_req,res,_next)=>{console.error(err);if(err.code==='23503')return res.status(404).json({error:'Related record not found.'});res.status(500).json({error:process.env.NODE_ENV==='production'?'Something went wrong. Please try again.':err.message})});
init().then(()=>app.listen(PORT,()=>console.log('Nexto API listening on '+PORT))).catch(e=>{console.error('Database initialization failed:',e);process.exit(1)});
