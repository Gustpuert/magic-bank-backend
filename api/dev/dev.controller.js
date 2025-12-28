const jwt = require("jsonwebtoken");

/**
 * Genera un token de prueba (SOLO DESARROLLO)
 */
function generateTestToken(req, res) {
  const { course } = req.query;

  if (!course) {
    return res.status(400).json({
      error: "Debe indicar el curso ?course=italiano"
    });
  }

  // Usuario ficticio de prueba
  const testUser = {
    email: "test@magicbank.org",
    course: course,
    role: "student",
    test: true
  };

  const token = jwt.sign(
    testUser,
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.json({
    mode: "DEV",
    user: testUser,
    token
  });
}

module.exports = {
  generateTestToken
};
