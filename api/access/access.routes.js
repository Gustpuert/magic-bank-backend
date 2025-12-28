const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

router.post("/check", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ allowed: false });
  }

  try {
    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const accesosPath = path.join(
      process.cwd(),
      "data",
      "access",
      "users.json"
    );

    const accesos = JSON.parse(fs.readFileSync(accesosPath, "utf8"));

    const user = accesos.find(u => u.email === payload.email);

    if (!user) {
      return res.json({ allowed: false });
    }

    const destino = req.body.destino;

    if (user.access.includes(destino)) {
      return res.json({ allowed: true });
    }

    return res.json({ allowed: false });

  } catch (err) {
    return res.status(401).json({ allowed: false });
  }
});

module.exports = router;
