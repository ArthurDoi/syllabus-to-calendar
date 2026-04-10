# Syllabus to Calendar 🗓️

**Live Demo:** [https://syllabus-to-calendar-nine.vercel.app/](https://syllabus-to-calendar-nine.vercel.app/)

---

## 📖 Project Overview

**Syllabus to Calendar** is a full-stack web application that leverages AI to automate the extraction of class schedules, assignment deadlines, and academic events from course syllabuses. The application intelligently parses documents, structures the data, and synchronizes events bidirectionally with Google Calendar.

The project is structured as a **production-ready monorepo** with decoupled Frontend and Backend services, ensuring:
- ✅ Clear separation of concerns
- ✅ Independent scaling and deployment
- ✅ Simplified CI/CD workflows
- ✅ Long-term maintainability

---

## ✨ Core Features

### 🤖 AI-Powered Features
- **Intelligent Syllabus Parsing:** Uses Google Gemini AI to intelligently analyze syllabus documents (images/PDFs) and extract:
  - Course metadata (name, code, instructor, term dates)
  - Events with structured information (lectures, assignments, exams, projects)
  - Automatic date/time detection and normalization
  - Smart categorization of event types

- **AI Chat Assistant:** Natural language interface to query your schedule:
  - Ask questions about upcoming events, assignments, and exams
  - Get smart summaries of your courses and workload
  - Function-calling powered by Google Gemini for accurate database queries
  - Context-aware responses based on your actual calendar data

### 📚 Core Functionality
- **Smart Extraction:** Accurately parses class syllabuses to extract structured event data in JSON format
- **Intuitive Review/Edit Interface:** Modern, AI-inspired UI for reviewing and modifying extracted events before synchronization
- **2-Way Google Calendar Sync:** Bidirectional synchronization with Google Calendar API:
  - Push events to your personal Google Calendar
  - Automatic cleanup: removes Google Calendar events when courses/events are deleted
  - Conflict detection and resolution
- **Course Management:** CRUD operations for courses with full tracking:
  - Create and organize multiple courses
  - Track course status and metadata
  - Manage instructors and terms
- **Secure Authentication:** Enterprise-grade authentication and authorization:
  - OAuth 2.0 with Google Sign-In
  - JWT token-based session management
  - Password hashing with bcrypt
  - Role-based access control

---

🛠️ Technology Stack
Backend: Python, FastAPI, PostgreSQL, SQLAlchemy, Google Gemini API, Docker.
Frontend: Next.js, React, Tailwind CSS, FullCalendar, React Hook Form, Zod.
Infrastructure: Render (Backend), Vercel (Frontend), Supabase/Neon (DB).

### Infrastructure & Deployment
- **Local Development:** Docker Compose (PostgreSQL + Backend + Frontend)
- **Backend Hosting:** Render (free tier Python/FastAPI support)
- **Frontend Hosting:** Vercel (Next.js optimized CDN)
- **Database:** PostgreSQL on Supabase/Neon/Render
- **API Documentation:** FastAPI Swagger UI (auto-generated)
- **Version Control:** Git with GitHub integration

---

## 🚀 Local Development Setup

The project supports `docker-compose` to help you set up the environment in a flash.

**Prerequisites:** You must have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd syllabus-to-calendar
   ```

2. **Environment Configuration:**
   Create and populate your `.env` file in the root directory (refer to `.env.example`).
   
   **Required Environment Variables:**
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@db:5432/syllabus_db
   
   # Google APIs
   GEMINI_API_KEY=your_google_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   
   # Frontend
   FRONTEND_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   
   # JWT Secret
   SECRET_KEY=your-super-secret-key-for-jwt
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```
   
   For **hot-reloading** during development:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```
   
   Services will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432

4. **Manual Setup (without Docker):**
   
   **Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   
   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```


## 🌐 Production Deployment Guide

This section covers deploying to production using industry-standard services. The recommended stack is **PostgreSQL (Supabase/Neon) + Render (Backend) + Vercel (Frontend)**.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Internet Users                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐            ┌─────▼──────┐
   │  Vercel  │            │   Render   │
   │(Frontend)│            │ (Backend)  │
   └────┬─────┘            └─────┬──────┘
        │                         │
        │    NEXT_PUBLIC_API_URL  │
        └────────────────┬────────┘
                         │
                  ┌──────▼───────┐
                  │ Supabase/Neon│
                  │   (Database) │
                  └──────────────┘
```

### Prerequisites
- GitHub account with repository access
- Docker (for local testing before deployment)
- Render account ([render.com](https://render.com))
- Vercel account ([vercel.com](https://vercel.com))
- Database provider account (Supabase, Neon, or Render PostgreSQL)

### Step 1: Database Setup (PostgreSQL)

#### Option A: Supabase (Recommended for Beginners)
1. Visit [supabase.com](https://supabase.com) and sign up
2. Create a new organization and project
3. Navigate to **Settings > Database > Connection String** (use PostgreSQL URL)
4. Copy the connection string as `DATABASE_URL`
5. **Important:** If using connection pooling, disable SSL or set `?sslmode=require`

#### Option B: Neon (Serverless PostgreSQL)
1. Visit [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string from the **Dashboard > Connection String**
4. Append to the connection string if needed: `?sslmode=require`

#### Option C: Render PostgreSQL
1. On Render Dashboard, create **New > PostgreSQL**
2. Choose a database name and region
3. Copy the **External Database URL** from the connection info
4. Use this as `DATABASE_URL`

### Step 2: Backend Deployment (Render)

1. **Prepare Your Repository:**
   - Ensure `backend/requirements.txt` is up-to-date
   - Commit all changes to GitHub

2. **Create Render Web Service:**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click **New +** → **Web Service**
   - Connect your GitHub repository
   - Select the repository and branch

3. **Configure Build Settings:**
   - **Name:** `syllabus-to-calendar-api`
   - **Environment:** `Python 3`
   - **Region:** Same as database for lower latency
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables:**
   Click **Environment** and add:
   ```
   DATABASE_URL=<From Step 1>
   GEMINI_API_KEY=<Your Google Gemini API Key>
   GEMINI_MODEL=gemini-1.5-flash
   GOOGLE_CLIENT_ID=<Your OAuth Client ID>
   GOOGLE_CLIENT_SECRET=<Your OAuth Client Secret>
   SECRET_KEY=<Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))">
   FRONTEND_URL=<Your Vercel frontend URL>
   ```

5. **Deploy:**
   - Click **Create Web Service**
   - Render will build and deploy automatically
   - Once complete, copy the **URL** (e.g., `https://syllabus-api.onrender.com`)

6. **Verify Backend:**
   - Visit `https://<your-backend-url>/docs` to see API documentation
   - Test: `curl https://<your-backend-url>/health`

### Step 3: Frontend Deployment (Vercel)

1. **Deploy on Vercel:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Select the repository

2. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Set to `frontend` ⚠️ **This is mandatory**
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

3. **Set Environment Variables:**
   Click **Environment Variables** and add:
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend-url>/api/v1
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Your OAuth Client ID>
   ```

4. **Deploy:**
   - Click **Deploy**
   - Vercel automatically builds and deploys
   - Get your live URL (e.g., `https://syllabus-to-calendar.vercel.app`)

5. **Update Backend CORS:**
   - Go back to Render backend settings
   - Update `FRONTEND_URL` environment variable to your Vercel URL
   - Redeploy in Render

### Verification Checklist
- [ ] Backend API is responding at `/docs` endpoint
- [ ] Frontend loads without CORS errors
- [ ] Google OAuth sign-in works
- [ ] Can upload and parse syllabus documents
- [ ] Google Calendar sync works
- [ ] Events appear in Google Calendar

### Monitoring & Maintenance

#### Logs
- **Render Backend Logs:** Dashboard → Logs tab
- **Vercel Frontend Logs:** Dashboard → Deployments → Select deployment → Logs

#### Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Verify `FRONTEND_URL` in Render backend environment |
| Database connection timeout | Check `DATABASE_URL` format, ensure IP is whitelisted |
| Gemini API error | Verify `GEMINI_API_KEY` is valid and has quota remaining |
| Vercel root directory error | Set **Root Directory** to `frontend` in Vercel settings |
| OAuth redirect URI mismatch | Add both Render and Vercel URLs to Google OAuth redirect URIs |

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
pip install pytest pytest-asyncio

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_health.py -v
```

### Frontend Testing
```bash
cd frontend
npm install

# Run ESLint
npm run lint

# Type checking
npm run tsc

# Build test
npm run build
```

---
<<<<<<< HEAD

## 🔒 Security Considerations

1. **Environment Variables:** Never commit `.env` files to version control
2. **API Keys:** Rotate Google API keys periodically
3. **Database:** Use strong passwords and enable SSL connections
4. **CORS:** Configure CORS to only allow your frontend domain in production
5. **Rate Limiting:** Implement rate limiting on backend endpoints
6. **Input Validation:** All inputs are validated with Pydantic
7. **Password Security:** Passwords are hashed with bcrypt (12 rounds)
8. **JWT Expires:** Implement token expiration (recommended: 15 minutes)

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'app'`
```bash
# Solution: Ensure you're running from the backend directory
cd backend
python -m uvicorn app.main:app --reload
```

**Problem:** `PostgreSQL connection refused`
```bash
# Solution: Check DATABASE_URL format
# Correct format: postgresql://username:password@host:port/database
# With SSL: postgresql://username:password@host:port/database?sslmode=require
```

**Problem:** Gemini API quota exceeded
- Solution: Check your API quota at Google Cloud Console and upgrade if needed

### Frontend Issues

**Problem:** `NEXT_PUBLIC_API_URL is undefined`
```bash
# Solution: Verify environment variables in .env.local or Vercel settings
# Ensure NEXT_PUBLIC_ prefix is present
```

**Problem:** Google Calendar sync not working
- Solution: Verify OAuth credentials and that user has authorized the app

### Database Issues

**Problem:** Alembic migration failures
```bash
cd backend
alembic current  # Check current revision
alembic downgrade -1  # Rollback one migration if needed
```

---

## 📋 Future Roadmap

- [ ] Advanced AI features (course difficulty prediction, workload analysis)
- [ ] Mobile app (React Native)
- [ ] Bulk syllabus upload with batch processing
- [ ] Integration with other calendar services (Outlook, Apple Calendar)
- [ ] Study group matching based on courses
- [ ] Grade tracker integration
- [ ] Export to PDF/iCal formats
- [ ] Real-time collaboration features
- [ ] Machine learning for smart scheduling recommendations
- [ ] Support for multiple languages

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/syllabus-to-calendar.git
   cd syllabus-to-calendar
   ```

3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes** and commit:
   ```bash
   git commit -m "Add your descriptive commit message"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots if UI changes


## 📄 License

This project is licensed under the **MIT License** - see details below:

```
MIT License

Copyright (c) 2026 Syllabus to Calendar Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👥 Support & Community

- **Issues:** Report bugs on [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions:** Join our community on [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation:** Full API docs at `/docs` endpoint
- **Email:** nammount19@gmail.com


---

**Last Updated:** April 10, 2026
**Maintainer:** ARTHUR DOI / Organization  
**Status:** ✅ Active Development
=======
*ARTHUR DOI.*
>>>>>>> 8311aa6ccdca857815642f5a25e01ecc7b1f4849
