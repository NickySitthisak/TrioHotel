// src/routes/booking.js
const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/bookingController');
const auth = require('../middlewares/auth');

// ================= PUBLIC ROUTE (ไม่ต้องใช้ token) =================
router.get('/', bookingCtrl.getAllBookingsPublic); // GET all bookings
router.get('/email/:email', bookingCtrl.getBookingsByEmail); // GET bookings by email (public)

// ================= USER ROUTES (ต้องมี token) =================
router.post('/', auth, bookingCtrl.createBooking); // สร้าง booking
router.get('/:id', auth, bookingCtrl.getBooking); // ดู booking by ID
router.get('/me/mybookings', auth, bookingCtrl.getMyBookings); // ดู booking ของตัวเอง
router.put('/:id/cancel', auth, bookingCtrl.cancelBooking); // ยกเลิก booking
router.put('/:id/confirm', auth, bookingCtrl.confirmBooking); // ยืนยัน booking

// ================= ADMIN ROUTES =================
router.put('/:id/admin-cancel', auth, bookingCtrl.adminCancelBooking); // ยกเลิก booking (admin)
router.put('/:id/admin-confirm', auth, bookingCtrl.adminConfirmBooking); // ยืนยัน booking (admin)

module.exports = router;
