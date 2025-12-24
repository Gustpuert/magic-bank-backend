const aulaService = require("./aula.service");

async function aulaTexto(req, res) {
  try {
    const result = await aulaService.runAula(req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  aulaTexto,
};
