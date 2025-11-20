#!/bin/bash

# Apply database migrations to Docker Supabase
# This script runs the migrations from supabase/migrations against the Docker database

set -e

echo "🔄 Applying database migrations..."

# Get database password from .env or use default
if [ -f "docker/.env" ]; then
  source docker/.env
  DB_PASSWORD=${POSTGRES_PASSWORD:-your-super-secret-password}
else
  DB_PASSWORD=your-super-secret-password
fi

# Check if database is ready
echo "⏳ Waiting for database to be ready..."
until docker exec subjourney-supabase-db pg_isready -U postgres > /dev/null 2>&1; do
  echo "   Database not ready yet, waiting..."
  sleep 2
done

echo "✅ Database is ready"

# Apply migrations
echo "📝 Applying migrations..."

# Run initial schema migration
echo "   Applying initial_schema.sql..."
docker exec -i subjourney-supabase-db psql -U postgres -d postgres < supabase/migrations/20251120114258_initial_schema.sql

# Run auto_create_team migration
echo "   Applying auto_create_team_on_signup.sql..."
docker exec -i subjourney-supabase-db psql -U postgres -d postgres < supabase/migrations/20251120120000_auto_create_team_on_signup.sql

echo "✅ Migrations applied successfully!"
echo ""
echo "📊 You can verify by connecting to the database:"
echo "   docker exec -it subjourney-supabase-db psql -U postgres"


