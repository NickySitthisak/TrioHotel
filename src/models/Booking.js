// models/Booking.js
const mongoose = require('mongoose');
const { bookingLogger } = require('../utils/logger');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

  // ✅ ข้อมูลห้องและช่วงเวลาเข้าพัก
  roomNumber: { type: String, required: true }, // หมายเลขห้อง
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, default: 1, min: 1 }, // จำนวนผู้เข้าพัก

  // ✅ ข้อมูลการติดต่อ
  email: { type: String, required: true },

  // ✅ สถานะการจอง
  bookingStatus: { 
    type: String, 
    enum: ['pending','reserved','confirmed','cancelled','completed'], 
    default: 'pending' 
  }
}, { timestamps: true });

// 🟢 Hook: log เมื่อ save booking
bookingSchema.post('save', function(doc) {
  bookingLogger.info({
    message: '📌 Booking created/updated',
    bookingId: doc._id.toString(),
    customer: doc.customer.toString(),
    room: doc.room.toString(),
    roomNumber: doc.roomNumber,
    guests: doc.guests,
    email: doc.email,
    status: doc.bookingStatus,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut
  });
});

// 🟢 Hook: log เมื่อ remove booking
bookingSchema.post('remove', function(doc) {
  bookingLogger.warn({
    message: '❌ Booking removed',
    bookingId: doc._id.toString(),
    roomNumber: doc.roomNumber,
    email: doc.email
  });
});

module.exports = mongoose.model('Booking', bookingSchema);

//bookingLogger.info({ message: '🚀 Booking model loaded and logger works!' });
