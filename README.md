# Subjourney

A clean, TypeScript-based journey mapping platform built with React 18, Vite, and React Flow.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop or OrbStack
- Backend code (Python/FastAPI) in `../Subjourney-React/backend`

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# For Docker Compose (recommended)
# Update .env with:
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=http://localhost:8001
```

### 3. Start Docker Services

```bash
# Using the start script
./docker/start.sh

# Or manually
cd docker
cp .env.example .env
# Edit .env if needed
cd ..
docker-compose up -d
```

### 4. Start Development Server

```bash
npm run dev
```

## Docker Setup

See [docker/README.md](docker/README.md) for detailed Docker setup instructions.

The Docker Compose setup includes:
- **Supabase** (PostgreSQL, Auth, REST API, Realtime, Storage)
- **Backend API** (Python/FastAPI)

## Project Structure

```
src/
├── api/              # Typed API client and services
├── components/       # React components
│   ├── canvas/       # React Flow canvas components
│   └── journey/      # Journey, Phase, Step, Card components
├── config/           # Environment configuration
├── hooks/            # React hooks
├── lib/              # Supabase and utilities
├── store/            # Zustand state management
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Documentation

- [Phase 1: Type Definitions](docs/phase-1-types.md)
- [Phase 2: API Layer](docs/phase-2-api.md)
- [Phase 3: Store](docs/phase-3-store.md)
- [Phase 4: Canvas Components](docs/phase-4-canvas.md)
- [Supabase Setup](docs/supabase-setup.md)
- [Docker Setup](docs/docker-setup.md)

## Development

### Running Locally

1. Start Docker services: `docker-compose up -d`
2. Start dev server: `npm run dev`
3. Open http://localhost:5173

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Features

- ✅ Type-safe TypeScript throughout
- ✅ React Flow canvas with dynamic sizing
- ✅ Drag-and-drop for phases, steps, and cards
- ✅ Supabase authentication
- ✅ Unified Zustand store
- ✅ Typed API client
- ✅ Dark theme with CSS variables
