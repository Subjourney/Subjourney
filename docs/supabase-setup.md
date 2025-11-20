# Supabase Setup Guide

## Overview

This project uses Supabase for authentication and database access. For local development, Supabase runs in Docker via the Supabase CLI, which provides a complete local environment that mirrors production.

## Prerequisites

- Docker Desktop or OrbStack (for local development)
- Supabase CLI installed (see below)
- A Supabase account for production (sign up at https://supabase.com)

## Local Development Setup

### 1. Install Supabase CLI

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### 2. Initialize Supabase

```bash
supabase init
```

This creates a `supabase` directory with configuration files.

### 3. Start Supabase Services

```bash
supabase start
```

This command:
- Downloads and starts all Supabase services in Docker
- Initializes the database with required schemas and users
- Provides local credentials

### 4. Get Local Credentials

After starting, the CLI displays your local credentials:

```bash
supabase status
```

**Default local values:**
- **API URL**: `http://127.0.0.1:54321`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio**: `http://127.0.0.1:54323`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`

### 5. Configure Frontend

The frontend is already configured to use local Supabase by default. No `.env` file is required for local development.

If you need to override, create a `.env` file:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Production Setup

### 1. Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details (name, database password, region)
4. Wait for project creation (~2 minutes)

### 2. Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL**
   - **anon/public key** (under "Project API keys")

### 3. Configure Environment Variables

Create a `.env` file with production credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

## Managing Supabase Services

```bash
# Check status
supabase status

# Start services
supabase start

# Stop services
supabase stop

# View logs
supabase logs

# Reset database (⚠️ deletes all data)
supabase db reset
```

## Accessing Services

- **API**: http://127.0.0.1:54321
- **Studio (Dashboard)**: http://127.0.0.1:54323
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Mailpit (Email testing)**: http://127.0.0.1:54324

## Authentication

The project includes authentication utilities in `src/lib/auth.ts`:

```typescript
import { signIn, signUp, signOut, getCurrentUser } from '@/lib/auth';

// Sign in
const { data, error } = await signIn('user@example.com', 'password');

// Sign up
const { data, error } = await signUp('user@example.com', 'password');

// Sign out
await signOut();

// Get current user
const user = await getCurrentUser();
```

## React Hooks

Use the `useAuth` hook in your components:

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return <div>Welcome, {user?.email}!</div>;
}
```

## API Integration

The API client (`src/api/client.ts`) automatically uses Supabase authentication:

- Automatically retrieves access tokens from Supabase sessions
- Adds `Authorization: Bearer <token>` headers to all requests
- Handles token refresh on 401 responses
- Redirects to login on authentication failure

## Database Migrations

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db reset  # Resets and applies all migrations

# Or use db push for remote projects
supabase db push
```

## Troubleshooting

### Services won't start

- Ensure Docker is running
- Check ports 54321, 54322, 54323 are available
- Try `supabase stop` then `supabase start`

### "No authentication token available"

- Verify Supabase is running: `supabase status`
- Check browser console for connection errors
- Ensure `.env` has correct values (if using custom config)

### Database connection issues

- Verify database is healthy: `supabase status`
- Check database logs: `supabase logs db`
- Ensure you're using the correct connection string

### Local development issues

- Reset everything: `supabase stop && supabase start`
- Check Docker containers: `docker ps | grep supabase`
- View all logs: `supabase logs`

## Security Notes

- **Never commit `.env` files** - They're in `.gitignore`
- **Use environment variables** - Never hardcode credentials
- **Anon key is safe for client-side** - Designed to be public, protected by RLS policies
- **Service role key** - Never expose in client-side code

## Next Steps

1. Set up database schema (migrations)
2. Configure Row Level Security (RLS) policies
3. Set up authentication providers (email, OAuth, etc.)
4. Test authentication flow
