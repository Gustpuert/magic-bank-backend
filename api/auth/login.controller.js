const loginService = require("./login.service");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await loginService.login(email, password);

    return res.status(200).json(result);

  } catch (error) {
    return res.status(401).json({
      error: error.message
    });
  }
}

module.exports = {
  login
};
