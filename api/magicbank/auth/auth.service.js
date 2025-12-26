const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

async function login({ usuario, password }) {

  const usersPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "usuarios",
    "usuarios.json"
  );

  if (!fs.existsSync(usersPath)) {
    throw new Error("USUARIOS_NO_CONFIGURADOS");
  }

  const usuarios = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  const user = usuarios.find(u => u.usuario === usuario);

  if (!user) {
    throw new Error("USUARIO_NO_EXISTE");
  }

  if (!user.activo) {
    throw new Error("USUARIO_INACTIVO");
  }

  const ahora = new Date();
  const fin = new Date(user.fecha_fin);

  if (ahora > fin) {
    throw new Error("ACCESO_VENCIDO");
  }

  const okPassword = await bcrypt.compare(password, user.password_hash);

  if (!okPassword) {
    throw new Error("PASSWORD_INCORRECTO");
  }

  return {
    ok: true,
    usuario: user.usuario,
    tipo: user.tipo,
    programa_id: user.programa_id,
    link_aula: user.link_aula,
    link_tutor: user.link_tutor
  };
}

module.exports = {
  login
};
