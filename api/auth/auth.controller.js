const { createUserAndToken } = require("./auth.service");

exports.registerAuto = async (req, res) => {
  try {
    const { email, course } = req.body;

    if (!email || !course) {
      return res.status(400).json({ error: "Email y curso requeridos" });
    }

    const result = await createUserAndToken(email, course);

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyToken = (req, res) => {
  res.status(200).json({
    user: req.user,
    status: "Token válido"
  });
};
