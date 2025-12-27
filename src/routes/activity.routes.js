const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply auth middleware untuk SEMUA activity routes
router.use(authMiddleware);

// CRUD Routes
router.get('/', activityController.getAllActivities);
router.get('/summary', activityController.getDashboardSummary);
router.get('/:id', activityController.getActivityById);
router.post('/', activityController.createActivity);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;