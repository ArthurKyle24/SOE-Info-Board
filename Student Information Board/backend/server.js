const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = 'your-secret-key-change-in-production';

// Sequelize setup for SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

// Database initialization will run after models are defined (see bottom of file)

sequelize.authenticate()
  .then(() => console.log('SQLite connection has been established successfully.'))
  .catch(err => console.error('Unable to connect to the SQLite database:', err));

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
app.get('/', (req, res) => {
  res.send('Backend is live and running! 🚀');
});

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
});

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

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, userType, departmentalIdToken } = req.body;

    // Simple validation
    if (!username || !password || !userType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // For admin registration, verify departmental token
    if (userType === 'admin') {
      if (departmentalIdToken !== '112233') { // This should be an environment variable in production
        return res.status(401).json({ message: 'Invalid departmental ID token' });
      }
    }

    // For demonstration, we'll use a dummy email
    const email = `${username}@example.com`;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      userType,
      email,
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Username already exists', error: error.message });
    }
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;
    const user = await User.findOne({ where: { username, userType } }); // Add userType to the query
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, userType: user.userType, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: {
        username: user.username,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
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

        const item = await Model.findByPk(id);
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

        const [updated] = await Model.update(req.body, { where: { id } });
        if (updated) {
            const updatedItem = await Model.findByPk(id);
            res.status(200).json(updatedItem);
        } else {
            res.status(404).send('Item not found');
        }
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

        const deleted = await Model.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).send('Item not found');
        }
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Get all announcements
app.get('/api/announcements', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.findAll();
        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/events', verifyToken, async (req, res) => {
  try {
    console.log('Fetching events...'); // Debug log
    const events = await Event.findAll({
      order: [['date', 'ASC'], ['time', 'ASC']]
    });
    console.log('Successfully fetched events:', JSON.stringify(events, null, 2)); // Debug log
    res.json(events);
  } catch (error) {
    console.error('Detailed error fetching events:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Error fetching events', 
      error: error.message,
      details: error.name 
    });
  }
});

app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, description, category, date, time, location, priority } = req.body;
    const author = req.user.username || 'Admin'; // Get username from JWT token
    
    const newEvent = await Event.create({
      title,
      description,
      category,
      date,
      time,
      location,
      priority,
      author
    });
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});

app.put('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Event.update(req.body, { where: { id } });
    if (updated) {
      const updatedEvent = await Event.findByPk(id);
      res.json(updatedEvent);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
});

app.delete('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Event.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Event deleted' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
});

app.get('/api/timetable', verifyToken, async (req, res) => {
  try {
    const timetables = await Timetable.findAll({
      order: [['date', 'ASC'], ['time', 'ASC']]
    });
    console.log('Fetched timetables:', timetables); // Debug log
    res.json(timetables);
  } catch (error) {
    console.error('Error fetching timetables:', error);
    res.status(500).json({ message: 'Error fetching timetables', error: error.message });
  }
});

app.post('/api/timetables', verifyToken, async (req, res) => {
  try {
    const newTimetable = await Timetable.create(req.body);
    res.status(201).json(newTimetable);
  } catch (error) {
    console.error('Error creating timetable:', error);
    res.status(500).json({ message: 'Error creating timetable', error: error.message });
  }
});

app.put('/api/timetables/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Timetable.update(req.body, { where: { id } });
    if (updated) {
      const updatedTimetable = await Timetable.findByPk(id);
      res.json(updatedTimetable);
    } else {
      res.status(404).json({ message: 'Timetable not found' });
    }
  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ message: 'Error updating timetable', error: error.message });
  }
});

app.delete('/api/timetables/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Timetable.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Timetable deleted' });
    } else {
      res.status(404).json({ message: 'Timetable not found' });
    }
  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({ message: 'Error deleting timetable', error: error.message });
  }
});

// Student Model
const Student = sequelize.define('Student', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  major: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

// Student Routes
app.get('/api/students', verifyToken, async (req, res) => {
  try {
    const students = await Student.findAll();
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

app.post('/api/students', verifyToken, async (req, res) => {
  try {
    const newStudent = await Student.create(req.body);
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Error creating student', error: error.message });
  }
});

app.put('/api/students/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Student.update(req.body, { where: { id } });
    if (updated) {
      const updatedStudent = await Student.findByPk(id);
      res.json(updatedStudent);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
});

app.delete('/api/students/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Student deleted' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
});

// Announcement Model
// Announcement Model
const Announcement = sequelize.define('Announcement', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal',
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Event Model
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: true, // Making this optional
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true, // Making this optional
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal',
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Admin'
  }
});

// Timetable Model
const Timetable = sequelize.define('Timetable', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal',
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  semester: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  course: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Announcement Routes
app.get('/api/announcements', verifyToken, async (req, res) => {
  try {
    const announcements = await Announcement.findAll();
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements', error: error.message });
  }
});

app.post('/api/announcements', verifyToken, async (req, res) => {
  try {
    const { title, description, category, date, time, location, priority } = req.body;
    const author = req.user.username || 'Admin'; // Get username from JWT token
    
    const newAnnouncement = await Announcement.create({ 
      title, 
      description, 
      category, 
      date, 
      time, 
      location, 
      priority,
      author 
    });
    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement', error: error.message });
  }
});

app.put('/api/announcements/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const [updated] = await Announcement.update({ title, content }, { where: { id } });
    if (updated) {
      const updatedAnnouncement = await Announcement.findByPk(id);
      res.json(updatedAnnouncement);
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Error updating announcement', error: error.message });
  }
});

app.delete('/api/announcements/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Announcement.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Announcement deleted' });
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Error deleting announcement', error: error.message });
  }
});

// Archive Model
const Archive = sequelize.define('Archive', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  fileLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Archive Routes
app.get('/api/archives', verifyToken, async (req, res) => {
  try {
    const archives = await Archive.findAll();
    res.json(archives);
  } catch (error) {
    console.error('Error fetching archives:', error);
    res.status(500).json({ message: 'Error fetching archives', error: error.message });
  }
});

app.post('/api/archives', verifyToken, async (req, res) => {
  try {
    const newArchive = await Archive.create(req.body);
    res.status(201).json(newArchive);
  } catch (error) {
    console.error('Error creating archive:', error);
    res.status(500).json({ message: 'Error creating archive', error: error.message });
  }
});

app.put('/api/archives/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Archive.update(req.body, { where: { id } });
    if (updated) {
      const updatedArchive = await Archive.findByPk(id);
      res.json(updatedArchive);
    } else {
      res.status(404).json({ message: 'Archive not found' });
    }
  } catch (error) {
    console.error('Error updating archive:', error);
    res.status(500).json({ message: 'Error updating archive', error: error.message });
  }
});

app.delete('/api/archives/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Archive.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Archive deleted' });
    }
    else {
      res.status(404).json({ message: 'Archive not found' });
    }
  } catch (error) {
    console.error('Error deleting archive:', error);
    res.status(500).json({ message: 'Error deleting archive', error: error.message });
  }
});

// Search Route
app.get('/api/search', verifyToken, async (req, res) => {
    try {
        const { query } = req.query;
        const searchResults = {};

        // Search students
        searchResults.students = await Student.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${query}%` } },
                    { studentId: { [Op.like]: `%${query}%` } },
                    { major: { [Op.like]: `%${query}%` } },
                ],
            },
        });

        // Search announcements
        searchResults.announcements = await Announcement.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: `%${query}%` } },
                    { content: { [Op.like]: `%${query}%` } },
                ],
            },
        });

        res.status(200).json(searchResults);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Proper database initialization (run after models are defined)
async function initializeDatabase() {
  try {
    console.log('Initializing database (sync + seed)...');
    await sequelize.sync({ force: false });

    // Seed data if tables are empty
    const [annCount, evCount, ttCount] = await Promise.all([
      Announcement.count(),
      Event.count(),
      Timetable.count()
    ]);

    if (annCount === 0) {
      await Announcement.bulkCreate([
        {
          title: 'Welcome to Software Engineering Department',
          description: 'Welcome to the new semester! Important information and updates will be posted here regularly.',
          category: 'general',
          date: new Date(),
          author: 'Admin',
          priority: 'normal'
        },
        {
          title: 'Upcoming Midterm Examinations',
          description: 'Midterm examinations for all courses will be held from November 15-20, 2025. Please check the timetable for your specific schedule.',
          category: 'exams',
          date: new Date('2025-11-15'),
          author: 'Admin',
          priority: 'high'
        }
      ]);
      console.log('Seeded announcements');
    }

    if (evCount === 0) {
      await Event.bulkCreate([
        {
          title: 'Software Engineering Workshop',
          description: 'Join us for a hands-on workshop on modern web development frameworks. All students are encouraged to attend.',
          category: 'academic',
          date: new Date('2025-11-10'),
          time: '14:00',
          location: 'Room 301',
          author: 'Admin',
          priority: 'normal'
        },
        {
          title: 'Industry Talk: AI in Software Development',
          description: 'Guest speaker from Microsoft will discuss the role of AI in modern software development.',
          category: 'events',
          date: new Date('2025-11-12'),
          time: '15:30',
          location: 'Main Auditorium',
          author: 'Admin',
          priority: 'normal'
        }
      ]);
      console.log('Seeded events');
    }

    if (ttCount === 0) {
      await Timetable.bulkCreate([
        {
          title: 'Software Engineering Fundamentals',
          description: 'Introduction to software engineering principles and practices',
          category: 'academic',
          date: new Date('2025-11-07'),
          time: '09:00-10:30',
          location: 'Room 201',
          author: 'Prof. Smith',
          semester: 'Fall 2025',
          course: 'SE101',
          priority: 'normal'
        },
        {
          title: 'Database Systems',
          description: 'Advanced database concepts and practical applications',
          category: 'academic',
          date: new Date('2025-11-07'),
          time: '11:00-12:30',
          location: 'Room 202',
          author: 'Dr. Johnson',
          semester: 'Fall 2025',
          course: 'SE102',
          priority: 'normal'
        }
      ]);
      console.log('Seeded timetables');
    }

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Start init after everything is defined
initializeDatabase();
