require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const Customer = require('./models/Customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 Ensure logs folder exists (root project)
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
console.log("Log files dir:", logDir); // debug path

// 🟢 Morgan log request แบบ dev (เช่น POST /api/login 200 123ms)
app.use(morgan('dev'));

// 🟢 Winston logger เก็บลงไฟล์ + console
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(), // log ออก console ด้วย
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

// connect DB
connectDB();

// 🟢 force load models ที่มี logger (Booking.js)
require('./models/Booking');

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();

    // log register สำเร็จ
    logger.info(`User registered: ${customer.email} (${customer._id})`);

    res.status(201).json(customer);
  } catch (err) {
    logger.error(`Register failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      logger.warn(`Login failed: email not found (${email})`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      logger.warn(`Login failed: wrong password (${email})`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // สร้าง token
    const token = jwt.sign(
      { id: customer._id, email: customer.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // log login สำเร็จ
    logger.info(`User logged in: ${customer.email} (${customer._id})`);

    res.json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        username: customer.username
      }
    });
  } catch (err) {
    logger.error(`Login failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// root
app.get('/', (req, res) => {
  res.send('TrioHotel Backend is running');
});

// global error handler (log ด้วย)
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  errorHandler(err, req, res, next);
});

// START SERVER **หลังทุก route**
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  //logger.info("✅ Winston started and writing to combined.log");
});
