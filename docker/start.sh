#!/bin/bash

# Start script for Docker Compose setup
# This script helps ensure everything is ready before starting

set -e

echo "🚀 Starting Subjourney Docker services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop or OrbStack."
  exit 1
fi

# Check if .env file exists
if [ ! -f "docker/.env" ]; then
  if [ -f "docker/.env.example" ]; then
    echo "📝 Creating docker/.env from template..."
    cp docker/.env.example docker/.env
    echo "⚠️  Please update docker/.env with your configuration (optional)"
  else
    echo "⚠️  docker/.env.example not found. Creating minimal docker/.env..."
    cat > docker/.env << EOF
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EOF
  fi
fi

# Check if backend exists
BACKEND_PATH="../Subjourney-React/backend"
if [ ! -d "$BACKEND_PATH" ]; then
  echo "⚠️  Backend not found at $BACKEND_PATH"
  echo "   Update docker-compose.yml to point to your backend location"
  echo "   Or comment out the backend service if not ready"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Start services
echo "🐳 Starting Docker Compose services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service status
echo "📊 Service status:"
docker-compose ps

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Service URLs:"
echo "   - Supabase API: http://127.0.0.1:8000"
echo "   - Backend API:  http://localhost:8001"
echo "   - Database:     localhost:54322"
echo ""
echo "📝 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"

