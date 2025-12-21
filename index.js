/**
 * MagicBank Backend – Contacto con Email
 * Producción – Railway
 */

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ==========================
// CONFIGURACIÓN
// ==========================
const PORT = process.env.PORT || 8080;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ==========================
// RUTA DE ESTADO
// ==========================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "MagicBank Backend",
    message: "Backend activo y operativo"
  });
});

// ==========================
// CONFIGURAR TRANSPORTER
// ==========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// ==========================
// RUTA CONTACTO
// ==========================
app.post("/api/contact", async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      status: "error",
      message: "Faltan campos obligatorios"
    });
  }

  try {
    // Enviar correo
    await transporter.sendMail({
      from: `"MagicBank Web" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject: "📩 Nuevo mensaje desde MagicBank.org",
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      `
    });

    console.log("📩 Mensaje enviado por correo:");
    console.log(nombre, email);

    res.status(200).json({
      status: "success",
      message: "Mensaje recibido correctamente"
    });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);

    res.status(500).json({
      status: "error",
      message: "Error enviando el mensaje"
    });
  }
});

// ==========================
// SERVIDOR
// ==========================
app.listen(PORT, () => {
  console.log("🟢 MagicBank Backend iniciado");
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
