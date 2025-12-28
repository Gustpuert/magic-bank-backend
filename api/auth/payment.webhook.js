const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

/**
 * Webhook de pago exitoso
 * La pasarela llama este endpoint
 */
async function paymentWebhook(req, res) {
  try {
    const {
      email,
      nombre,
      productos,   // array de cursos/facultades compradas
      tipo         // "academy" | "university" | "otros"
    } = req.body;

    if (!email || !productos || !tipo) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const usersData = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));

    let user = usersData.users.find(u => u.email === email);

    /* =========================
       CREAR USUARIO SI NO EXISTE
    ========================= */
    if (!user) {
      const passwordTemporal = Math.random().toString(36).slice(-10);
      const hash = await bcrypt.hash(passwordTemporal, 10);

      user = {
        id: `u-${Date.now()}`,
        nombre: nombre || "Estudiante MagicBank",
        email,
        password: hash,
        estado: "activo",
        fechas: {
          registro: new Date().toISOString(),
          expiracion: new Date(
            new Date().setFullYear(new Date().getFullYear() + 3)
          ).toISOString()
        },
        accesos: {
          academy: [],
          university: [],
          otros: []
        }
      };

      usersData.users.push(user);

      // ⚠️ aquí luego se envía email con credenciales
      console.log("PASSWORD TEMPORAL:", passwordTemporal);
    }

    /* =========================
       ASIGNAR ACCESOS
    ========================= */
    productos.forEach(prod => {
      if (!user.accesos[tipo].includes(prod)) {
        user.accesos[tipo].push(prod);
      }
    });

    fs.writeFileSync(
      USERS_PATH,
      JSON.stringify(usersData, null, 2),
      "utf-8"
    );

    return res.json({
      status: "OK",
      message: "Usuario actualizado y accesos otorgados"
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

module.exports = {
  paymentWebhook
};
