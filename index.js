const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

/* ===============================
   MIDDLEWARE
================================ */
app.use(cors({
  origin: "https://magicbank.org",
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "MagicBank Backend",
    environment: "production"
  });
});

/* ===============================
   MAIL TRANSPORT
================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/* ===============================
   CONTACT ENDPOINT
================================ */
app.post("/api/contact", async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      success: false,
      message: "Datos incompletos"
    });
  }

  try {
    const mailOptions = {
      from: `"MagicBank Contacto" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      replyTo: email,
      subject: "📩 Nuevo mensaje desde MagicBank",
      text: `
Nuevo contacto recibido:

Nombre: ${nombre}
Email: ${email}

Mensaje:
${mensaje}
      `,
      html: `
        <h2>📩 Nuevo contacto MagicBank</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log("📩 Email enviado correctamente:", { nombre, email });

    res.json({
      success: true,
      message: "Mensaje enviado correctamente"
    });

  } catch (error) {
    console.error("❌ Error enviando email:", error);

    res.status(500).json({
      success: false,
      message: "Error al enviar el mensaje"
    });
  }
});

/* ===============================
   SERVER START
================================ */
app.listen(PORT, () => {
  console.log(`🟢 MagicBank Backend activo en puerto ${PORT}`);
});
