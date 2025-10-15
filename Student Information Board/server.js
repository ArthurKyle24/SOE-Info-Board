const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// ... (rest of your code, unchanged) ...

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    // db.close((err) => {
    //     if (err) {
    //         console.error('Error closing database:', err.message);
    //     } else {
    //         console.log('Database connection closed.');
    //     }
    //     process.exit(0);
    // });
    process.exit(0);
});

// MongoDB connection and models (only one require for mongoose)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_board';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// ... (rest of your code, unchanged) ...
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
