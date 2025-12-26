const { runAula } = require("./aula.service");

async function aulaTexto(req, res) {
  try {
    const { message } = req.body;

    const permiso = req.magicbank;

    const result = await runAula({
      message,
      course_id:
        permiso.tipo === "academy"
          ? permiso.destino.curso_id
          : permiso.destino.facultad_id,
      profile: {
        preferred_name: permiso.nombre || "Estudiante"
      }
    });

    return res.json(result);

  } catch (error) {
    console.error("Aula error:", error);
    return res.status(500).json({
      error: "Error interno del aula MagicBank"
    });
  }
}

module.exports = {
  aulaTexto
};
