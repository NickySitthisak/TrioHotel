// src/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { bookingLogger } = require('../utils/logger');

// ================== Helper: สร้าง JSON แบบอ่านง่าย ==================
const simplifyBookings = (bookings) => {
  return bookings.map(b => ({
    bookingId: b._id,
    email: b.customer.email,
    username: b.customer.username,
    roomNumber: b.room.roomNumber,
    roomType: b.room.roomType,
    price: b.room.price,
    status: b.room.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    bookingStatus: b.bookingStatus
  }));
};

// ================== POST /api/bookings ==================
exports.createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { roomId, roomNumber, checkIn, checkOut, guests, email } = req.body;
    const userId = req.user._id;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
    }

    await session.withTransaction(async () => {
      let room;
      if (roomId) room = await Room.findById(roomId).session(session);
      else if (roomNumber) room = await Room.findOne({ roomNumber }).session(session);

      if (!room) throw { status: 404, message: 'Room not found' };
      if (room.status !== 'available') throw { status: 400, message: 'Room not available' };

      const conflict = await Booking.findOne({
        room: room._id,
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
        bookingStatus: { $in: ['reserved', 'confirmed'] },
      }).session(session);

      if (conflict) throw { status: 409, message: 'Room already booked in that period' };

      const booking = new Booking({
        customer: userId,
        room: room._id,
        roomNumber: room.roomNumber,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        email,
        bookingStatus: 'reserved',
      });
      await booking.save({ session });

      room.status = 'reserved';
      await room.save({ session });

      bookingLogger.info({
        action: 'CREATE_BOOKING',
        bookingId: booking._id.toString(),
        userId: userId.toString(),
        roomId: room._id.toString(),
        roomNumber: room.roomNumber,
        guests,
        email,
        status: booking.bookingStatus,
      });

      res.status(201).json({ booking: simplifyBookings([booking])[0] });
    });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  } finally {
    session.endSession();
  }
};

// ================== GET booking by ID ==================
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    res.json(simplifyBookings([booking])[0]);
  } catch (err) {
    next(err);
  }
};

// ================== GET all bookings ของ user ==================
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      customer: req.user._id,
      bookingStatus: { $in: ['reserved', 'confirmed'] }
    })
      .populate('room')
      .sort({ createdAt: -1 });

    res.json(simplifyBookings(bookings));
  } catch (err) {
    next(err);
  }
};

// ================== CANCEL booking (user) ==================
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).populate('room');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (['cancelled', 'completed'].includes(booking.bookingStatus)) {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    booking.bookingStatus = 'cancelled';
    await booking.save();

    if (booking.room) {
      booking.room.status = 'available';
      await booking.room.save();
    }

    bookingLogger.info({
      action: 'CANCEL_BOOKING',
      bookingId: booking._id.toString(),
      userId: req.user._id.toString(),
      roomId: booking.room._id.toString(),
      roomNumber: booking.room.roomNumber,
      email: booking.email,
      status: booking.bookingStatus,
    });

    res.json({ message: 'Booking cancelled', booking: simplifyBookings([booking])[0] });
  } catch (err) {
    next(err);
  }
};

// ================== CONFIRM booking ==================
exports.confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.bookingStatus !== 'reserved') {
      return res.status(400).json({ message: 'Only reserved bookings can be confirmed' });
    }

    booking.bookingStatus = 'confirmed';
    await booking.save();

    if (booking.room) {
      booking.room.status = 'maintenance';
      await booking.room.save();
    }

    bookingLogger.info({
      action: 'CONFIRM_BOOKING',
      bookingId: booking._id.toString(),
      userId: req.user._id.toString(),
      roomId: booking.room._id.toString(),
      roomNumber: booking.room.roomNumber,
      email: booking.email,
      status: booking.bookingStatus,
    });

    res.json({ message: 'Booking confirmed', booking: simplifyBookings([booking])[0] });
  } catch (err) {
    next(err);
  }
};

// ================== ADMIN CANCEL / CONFIRM ==================
exports.adminCancelBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Access denied' });

    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.bookingStatus = 'cancelled';
    await booking.save();

    if (booking.room) {
      booking.room.status = 'available';
      await booking.room.save();
    }

    bookingLogger.info({
      action: 'ADMIN_CANCEL_BOOKING',
      bookingId: booking._id.toString(),
      adminId: req.user._id.toString(),
      roomId: booking.room._id.toString(),
      roomNumber: booking.room.roomNumber,
      status: booking.bookingStatus,
    });

    res.json({ message: 'Admin cancelled booking', booking: simplifyBookings([booking])[0] });
  } catch (err) {
    next(err);
  }
};

exports.adminConfirmBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Access denied' });

    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.bookingStatus = 'confirmed';
    await booking.save();

    if (booking.room) {
      booking.room.status = 'reserved';
      await booking.room.save();
    }

    bookingLogger.info({
      action: 'ADMIN_CONFIRM_BOOKING',
      bookingId: booking._id.toString(),
      adminId: req.user._id.toString(),
      roomId: booking.room._id.toString(),
      roomNumber: booking.room.roomNumber,
      status: booking.bookingStatus,
    });

    res.json({ message: 'Admin confirmed booking', booking: simplifyBookings([booking])[0] });
  } catch (err) {
    next(err);
  }
};

// ================== PUBLIC ROUTES ==================
exports.getAllBookingsPublic = async (req, res, next) => {
  try {
    const filter = { bookingStatus: { $in: ['reserved', 'confirmed'] } };
    if (req.query.email) filter.email = req.query.email;

    const bookings = await Booking.find(filter)
      .populate('room customer', '-password')
      .sort({ createdAt: -1 });

    res.json(simplifyBookings(bookings));
  } catch (err) {
    next(err);
  }
};

exports.getBookingsByEmail = async (req, res, next) => {
  try {
    const email = req.params.email;

    const bookings = await Booking.find({
      email,
      bookingStatus: { $in: ['reserved', 'confirmed'] }
    })
      .populate('room customer', '-password')
      .sort({ createdAt: -1 });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this email' });
    }

    res.json(simplifyBookings(bookings));
  } catch (err) {
    next(err);
  }
};
