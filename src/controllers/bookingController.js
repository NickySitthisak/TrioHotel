// src/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { bookingLogger } = require('../utils/logger');

// ✅ POST /api/bookings - สร้างการจองใหม่
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
      if (roomId) {
        room = await Room.findById(roomId).session(session);
      } else if (roomNumber) {
        room = await Room.findOne({ roomNumber }).session(session);
      }

      if (!room) throw { status: 404, message: 'Room not found' };
      if (room.status !== 'available')
        throw { status: 400, message: 'Room not available (status)' };

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

      res.status(201).json({ booking });
    });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  } finally {
    session.endSession();
  }
};

// ✅ GET booking by ID (ต้องมี token)
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customer room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

// ✅ GET all bookings ของ user (ต้องมี token)
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('room')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// ✅ CANCEL booking (user)
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

    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};

// ✅ CONFIRM booking (user/admin ใช้)
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

    res.json({ message: 'Booking confirmed', booking });
  } catch (err) {
    next(err);
  }
};

// ✅ ADMIN CANCEL booking
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

    res.json({ message: 'Admin cancelled booking and room set to available', booking });
  } catch (err) {
    next(err);
  }
};

// ✅ ADMIN CONFIRM booking
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

    res.json({ message: 'Admin confirmed booking', booking });
  } catch (err) {
    next(err);
  }
};

// ✅ PUBLIC ROUTE: GET all bookings (ไม่ต้องมี token)
exports.getAllBookingsPublic = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('room customer', '-password')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};
