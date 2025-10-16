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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(express.json());


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

  app.get('/', (req, res) => {
  res.send('Backend is live and running! 🚀');
});

// User Model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send('Invalid Token');
    }
    return next();
};

// Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error registering user' });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Generic Routes for /api/:type/:id
app.get('/api/:type/:id', verifyToken, async (req, res) => {
    try {
        const { type, id } = req.params;
        let Model;
        if (type === 'students') Model = Student;
        else if (type === 'announcements') Model = Announcement;
        else if (type === 'archive') Model = Archive;
        else return res.status(400).send('Invalid type');

        const item = await Model.findById(id);
        if (!item) {
            return res.status(404).send('Item not found');
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.put('/api/:type/:id', verifyToken, async (req, res) => {
    try {
        const { type, id } = req.params;
        let Model;
        if (type === 'students') Model = Student;
        else if (type === 'announcements') Model = Announcement;
        else if (type === 'archive') Model = Archive;
        else return res.status(400).send('Invalid type');

        const updatedItem = await Model.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedItem) {
            return res.status(404).send('Item not found');
        }
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.delete('/api/:type/:id', verifyToken, async (req, res) => {
    try {
        const { type, id } = req.params;
        let Model;
        if (type === 'students') Model = Student;
        else if (type === 'announcements') Model = Announcement;
        else if (type === 'archive') Model = Archive;
        else return res.status(400).send('Invalid type');

        const deletedItem = await Model.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).send('Item not found');
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Student Model
const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    studentId: { type: String, required: true, unique: true },
    major: { type: String, required: true },
    year: { type: Number, required: true },
    contact: { type: String },
});

const Student = mongoose.model('Student', StudentSchema);

// Student Routes
app.get('/api/students', verifyToken, async (req, res) => {
    try {
        const students = await Student.find();
        res.status(200).json(students);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.post('/api/students', verifyToken, async (req, res) => {
    try {
        const newStudent = new Student(req.body);
        await newStudent.save();
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(400).send('Error adding student');
    }
});

app.put('/api/students/:id', verifyToken, async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(400).send('Error updating student');
    }
});

app.delete('/api/students/:id', verifyToken, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).send('Error deleting student');
    }
});

// Announcement Model
const AnnouncementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

const Announcement = mongoose.model('Announcement', AnnouncementSchema);

// Announcement Routes
app.get('/api/announcements', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.find();
        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.post('/api/announcements', verifyToken, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(400).send('Error adding announcement');
    }
});

app.put('/api/announcements/:id', verifyToken, async (req, res) => {
    try {
        const updatedAnnouncement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedAnnouncement);
    } catch (error) {
        res.status(400).send('Error updating announcement');
    }
});

app.delete('/api/announcements/:id', verifyToken, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).send('Error deleting announcement');
    }
});

// Archive Model
const ArchiveSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'student', 'announcement'
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    archivedAt: { type: Date, default: Date.now },
});

const Archive = mongoose.model('Archive', ArchiveSchema);

// Archive Routes
app.get('/api/archive', verifyToken, async (req, res) => {
    try {
        const archives = await Archive.find();
        res.status(200).json(archives);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.post('/api/archive', verifyToken, async (req, res) => {
    try {
        const newArchive = new Archive(req.body);
        await newArchive.save();
        res.status(201).json(newArchive);
    } catch (error) {
        res.status(400).send('Error archiving item');
    }
});

app.delete('/api/archive/:id', verifyToken, async (req, res) => {
    try {
        await Archive.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).send('Error deleting archived item');
    }
});

// Search Route
app.get('/api/search', verifyToken, async (req, res) => {
    try {
        const { query } = req.query;
        const searchResults = {};

        // Search students
        searchResults.students = await Student.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { studentId: { $regex: query, $options: 'i' } },
                { major: { $regex: query, $options: 'i' } },
            ],
        });

        // Search announcements
        searchResults.announcements = await Announcement.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
            ],
        });

        res.status(200).json(searchResults);
    } catch (error) {
        res.status(500).send('Server error');
    }
});
