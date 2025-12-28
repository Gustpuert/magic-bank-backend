function validateSession(req, res) {
  res.status(200).json({
    valid: true,
    user: req.user
  });
}

module.exports = {
  validateSession
};
