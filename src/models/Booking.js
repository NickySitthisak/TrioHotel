// src/models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    roomNumber: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, default: 1 },
    email: { type: String, required: true },
    bookingStatus: {
      type: String,
      enum: ['reserved', 'confirmed', 'cancelled', 'completed'],
      default: 'reserved',
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
