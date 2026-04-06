# Syllabus to Calendar 🗓️
## Domain: [https://syllabus-to-calendar-nine.vercel.app/]
## 📖 Project Overview
**Syllabus to Calendar** is an application designed to automate the extraction of class schedules and assignment deadlines from your course syllabuses and synchronize them directly with your Google Calendar.

The project is structured as a monorepo with decoupled Frontend and Backend architectures, ensuring easy branching, maintainability, and scalability.

## ✨ Key Features
- **Smart Extraction:** Parses syllabus documents to accurately extract events, class times, and assignment deadlines in a structured format.
- **Intuitive Review/Edit Interface:** Allows users to easily review and modify events before saving them. The UI is inspired by modern AI platforms for an optimal user experience.
- **2-Way Google Calendar Sync:** Integrates directly with the Google Calendar API to push events to your personal schedule. It automatically removes Google Calendar events if the corresponding course/event is deleted in the system.
- **Course Management:** Fully supports creating, deleting, and tracking the status of your courses.
- **Secure Authentication:** Protects user data with built-in database authentication and authorization flows.

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
   *Required keys include: Database credentials, Google OAuth scope/credentials.*

3. **Run with Docker:**
   ```bash
   docker-compose up --build
   ```
   - Run the Dev environment with `docker-compose.dev.yml` for hot-reloading:
     ```bash
     docker-compose -f docker-compose.dev.yml up --build
     ```
   *(The system will concurrently run the Postgres DB, Python Backend, and Next.js Frontend. Check your terminal output for the respective PORTs - typically 3000 for the web app).*

---

## 🌐 Deployment Guide

To deploy the project to production quickly without managing servers, we use the following stack: **Render (Backend) + Vercel (Frontend)**.

### 1. Database Deployment (PostgreSQL)
*Note: You can use Supabase, Neon, or Render's native PostgreSQL.*
- Provision a PostgreSQL instance.
- Retrieve the **Connection String** (`DATABASE_URL`).
- **💡 Pro Tip:** If using a connection pooler like pgBouncer (e.g., on Supabase), make sure to disable SSL mode on the pooler or append the required query parameters, otherwise the backend might throw *Postgres Authentication* or *Prepared Statements* errors.

### 2. Backend Deployment (Render)
Render offers an ideal free-tier environment for Python/FastAPI.
1. Create a new **Web Service** on the [Render Dashboard](https://render.com).
2. Connect this GitHub repository.
3. During configuration:
   - **Root Directory:** Enter `backend`
   - **Build Command:** `pip install -r requirements.txt` (Or the corresponding command depending on your package manager).
   - **Start Command:** (e.g., `uvicorn main:app --host 0.0.0.0 --port 10000`) or $PORT
4. Open the **Environment Variables** section and paste your `DATABASE_URL` along with any other necessary API Keys.
5. Deploy. Once the build is successful, save the assigned **Backend URL**.

### 3. Frontend Deployment (Vercel)
Vercel is purpose-built for Next.js, making the setup virtually `zero-config`.
1. Create a new Project on [Vercel](https://vercel.com) by importing your Git repository.
2. Initial configuration:
   - **Root Directory:** Set this to `frontend` (Crucial for Vercel to build the Next.js routes correctly).
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `<Backend URL from Step 2>`
   - Any necessary Google API Keys.
4. Click **Deploy**. Vercel will handle the entire build process natively and provide you with a live URL (e.g., `https://your-project.vercel.app`).

---
*Developed with ❤️ as a structured monorepo.*
