const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/admin/dashboard', auth, adminOnly, (req, res) => {
  res.json({ message: `Welcome admin!`, user: req.user });
});

module.exports = router;
