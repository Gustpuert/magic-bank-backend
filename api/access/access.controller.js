const { getValidAccess } = require("./access.service");

function checkAccess(req, res) {
  const userId = req.user.id;

  const access = getValidAccess(userId);

  return res.json({
    access
  });
}

module.exports = {
  checkAccess
};
