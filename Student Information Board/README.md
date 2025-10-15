# Student Information Board

## Project Overview
This project is a full-stack student information board web application. It allows students and admins to view and manage announcements, events, timetables, and results. The backend is built with Node.js, Express, and MongoDB (using Mongoose). The frontend is a simple HTML/CSS/JS app.

## Features
- User registration and login (admin and student roles)
- CRUD operations for announcements, events, timetables, and results (admin only)
- Search and filter functionality
- Archive feature for old content
- MongoDB Atlas or local MongoDB support

## Prerequisites
- Node.js (v16+ recommended)
- npm
- MongoDB Atlas account (or local MongoDB instance)

## Setup Instructions

### 1. Clone the Repository
```
git clone <your-repo-url>
cd Student\ Information\ Board
```

### 2. Install Dependencies
```
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root with the following:
```
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
```
- `MONGODB_URI`: MongoDB Atlas URI or local MongoDB URI (e.g., `mongodb://localhost:27017/student-board`)
- `JWT_SECRET`: Any random string for JWT authentication

### 4. Start the Server
```
npm start
```
The server will run on `http://localhost:3000` by default.

### 5. Access the App
Open `index.html` in your browser (or serve it with a static server).

## Deployment
- **Frontend**: Deploy `index.html`, `script.js`, and `styles.css` to Netlify, Vercel, or any static hosting.
- **Backend**: Deploy `server.js` to Render, Railway, Heroku, or any Node.js-compatible host. Set environment variables in the host's dashboard.
- **MongoDB**: Use MongoDB Atlas for cloud hosting or a managed MongoDB service.

## Notes
- The backend no longer uses SQLite. All data is stored in MongoDB.
- Sample data is automatically inserted into MongoDB if collections are empty on first run.
- Make sure your frontend API URLs point to your deployed backend.

## License
MIT
