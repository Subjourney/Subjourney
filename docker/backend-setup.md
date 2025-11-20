# Backend Setup for Docker

## Backend Requirements

Your backend needs to be ready before it can run in Docker. Here's what's required:

## Required Structure

Your backend should have:

```
backend/
├── package.json          # With "dev" script
├── src/                  # Source code
└── ...                   # Other files
```

## package.json Requirements

Your `package.json` must have a `dev` script:

```json
{
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    // Your dependencies
  }
}
```

## Environment Variables

The backend will receive these environment variables from Docker:

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgres://postgres:password@supabase-db:5432/postgres`
- `SUPABASE_URL`: Supabase API gateway URL
  - Format: `http://supabase-kong:8000`
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `JWT_SECRET`: JWT signing secret
- `PORT`: Port to listen on (default: 8001)
- `NODE_ENV`: Environment (set to `development`)

## Database Connection Example

```javascript
// Using pg (node-postgres)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Using Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

## Port Configuration

The backend must listen on the port specified in `PORT` environment variable (default: 8001).

Example:

```javascript
const port = process.env.PORT || 8001;
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);
});
```

⚠️ **Important**: Bind to `0.0.0.0`, not `localhost`, to accept connections from Docker network.

## Docker Compose Configuration

Update `docker-compose.yml` to point to your backend:

```yaml
volumes:
  # Update this path to your backend location
  - /path/to/your/backend:/app
```

Common locations:
- `../Subjourney-Backend:/app` - Sibling directory
- `./backend:/app` - In project root
- `/absolute/path/to/backend:/app` - Absolute path

## Testing Backend Locally

Before running in Docker, test your backend locally:

1. Set environment variables:
   ```bash
   export DATABASE_URL="postgres://postgres:password@localhost:54322/postgres"
   export SUPABASE_URL="http://127.0.0.1:8000"
   export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

2. Run backend:
   ```bash
   npm run dev
   ```

3. Test API:
   ```bash
   curl http://localhost:8001/health
   ```

## If Backend Isn't Ready

If your backend isn't ready yet, you can:

1. **Comment out the backend service** in `docker-compose.yml`:
   ```yaml
   # backend:
   #   image: node:18-alpine
   #   ...
   ```

2. **Or leave it** - it will show a warning but won't break Supabase

3. **Start only Supabase**:
   ```bash
   docker-compose up -d supabase-db supabase-kong supabase-auth supabase-rest supabase-realtime supabase-storage
   ```

## Next Steps

Once backend is ready:

1. Update volume mount in `docker-compose.yml`
2. Start services: `docker-compose up -d`
3. Check logs: `docker-compose logs -f backend`
4. Test API: `curl http://localhost:8001/health`

