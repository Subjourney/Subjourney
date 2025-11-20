# Docker Setup Guide

## Overview

This guide explains how to run Supabase and the backend together using Docker Compose in Docker Desktop (OrbStack).

## Architecture

The Docker Compose setup includes:

1. **Supabase Stack**:
   - PostgreSQL database
   - Kong API gateway
   - GoTrue authentication
   - PostgREST REST API
   - Realtime server
   - Storage API

2. **Backend API**:
   - Node.js backend service
   - Connects to Supabase database
   - Exposes API on port 8001

## Prerequisites

- Docker Desktop or OrbStack installed and running
- Backend code available (see Backend Setup section)

## Setup Steps

### 1. Configure Environment

1. Copy the Docker environment template:
   ```bash
   cp docker/.env.example docker/.env
   ```

2. (Optional) Update passwords in `docker/.env`:
   - `POSTGRES_PASSWORD`: Database password
   - `JWT_SECRET`: JWT signing secret (min 32 characters)

### 2. Configure Backend Location

Edit `docker-compose.yml` and update the backend volume mount:

```yaml
volumes:
  # Option 1: Backend in sibling directory
  - ../Subjourney-Backend:/app:ro
  
  # Option 2: Backend in project root
  # - ./backend:/app
  
  # Option 3: Custom path
  # - /path/to/your/backend:/app
```

### 3. Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### 4. Verify Services

Check that all services are running:

```bash
docker-compose ps
```

You should see all services with status "Up" or "Up (healthy)".

### 5. Configure Frontend

Update your frontend `.env` file:

```env
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=http://localhost:8001
```

## Service URLs

- **Supabase API**: http://127.0.0.1:8000
- **Backend API**: http://localhost:8001
- **Database**: localhost:54322

## Backend Requirements

Your backend should:

1. **Have a `package.json`** with a `dev` script:
   ```json
   {
     "scripts": {
       "dev": "node server.js"
     }
   }
   ```

2. **Listen on port 8001** (or update docker-compose.yml)

3. **Accept environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SUPABASE_URL`: Supabase API URL
   - `SUPABASE_ANON_KEY`: Supabase anonymous key
   - `SUPABASE_SERVICE_KEY`: Supabase service role key
   - `JWT_SECRET`: JWT signing secret

4. **Connect to database**:
   ```javascript
   const dbUrl = process.env.DATABASE_URL;
   // Use this to connect to PostgreSQL
   ```

## Database Access

### Using psql

```bash
psql postgresql://postgres:your-password@localhost:54322/postgres
```

### Using Docker

```bash
docker exec -it subjourney-supabase-db psql -U postgres
```

### Using a GUI Tool

- Host: `localhost`
- Port: `54322`
- Database: `postgres`
- Username: `postgres`
- Password: From `docker/.env` (`POSTGRES_PASSWORD`)

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f supabase-db

# Restart a service
docker-compose restart backend

# Rebuild services
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v
```

## Troubleshooting

### Services won't start

1. Check Docker is running: `docker ps`
2. Check port conflicts: Ensure ports 8000, 8001, 54322 are available
3. Check logs: `docker-compose logs`

### Backend not connecting to database

1. Verify database is healthy: `docker-compose ps supabase-db`
2. Check database logs: `docker-compose logs supabase-db`
3. Verify `DATABASE_URL` in backend environment
4. Test connection: `docker exec -it subjourney-supabase-db psql -U postgres`

### Backend not found

1. Check volume mount in `docker-compose.yml`
2. Verify backend directory exists
3. Check backend logs: `docker-compose logs backend`

### Port already in use

Update port mappings in `docker-compose.yml`:

```yaml
ports:
  - '8001:8001'  # Change to available port
```

## Data Persistence

Database and storage data are persisted in Docker volumes:

- `supabase-db-data`: PostgreSQL data
- `supabase-storage-data`: Storage files

To reset everything:

```bash
docker-compose down -v
```

⚠️ **Warning**: This deletes all data!

## Next Steps

1. Run database migrations
2. Set up Row Level Security (RLS) policies
3. Configure authentication providers
4. Test API endpoints

