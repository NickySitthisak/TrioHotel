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

const auth = require('./middlewares/auth');
const adminOnly = require('./middlewares/adminOnly');

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 Ensure logs folder exists (root project)
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
console.log("Log files dir:", logDir);

// 🟢 Morgan log request แบบ dev
app.use(morgan('dev'));

// 🟢 Winston logger เก็บลงไฟล์ + console
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

// ✅ connect DB
connectDB();

// ✅ force load models ที่มี logger
require('./models/Booking');

// ✅ routes หลัก
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));

// ✅ REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();

    logger.info(`User registered: ${customer.email} (${customer._id})`);
    res.status(201).json(customer);
  } catch (err) {
    logger.error(`Register failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// ✅ LOGIN
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

    // ✅ สร้าง token พร้อม role
    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: customer.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User logged in: ${customer.email} (${customer._id})`);

    res.json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        role: customer.role
      }
    });
  } catch (err) {
    logger.error(`Login failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route ทดสอบ Admin เท่านั้น
app.get('/api/admin/dashboard', auth, adminOnly, (req, res) => {
  res.json({ message: `Welcome admin!`, user: req.user });
});

// ✅ Root route
app.get('/', (req, res) => {
  res.send('TrioHotel Backend is running');
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  errorHandler(err, req, res, next);
});

// ✅ START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
