#!/bin/bash

# Environment Setup Script
# This script helps you set up the required environment variables

set -e

ENV_FILE=".env.local"
EXAMPLE_FILE=".env.example"

echo "🔧 Setting up environment variables..."
echo ""

# Check if .env.local already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Keeping existing $ENV_FILE"
        exit 0
    fi
fi

# Copy example file if it exists
if [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "✅ Created $ENV_FILE from $EXAMPLE_FILE"
else
    # Create basic .env.local file
    cat > "$ENV_FILE" << EOF
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=syllabus_calendar
DB_PORT=3306

# JWT Secret (REQUIRED)
# Generate a strong secret using: npm run generate:jwt-secret
NEXTAUTH_SECRET=

# Application Environment
NODE_ENV=development
EOF
    echo "✅ Created basic $ENV_FILE"
fi

echo ""
echo "📝 Please edit $ENV_FILE and fill in the following:"
echo ""
echo "  1. Database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)"
echo "  2. JWT Secret (NEXTAUTH_SECRET) - generate with: npm run generate:jwt-secret"
echo ""
echo "After editing, restart your development server."
echo ""

