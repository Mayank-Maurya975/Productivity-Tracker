Personal Productivity Tracker (MERN Stack)
A full-stack Productivity Tracker Web Application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) with secure authentication and real-time task management.
This application helps users efficiently manage tasks, track habits, and monitor productivity through an interactive dashboard.

🚀 Features
🔐 Secure Authentication using Firebase Authentication (JWT-based)
📝 Task Management (Create, Update, Delete, Complete)
📊 Real-time Productivity Dashboard (Total, Completed, Pending Tasks)
📅 Calendar-based Activity Tracking
📈 Productivity Insights & Reports
🌙 Dark/Light Mode Support
🛡 Protected Routes & Session Handling
📱 Responsive UI (Mobile + Desktop)

🛠 Tech Stack
Frontend
React.js
Tailwind CSS
Axios
React Router
Context API
Backend
Node.js
Express.js
MongoDB (Mongoose)
Firebase Admin SDK (Token Verification)

🏗 Architecture
The application follows a modular and scalable architecture:
Frontend: Component-based UI with protected routing
Backend: RESTful API design with middleware-based authentication
Database: MongoDB for persistent task and habit storage
Authentication: Firebase ID tokens verified on the backend

📊 Dashboard Highlights
Displays total tasks, completed tasks, and pending tasks
Real-time updates after CRUD operations
Designed for intuitive and minimal user experience

🔒 Security
Firebase Authentication for secure login
JWT-based request authorization
Protected backend APIs
Environment variable configuration for sensitive keys

📦 Installation
# Clone the repository
git clone https://github.com/your-username/productivity-tracker.git

# Install frontend dependencies
cd frontend
npm install
npm run dev

# Install backend dependencies
cd ../backend
npm install
npm run dev
