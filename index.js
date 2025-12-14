const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Ruta de prueba (NO se borra)
app.get('/', (req, res) => {
  res.json({ status: 'Magic Bank Backend activo' });
});

// Puerto dinámico (clave para Railway)
const PORT = process.env.PORT || 3000;

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
