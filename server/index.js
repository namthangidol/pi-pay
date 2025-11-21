require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Postgres pool from DATABASE_URL or connection parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

// Initialize DB table
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        amount NUMERIC NOT NULL,
        memo TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        txid TEXT,
        metadata JSONB
      );
    `);
    console.log('DB ready');
  } catch (err) {
    console.error('DB init error', err);
  } finally {
    client.release();
  }
})();

// Create order
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, memo } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO orders(id, amount, memo, status, metadata) VALUES($1,$2,$3,$4,$5)',
      [id, amount, memo, 'created', JSON.stringify({})]
    );
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Approve - called after user approves in Pi wallet; server should interact with Pi Platform API securely
app.post('/api/payments/approve', async (req, res) => {
  try {
    const { paymentId, appPaymentId } = req.body;
    // TODO: Call Pi Platform server API to approve the paymentId using server credentials
    // Example (pseudo):
    // await fetch(`https://api.minepi.com/v1/payments/${paymentId}/approve`, { method:'POST', headers:{ Authorization: `Bearer ${process.env.PI_SERVER_KEY}` }})
    if (appPaymentId) {
      await pool.query('UPDATE orders SET status=$1 WHERE id=$2', ['approved', appPaymentId]);
    }
    res.json({ ok: true, paymentId });
  } catch (err) {
    console.error('approve error', err);
    res.status(500).json({ error: err.message });
  }
});

// Complete - SDK calls this when txid is available
app.post('/api/payments/complete', async (req, res) => {
  try {
    const { paymentId, txid, appPaymentId } = req.body;
    if (appPaymentId) {
      await pool.query('UPDATE orders SET status=$1, txid=$2, completed_at=NOW() WHERE id=$3', ['completed', txid, appPaymentId]);
    }
    res.json({ ok: true, paymentId, txid });
  } catch (err) {
    console.error('complete error', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: simple API to list orders (protect this endpoint in prod!)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin UI
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Simple txid verification endpoint (placeholder - implement real call to Pi Platform)
app.post('/api/admin/verify-tx', async (req, res) => {
  try {
    const { txid } = req.body;
    // TODO: Implement real verification against Pi Platform or blockchain explorer.
    // For demo, we return success if txid is non-empty.
    if (!txid) return res.status(400).json({ ok: false, error: 'txid required' });
    // Example: call Pi API to check transaction status
    res.json({ ok: true, txid, verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started on', PORT));
