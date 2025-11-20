# Docker Setup for Subjourney

This directory contains Docker configuration for running Supabase and the backend locally using Docker Desktop (OrbStack).

## Prerequisites

- Docker Desktop or OrbStack installed and running
- Backend code available (either in `../Subjourney-Backend` or configured in `docker-compose.yml`)

## Quick Start

1. **Copy environment file**:
   ```bash
   cp docker/.env.example docker/.env
   ```

2. **Update passwords** (optional but recommended):
   Edit `docker/.env` and change `POSTGRES_PASSWORD` and `JWT_SECRET` to secure values.

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Check services are running**:
   ```bash
   docker-compose ps
   ```

5. **View logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f supabase-db
   docker-compose logs -f backend
   ```

## Services

### Supabase Services

- **supabase-db** (PostgreSQL): Port `54322`
- **supabase-kong** (API Gateway): Ports `8000` (HTTP), `8443` (HTTPS)
- **supabase-auth** (GoTrue): Port `9999` (internal)
- **supabase-rest** (PostgREST): Port `3000` (internal)
- **supabase-realtime**: Port `4000` (internal)
- **supabase-storage**: Port `5000` (internal)

### Backend Service

- **backend**: Port `8001`

## Accessing Services

- **Supabase API**: http://127.0.0.1:8000
- **Backend API**: http://localhost:8001
- **Database**: `localhost:54322` (user: `postgres`, password: from `.env`)

## Frontend Configuration

Update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=http://localhost:8001
```

## Backend Setup

The backend service expects code in one of these locations:

1. `../Subjourney-Backend` (sibling directory)
2. `./backend` (in project root)

Update the `volumes` section in `docker-compose.yml` if your backend is in a different location.

The backend should:
- Have a `package.json` with a `dev` script
- Listen on port `8001`
- Accept the environment variables provided in `docker-compose.yml`

## Database Access

Connect to the database using:

```bash
# Using psql
psql postgresql://postgres:your-password@localhost:54322/postgres

# Or using Docker
docker exec -it subjourney-supabase-db psql -U postgres
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## Troubleshooting

### Port conflicts

If ports are already in use, update the port mappings in `docker-compose.yml`:

```yaml
ports:
  - '8001:8001'  # Change 8001 to available port
```

### Backend not starting

1. Check backend logs: `docker-compose logs backend`
2. Verify backend code is in the expected location
3. Ensure backend has `package.json` with `dev` script
4. Check backend dependencies are installed

### Database connection issues

1. Verify database is healthy: `docker-compose ps`
2. Check database logs: `docker-compose logs supabase-db`
3. Verify password in `.env` matches `docker-compose.yml`

### Reset everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

