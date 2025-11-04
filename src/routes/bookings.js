// src/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/bookingController');
const auth = require('../middlewares/auth');

// ✅ PUBLIC ROUTE (ไม่ต้องใช้ token)
router.get('/', bookingCtrl.getAllBookingsPublic);

// ✅ USER ROUTES (ต้องมี token)
router.post('/', auth, bookingCtrl.createBooking);
router.get('/:id', auth, bookingCtrl.getBooking);
router.get('/me/mybookings', auth, bookingCtrl.getMyBookings);
router.put('/:id/cancel', auth, bookingCtrl.cancelBooking);
router.put('/:id/confirm', auth, bookingCtrl.confirmBooking);

// ✅ ADMIN ROUTES
router.put('/:id/admin-cancel', auth, bookingCtrl.adminCancelBooking);
router.put('/:id/admin-confirm', auth, bookingCtrl.adminConfirmBooking);

module.exports = router;
