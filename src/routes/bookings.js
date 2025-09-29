const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/bookingController');
const auth = require('../middlewares/auth');

router.post('/', auth, bookingCtrl.createBooking);        // จองห้อง
router.get('/:id', auth, bookingCtrl.getBooking);         // ดู booking เดี่ยว
router.get('/', auth, bookingCtrl.getMyBookings);         // ดู booking ของ user
router.put('/:id/cancel', auth, bookingCtrl.cancelBooking); // ยกเลิก booking
router.put('/:id/confirm', auth, bookingCtrl.confirmBooking); // ยืนยัน booking (ถ้ามี role admin)

module.exports = router;
