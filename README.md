# WE Backend Main

A full-stack web application with separated frontend and backend services.

## Project Structure

```
we-backend-main/
├── frontend/          # React frontend with Tailwind CSS
├── backend/           # Node.js/Express backend API
└── README.md         # This file
```

## Frontend

- **Technology**: React 19, Vite, Tailwind CSS, Framer Motion
- **Styling**: Modern glassmorphism design with dark/light themes
- **Features**: Authentication, dashboard, CRM functionality

### Getting Started (Frontend)

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Backend

- **Technology**: Node.js, Express, Prisma
- **Database**: SQLite (development), PostgreSQL (production)
- **Features**: RESTful API, authentication, data management

### Getting Started (Backend)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend API will run on `http://localhost:3001`

## Development

To run both frontend and backend simultaneously:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/dev-login` - Development login
- `GET /api/auth/me` - Get current user info

## Features

- **Frontend**: 
  - Modern UI with glassmorphism effects
  - Dark/light theme toggle
  - Responsive design
  - Smooth animations
  
- **Backend**:
  - RESTful API design
  - Authentication middleware
  - Database integration ready
  - CORS enabled for frontend

## Environment Variables

Backend requires a `.env` file with:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-jwt-secret-key-here
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
