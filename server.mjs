import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import duckdb from 'duckdb';

const PORT = 16515;
const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.resolve('uploads');
const DB_PATH = path.join(DATA_DIR, 'flower-care.db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'floweradmin2024';

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// DuckDB setup
const db = new duckdb.Database(DB_PATH);
const conn = db.connect();

function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (params.length > 0) {
      conn.all(sql, ...params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    } else {
      conn.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }
  });
}

function execSQL(sql) {
  return new Promise((resolve, reject) => {
    conn.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Initialize tables
await execSQL(`
  CREATE SEQUENCE IF NOT EXISTS flowers_seq START 1;
  CREATE TABLE IF NOT EXISTS flowers (
    id INTEGER PRIMARY KEY DEFAULT nextval('flowers_seq'),
    name VARCHAR NOT NULL,
    photo_path VARCHAR,
    water_interval_days INTEGER NOT NULL DEFAULT 3,
    last_watered TIMESTAMP DEFAULT current_timestamp,
    created_at TIMESTAMP DEFAULT current_timestamp
  );
  CREATE SEQUENCE IF NOT EXISTS comments_seq START 1;
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY DEFAULT nextval('comments_seq'),
    nickname VARCHAR NOT NULL,
    content VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT current_timestamp
  );
  CREATE SEQUENCE IF NOT EXISTS watering_logs_seq START 1;
  CREATE TABLE IF NOT EXISTS watering_logs (
    id INTEGER PRIMARY KEY DEFAULT nextval('watering_logs_seq'),
    flower_id INTEGER NOT NULL,
    watered_at TIMESTAMP NOT NULL,
    mood VARCHAR,
    created_at TIMESTAMP DEFAULT current_timestamp
  );
`);

// Express setup
const app = express();
app.use(express.json());

// Static files
app.use(express.static('.'));
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer for photo uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/flowers
app.get('/api/flowers', async (req, res) => {
  try {
    const rows = await runSQL('SELECT * FROM flowers ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flowers
app.post('/api/flowers', upload.single('photo'), async (req, res) => {
  try {
    const { name, water_interval_days, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: '花卉名称不能为空' });
    const interval = parseInt(water_interval_days) || 3;
    // photo_url (network link) takes priority; fallback to uploaded file
    const photoPath = photo_url?.trim() || (req.file ? `/uploads/${req.file.filename}` : null);

    await runSQL(
      `INSERT INTO flowers (name, photo_path, water_interval_days) VALUES ($1, $2, $3)`,
      [name, photoPath, interval]
    );
    const rows = await runSQL('SELECT * FROM flowers ORDER BY id DESC LIMIT 1');
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/flowers/:id/water
app.put('/api/flowers/:id/water', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { watered_at, mood } = req.body;
    const ts = watered_at ? new Date(watered_at) : new Date();
    if (isNaN(ts.getTime())) return res.status(400).json({ error: '无效的时间格式' });
    const rows = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '花卉不存在' });
    await runSQL(`UPDATE flowers SET last_watered = $1 WHERE id = $2`, [ts.toISOString(), id]);
    await runSQL(
      `INSERT INTO watering_logs (flower_id, watered_at, mood) VALUES ($1, $2, $3)`,
      [id, ts.toISOString(), mood || null]
    );
    const updated = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/flowers/:id
app.delete('/api/flowers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '花卉不存在' });

    const flower = rows[0];
    // Only delete local uploaded files, not external URLs
    if (flower.photo_path && flower.photo_path.startsWith('/uploads/')) {
      const filePath = path.resolve('.' + flower.photo_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await runSQL(`DELETE FROM watering_logs WHERE flower_id = $1`, [id]);
    await runSQL(`DELETE FROM flowers WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

// PUT /api/flowers/:id (edit flower)
app.put('/api/flowers/:id', upload.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '花卉不存在' });

    const flower = rows[0];
    const name = req.body.name || flower.name;
    const interval = parseInt(req.body.water_interval_days) || flower.water_interval_days;

    let photoPath = flower.photo_path;
    const photoUrl = req.body.photo_url?.trim();
    if (photoUrl) {
      // Network URL: delete old local file if applicable, store URL directly
      if (flower.photo_path && flower.photo_path.startsWith('/uploads/')) {
        const oldFilePath = path.resolve('.' + flower.photo_path);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      photoPath = photoUrl;
    } else if (req.file) {
      // Local upload: delete old local file if applicable
      if (flower.photo_path && flower.photo_path.startsWith('/uploads/')) {
        const oldFilePath = path.resolve('.' + flower.photo_path);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      photoPath = `/uploads/${req.file.filename}`;
    }

    await runSQL(
      `UPDATE flowers SET name = $1, photo_path = $2, water_interval_days = $3 WHERE id = $4`,
      [name, photoPath, interval, id]
    );
    const updated = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/watering-logs
app.get('/api/watering-logs', async (req, res) => {
  try {
    const { flower_id } = req.query;
    let rows;
    if (flower_id) {
      rows = await runSQL(
        `SELECT wl.*, f.name as flower_name FROM watering_logs wl
         JOIN flowers f ON f.id = wl.flower_id
         WHERE wl.flower_id = $1 ORDER BY wl.watered_at DESC`,
        [parseInt(flower_id)]
      );
    } else {
      rows = await runSQL(
        `SELECT wl.*, f.name as flower_name FROM watering_logs wl
         JOIN flowers f ON f.id = wl.flower_id
         ORDER BY wl.watered_at DESC`
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watering-logs/:id
app.put('/api/watering-logs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await runSQL(`SELECT * FROM watering_logs WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '记录不存在' });
    const { watered_at, mood } = req.body;
    const ts = watered_at ? new Date(watered_at) : new Date(rows[0].watered_at);
    if (isNaN(ts.getTime())) return res.status(400).json({ error: '无效的时间格式' });
    const newMood = mood !== undefined ? mood : rows[0].mood;
    await runSQL(
      `UPDATE watering_logs SET watered_at = $1, mood = $2 WHERE id = $3`,
      [ts.toISOString(), newMood, id]
    );
    // Sync flowers.last_watered to latest log for this flower
    const latest = await runSQL(
      `SELECT MAX(watered_at) as latest FROM watering_logs WHERE flower_id = $1`,
      [rows[0].flower_id]
    );
    if (latest[0]?.latest) {
      await runSQL(`UPDATE flowers SET last_watered = $1 WHERE id = $2`, [latest[0].latest, rows[0].flower_id]);
    }
    const updated = await runSQL(`SELECT wl.*, f.name as flower_name FROM watering_logs wl JOIN flowers f ON f.id = wl.flower_id WHERE wl.id = $1`, [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watering-logs/:id
app.delete('/api/watering-logs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await runSQL(`SELECT * FROM watering_logs WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '记录不存在' });
    const flowerId = rows[0].flower_id;
    await runSQL(`DELETE FROM watering_logs WHERE id = $1`, [id]);
    // Sync flowers.last_watered to latest remaining log
    const latest = await runSQL(
      `SELECT MAX(watered_at) as latest FROM watering_logs WHERE flower_id = $1`,
      [flowerId]
    );
    if (latest[0]?.latest) {
      await runSQL(`UPDATE flowers SET last_watered = $1 WHERE id = $2`, [latest[0].latest, flowerId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comments
app.get('/api/comments', async (req, res) => {
  try {
    const rows = await runSQL('SELECT * FROM comments ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments
app.post('/api/comments', async (req, res) => {
  try {
    const { nickname, content } = req.body;
    if (!nickname || !content) return res.status(400).json({ error: '昵称和内容不能为空' });

    await runSQL(
      `INSERT INTO comments (nickname, content) VALUES ($1, $2)`,
      [nickname, content]
    );
    const rows = await runSQL('SELECT * FROM comments ORDER BY id DESC LIMIT 1');
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await runSQL(`SELECT * FROM comments WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '评论不存在' });
    await runSQL(`DELETE FROM comments WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Flower Care server running at http://localhost:${PORT}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
});
