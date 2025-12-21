const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   Middlewares
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =========================
   Rutas básicas
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "MagicBank Backend activo",
    service: "MagicBank University",
    environment: "production"
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   Configuración Email
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAGICBANK_EMAIL,
    pass: process.env.MAGICBANK_EMAIL_PASS
  }
});

/* =========================
   Ruta Contacto (EMAIL)
========================= */
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Datos incompletos"
    });
  }

  try {
    await transporter.sendMail({
      from: `"MagicBank Web" <${process.env.MAGICBANK_EMAIL}>`,
      to: "magicbankia@gmail.com",
      subject: "Nuevo mensaje desde MagicBank.org",
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `
    });

    return res.json({
      success: true,
      message: "Mensaje enviado correctamente"
    });

  } catch (error) {
    console.error("Error enviando email:", error);
    return res.status(500).json({
      success: false,
      error: "Error enviando notificación"
    });
  }
});

/* =========================
   Inicio servidor
========================= */
app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
