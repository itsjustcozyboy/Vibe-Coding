const router = require('express').Router();
const { body } = require('express-validator');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/todoController');

router.use(requireAuth);

const createRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601().toDate(),
];

const updateRules = [
  body('title').optional().trim().notEmpty(),
  body('completed').optional().isBoolean(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional({ nullable: true }).isISO8601().toDate(),
];

router.get('/', ctrl.list);
router.post('/', createRules, ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', updateRules, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
