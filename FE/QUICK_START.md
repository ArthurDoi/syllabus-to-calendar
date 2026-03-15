# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm 9+
- MySQL database server running
- Database created (or create one named `syllabus_calendar`)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

**Option A: Use the setup script (Recommended)**

```bash
npm run setup:env
```

Then edit `.env.local` with your database credentials.

**Option B: Create `.env.local` manually**

Create a file named `.env.local` in the `FE/` directory with:

```bash
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password-here
DB_NAME=syllabus_calendar
DB_PORT=3306

# JWT Secret (REQUIRED)
# Generate one with: npm run generate:jwt-secret
NEXTAUTH_SECRET=your-generated-secret-here

# Application Environment
NODE_ENV=development
```

**Generate JWT Secret:**

```bash
npm run generate:jwt-secret
```

Copy the output and add it to `.env.local` as `NEXTAUTH_SECRET`.

### 3. Initialize Database

```bash
npm run db:init
```

This will create all necessary tables in your database.

### 4. Test Database Connection

```bash
npm run db:test
```

You should see: `✅ Connection successful`

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Troubleshooting

### "Missing required environment variable: DB_HOST"

- Ensure `.env.local` exists in the `FE/` directory
- Check that all required variables are set
- Restart the development server after creating/editing `.env.local`

### "Connection failed" when testing database

- Verify MySQL server is running
- Check database credentials in `.env.local`
- Ensure the database exists (create it if needed: `CREATE DATABASE syllabus_calendar;`)
- Check firewall/network settings if using remote database

### "JWT secret is too short"

- Generate a new secret: `npm run generate:jwt-secret`
- Ensure it's at least 32 characters long
- Update `NEXTAUTH_SECRET` in `.env.local`

## Next Steps

1. Visit `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Upload a syllabus or create a course manually
4. View your courses and tasks

For more details, see [docs/environment-setup.md](./docs/environment-setup.md)

