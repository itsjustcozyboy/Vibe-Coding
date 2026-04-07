const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/me', requireAuth, ctrl.me);

module.exports = router;
