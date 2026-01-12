require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   CONFIGURACIÓN DE CORREO
========================= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MB_EMAIL,
    pass: process.env.MB_EMAIL_PASS
  }
});

/* =========================
   CLAVES ADMINISTRATIVAS
========================= */
const CLAVES = ["admin3232", "admin3233", "admin3234"];
const DURACION = 15 * 60 * 1000;

function claveActual() {
  const bloque = Math.floor(Date.now() / DURACION) % CLAVES.length;
  return CLAVES[bloque];
}

/* =========================
   SOLICITUD DE VISITA
========================= */
app.post("/solicitar-visita", async (req, res) => {
  const { nombre, correo } = req.body;

  if (!nombre || !correo) {
    return res.status(400).send("Datos incompletos");
  }

  const clave = claveActual();

  const mailOptions = {
    from: `"MagicBank" <${process.env.MB_EMAIL}>`,
    to: correo,
    subject: "Acceso temporal a MagicBank",
    html: `
      <h2>Hola ${nombre},</h2>

      <p>
        Gracias por solicitar una <strong>visita guiada a MagicBank</strong>.
      </p>

      <p>
        Tu acceso es <strong>temporal</strong> y tiene una duración limitada.
      </p>

      <p>
        <strong>Clave de acceso:</strong><br>
        <code style="font-size:16px;">${clave}</code>
      </p>

      <p>
        Ingresa desde el siguiente enlace:
      </p>

      <p>
        <a href="https://magicbank.org/acceso-administrativo.html">
          https://magicbank.org/acceso-administrativo.html
        </a>
      </p>

      <p style="font-size:13px;color:#666;">
        MagicBank es una plataforma viva que se actualiza
        permanentemente en contenidos y diseño.
      </p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send("Correo enviado correctamente");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error enviando correo");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank backend activo en puerto ${PORT}`);
});
