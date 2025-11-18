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

// Results Model
const Result = sequelize.define('Result', {
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
    defaultValue: 'exams'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal',
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Admin'
  },
  fileLink: {
    type: DataTypes.STRING,
    allowNull: true
  }
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

// Results Routes
app.get('/api/results', verifyToken, async (req, res) => {
  try {
    const results = await Result.findAll({ order: [['date', 'DESC']] });
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
});

app.post('/api/results', verifyToken, async (req, res) => {
  try {
    const { title, description, category, date, priority, fileLink } = req.body;
    const author = req.user?.username || 'Admin';
    const newResult = await Result.create({ title, description, category, date, priority, author, fileLink });
    res.status(201).json(newResult);
  } catch (error) {
    console.error('Error creating result:', error);
    res.status(500).json({ message: 'Error creating result', error: error.message });
  }
});

app.put('/api/results/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Result.update(req.body, { where: { id } });
    if (updated) {
      const updatedResult = await Result.findByPk(id);
      res.json(updatedResult);
    } else {
      res.status(404).json({ message: 'Result not found' });
    }
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ message: 'Error updating result', error: error.message });
  }
});

app.delete('/api/results/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Result.destroy({ where: { id } });
    if (deleted) {
      res.status(204).json({ message: 'Result deleted' });
    } else {
      res.status(404).json({ message: 'Result not found' });
    }
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ message: 'Error deleting result', error: error.message });
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
  // Use alter:true to update schema without dropping data so registrations persist
  await sequelize.sync({ alter: true });

    // Seed data if tables are empty
    const [annCount, evCount, ttCount, resCount] = await Promise.all([
      Announcement.count(),
      Event.count(),
      Timetable.count(),
      Result.count()
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
        },
        {
          title: 'Software Design Patterns Workshop Series',
          description: 'Join us for a comprehensive workshop series on Software Design Patterns. Sessions will cover Creational, Structural, and Behavioral patterns with practical examples.',
          category: 'academic',
          date: new Date('2025-11-08'),
          author: 'Dr. Aguwa',
          priority: 'normal'
        },
        {
          title: 'Research Paper Submission Deadline',
          description: 'Final deadline for submitting research papers for the International Conference on Software Engineering (ICSE 2026) is December 15, 2025.',
          category: 'academic',
          date: new Date('2025-12-15'),
          author: 'Dr. Caesar',
          priority: 'high'
        },
        {
          title: 'Industry Talk Series: AI in Software Testing',
          description: 'Guest lecture by Microsoft\'s Lead QA Engineer on implementing AI-driven testing methodologies. All students are encouraged to attend.',
          category: 'events',
          date: new Date('2025-11-22'),
          author: 'Admin',
          priority: 'normal'
        },
        {
          title: 'Holiday Schedule Announcement',
          description: 'Winter break will commence from December 20, 2025. Classes will resume on January 5, 2026. Happy holidays!',
          category: 'general',
          date: new Date('2025-12-01'),
          author: 'Admin',
          priority: 'normal'
        },
        {
          title: 'Software Project Showcase',
          description: 'Annual software project showcase event. Students will present their innovative solutions to industry professionals.',
          category: 'events',
          date: new Date('2025-12-10'),
          author: 'Dr. Elei',
          priority: 'high'
        },
        {
          title: 'Library System Maintenance',
          description: 'The digital library system will be under maintenance from 10 PM to 2 AM tonight. Please plan accordingly.',
          category: 'general',
          date: new Date('2025-11-07'),
          author: 'System Admin',
          priority: 'normal'
        },
        {
          title: 'Programming Competition Registration Open',
          description: 'Register now for the annual programming competition. Great prizes to be won! Registration closes on November 30.',
          category: 'events',
          date: new Date('2025-11-10'),
          author: 'Competition Committee',
          priority: 'normal'
        },
        {
          title: 'New Course Offering: Blockchain Development',
          description: 'New elective course on Blockchain Development will be offered next semester. Pre-registration starts December 1.',
          category: 'academic',
          date: new Date('2025-12-01'),
          author: 'Engr. Erike',
          priority: 'normal'
        },
        {
          title: 'Emergency Network Maintenance',
          description: 'Campus network will undergo emergency maintenance on Sunday from 2 AM to 6 AM. Some services may be unavailable.',
          category: 'general',
          date: new Date('2025-11-09'),
          author: 'IT Department',
          priority: 'urgent'
        },
        {
          title: 'Final Year Project Guidelines Update',
          description: 'Updated guidelines for final year projects have been published. Please review the new requirements carefully.',
          category: 'academic',
          date: new Date('2025-11-11'),
          author: 'Project Committee',
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
          location: 'SMAT Auditorium',
          author: 'Admin',
          priority: 'normal'
        },
        {
          title: 'Career Fair 2025',
          description: 'Annual career fair with top tech companies. Bring your resumes and be ready for on-spot interviews.',
          category: 'events',
          date: new Date('2025-11-25'),
          time: '09:00',
          location: 'University Convention Center',
          author: 'Career Services',
          priority: 'high'
        },
        {
          title: 'Hackathon: Code for Good',
          description: 'A 24-hour hackathon focused on developing solutions for social good. Teams of 2-4 members.',
          category: 'events',
          date: new Date('2025-12-05'),
          time: '08:00',
          location: 'Innovation Hub',
          author: 'Tech Club',
          priority: 'normal'
        },
        {
          title: 'Database Systems Workshop',
          description: 'Hands-on workshop on advanced database concepts including NoSQL and distributed databases.',
          category: 'academic',
          date: new Date('2025-11-18'),
          time: '13:00',
          location: 'Lab 204',
          author: 'Dr. Elei',
          priority: 'normal'
        },
        {
          title: 'Alumni Networking Night',
          description: 'Connect with successful alumni from various tech companies. Great opportunity for mentorship and career guidance.',
          category: 'events',
          date: new Date('2025-11-30'),
          time: '18:00',
          location: 'Faculty building',
          author: 'Alumni Association',
          priority: 'normal'
        },
        {
          title: 'Research Symposium',
          description: 'Annual research symposium where graduate students present their ongoing research work.',
          category: 'academic',
          date: new Date('2025-12-08'),
          time: '10:00',
          location: 'Research Center Auditorium',
          author: 'Research Committee',
          priority: 'high'
        },
        {
          title: 'Mobile App Development Contest',
          description: 'Showcase your mobile app development skills. Winners get internship opportunities!',
          category: 'events',
          date: new Date('2025-12-15'),
          time: '14:00',
          location: 'Innovation Lab',
          author: 'Mobile Dev Club',
          priority: 'normal'
        },
        {
          title: 'Cloud Computing Seminar',
          description: 'AWS certified trainer will conduct a seminar on cloud architecture and deployment.',
          category: 'academic',
          date: new Date('2025-11-28'),
          time: '11:00',
          location: 'Room 405',
          author: 'Dr. Caesar',
          priority: 'normal'
        },
        {
          title: 'Open Source Project Sprint',
          description: 'Join us for a day of contributing to open source projects. Mentors will be available.',
          category: 'events',
          date: new Date('2025-12-01'),
          time: '09:00',
          location: 'Computer Lab 3',
          author: 'Open Source Club',
          priority: 'normal'
        },
        {
          title: 'Software Testing Workshop',
          description: 'Learn about automated testing frameworks and best practices in software testing.',
          category: 'academic',
          date: new Date('2025-12-03'),
          time: '15:00',
          location: 'Room 302',
          author: 'QA Department',
          priority: 'normal'
        },
        {
          title: 'End of Semester Social',
          description: 'Join us for games, food, and fun as we celebrate the end of the semester!',
          category: 'events',
          date: new Date('2025-12-18'),
          time: '17:00',
          location: 'Student Center',
          author: 'SOE Executives',
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
          author: 'Dr. Caesar',
          semester: 'Fall 2025',
          course: 'SOE 401',
          priority: 'normal'
        },
        {
          title: 'Database Systems',
          description: 'Advanced database concepts and practical applications',
          category: 'academic',
          date: new Date('2025-11-07'),
          time: '11:00-12:30',
          location: 'Room 202',
          author: 'Engr. Erike',
          semester: 'Fall 2025',
          course: 'SOE 403',
          priority: 'normal'
        },
        {
          title: 'Object-Oriented Programming',
          description: 'Advanced OOP concepts and design patterns',
          category: 'academic',
          date: new Date('2025-11-08'),
          time: '09:00-10:30',
          location: 'Room 301',
          author: 'Dr. Aguwa',
          semester: 'Fall 2025',
          course: 'SOE 405',
          priority: 'normal'
        },
        {
          title: 'Web Development',
          description: 'Modern web development frameworks and practices',
          category: 'academic',
          date: new Date('2025-11-08'),
          time: '11:00-12:30',
          location: 'Lab 101',
          author: 'Engr. Dr. E.C. Amadi',
          semester: 'Fall 2025',
          course: 'SOE 407',
          priority: 'normal'
        },
        {
          title: 'Software Testing',
          description: 'Software testing methodologies and tools',
          category: 'academic',
          date: new Date('2025-11-09'),
          time: '09:00-10:30',
          location: 'Room 205',
          author: 'Mrs. Elei',
          semester: 'Fall 2025',
          course: 'SOE 409',
          priority: 'normal'
        },
        {
          title: 'Mobile App Development',
          description: 'Cross-platform mobile application development',
          category: 'academic',
          date: new Date('2025-11-09'),
          time: '11:00-12:30',
          location: 'Lab 202',
          author: 'Rev. Ovwonuri',
          semester: 'Fall 2025',
          course: 'SOE 411',
          priority: 'normal'
        },
        {
          title: 'Cloud Computing',
          description: 'Cloud architecture and deployment strategies',
          category: 'academic',
          date: new Date('2025-11-10'),
          time: '09:00-10:30',
          location: 'Room 304',
          author: 'Mr. R.E. Ogu',
          semester: 'Fall 2025',
          course: 'SOE 413',
          priority: 'normal'
        },
        {
          title: 'Software Project Management',
          description: 'Project management methodologies and team leadership',
          category: 'academic',
          date: new Date('2025-11-10'),
          time: '11:00-12:30',
          location: 'Room 305',
          author: 'Dr. Caesar',
          semester: 'Fall 2025',
          course: 'SOE 415',
          priority: 'normal'
        },
        {
          title: 'Artificial Intelligence',
          description: 'Introduction to AI and machine learning',
          category: 'academic',
          date: new Date('2025-11-11'),
          time: '09:00-10:30',
          location: 'Lab 301',
          author: 'Engr. Erike',
          semester: 'Fall 2025',
          course: 'SOE 417',
          priority: 'normal'
        },
        {
          title: 'Software Architecture',
          description: 'Advanced software architecture patterns',
          category: 'academic',
          date: new Date('2025-11-11'),
          time: '11:00-12:30',
          location: 'Room 401',
          author: 'Dr. Aguwa',
          semester: 'Fall 2025',
          course: 'SOE 411',
          priority: 'normal'
        },
        {
          title: 'Cybersecurity',
          description: 'Software security principles and practices',
          category: 'academic',
          date: new Date('2025-11-12'),
          time: '09:00-10:30',
          location: 'Lab 401',
          author: 'Engr. Dr. E.C. Amadi',
          semester: 'Fall 2025',
          course: 'SOE 401',
          priority: 'normal'
        },
        {
          title: 'DevOps Practices',
          description: 'Modern DevOps tools and methodologies',
          category: 'academic',
          date: new Date('2025-11-12'),
          time: '11:00-12:30',
          location: 'Room 402',
          author: 'Mrs. Elei',
          semester: 'Fall 2025',
          course: 'SOE 403',
          priority: 'normal'
        }
      ]);
      console.log('Seeded timetables');
    }
    
    if (resCount === 0) {
      await Result.bulkCreate([
        {
          title: 'Final Exam Results - Semester 1',
          description: 'Final exam results for Semester 1 are now available. Check the attached file for details.',
          category: 'exams',
          date: new Date('2025-11-25'),
          priority: 'normal',
          author: 'Admin',
          fileLink: null
        }
      ]);
      console.log('Seeded results');
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

