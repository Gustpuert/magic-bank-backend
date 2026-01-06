require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

/* ============================
   PostgreSQL connection
============================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ============================
   Health check
============================ */
app.get('/', (req, res) => {
  res.send('MagicBank OK');
});

/* ============================
   OAuth callback (guarda token)
============================ */
app.get('/oauth/callback', async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).send('Missing code or store_id');
  }

  try {
    const tokenResponse = await axios.post(
      'https://www.tiendanube.com/apps/authorize/token',
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }
    );

    const accessToken = tokenResponse.data.access_token;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [store_id, accessToken]
    );

    res.send('App instalada correctamente. Token guardado.');
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).send('OAuth failed');
  }
});

/* ============================
   Get store data from Tiendanube
============================ */
app.get('/tiendanube/store', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT store_id, access_token FROM tiendanube_stores LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No store found in database' });
    }

    const { store_id, access_token } = result.rows[0];

    const storeResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/store`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          'User-Agent': 'MagicBank App',
        },
      }
    );

    res.json(storeResponse.data);
  } catch (error) {
    console.error('Failed to fetch store data:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch store data' });
  }
});

/* ============================
   Start server
============================ */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
