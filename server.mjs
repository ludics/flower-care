import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import duckdb from 'duckdb';

const PORT = 16515;
const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.resolve('uploads');
const DB_PATH = path.join(DATA_DIR, 'flower-care.db');

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
    const { name, water_interval_days } = req.body;
    if (!name) return res.status(400).json({ error: '花卉名称不能为空' });
    const interval = parseInt(water_interval_days) || 3;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

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
    await runSQL(`UPDATE flowers SET last_watered = current_timestamp WHERE id = $1`, [id]);
    const rows = await runSQL(`SELECT * FROM flowers WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: '花卉不存在' });
    res.json(rows[0]);
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
    if (flower.photo_path) {
      const filePath = path.resolve('.' + flower.photo_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await runSQL(`DELETE FROM flowers WHERE id = $1`, [id]);
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

app.listen(PORT, () => {
  console.log(`Flower Care server running at http://localhost:${PORT}`);
});
