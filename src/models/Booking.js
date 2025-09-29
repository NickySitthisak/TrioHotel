// models/Booking.js
const mongoose = require('mongoose');
const { bookingLogger } = require('../utils/logger');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
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
    status: doc.bookingStatus,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut
  });
});

// 🟢 Hook: log เมื่อ remove booking
bookingSchema.post('remove', function(doc) {
  bookingLogger.warn({
    message: '❌ Booking removed',
    bookingId: doc._id.toString()
  });
});

module.exports = mongoose.model('Booking', bookingSchema);

//bookingLogger.info({ message: '🚀 Booking model loaded and logger works!' });
