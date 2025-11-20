# Subjourney Backend

Minimal FastAPI backend for the Subjourney platform, integrated with Supabase.

## Features

- FastAPI-based REST API
- Supabase integration for database and authentication
- Core entities: Teams, Projects, Journeys, Phases, Steps, Cards, Attributes, Flows, Comments
- JWT-based authentication
- Team-based access control

## Setup

### Prerequisites

- Python 3.11+
- Supabase running locally (via `supabase start`) or production instance

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables (optional, defaults work for local Supabase):
```bash
# .env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=8001
```

3. Run the server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /api/health/supabase` - Supabase connection test

### Teams
- `POST /api/teams/create` - Create team
- `GET /api/teams/mine` - Get user's teams
- `GET /api/teams/{team_id}` - Get team by ID

### Projects
- `POST /api/projects/create` - Create project
- `GET /api/projects/team/{team_id}` - Get team projects
- `GET /api/projects/{project_id}` - Get project by ID

### Journeys
- `POST /api/journeys/create` - Create journey
- `GET /api/journeys/project/{project_id}` - Get project journeys
- `GET /api/journeys/{journey_id}` - Get journey by ID

### Phases
- `POST /api/phases/create` - Create phase
- `GET /api/phases/journey/{journey_id}` - Get journey phases
- `PATCH /api/phases/{phase_id}` - Update phase
- `DELETE /api/phases/{phase_id}` - Delete phase

### Steps
- `POST /api/steps/create` - Create step
- `GET /api/steps/phase/{phase_id}` - Get phase steps
- `PATCH /api/steps/{step_id}` - Update step
- `DELETE /api/steps/{step_id}` - Delete step

### Cards
- `POST /api/cards/create` - Create card
- `GET /api/cards/step/{step_id}` - Get step cards
- `PATCH /api/cards/{card_id}` - Update card
- `DELETE /api/cards/{card_id}` - Delete card

### Attributes
- `POST /api/attributes/create` - Create attribute
- `GET /api/attributes/team/{team_id}` - Get team attributes

### Flows
- `POST /api/flows/create` - Create flow
- `GET /api/flows/journey/{journey_id}` - Get journey flows

### Comments
- `POST /api/comments/create` - Create comment
- `GET /api/comments/target/{target_type}/{target_id}` - Get target comments
- `PATCH /api/comments/{comment_id}` - Update comment
- `DELETE /api/comments/{comment_id}` - Delete comment

## Authentication

All endpoints (except health checks) require authentication via Bearer token:

```
Authorization: Bearer <supabase-jwt-token>
```

The token is verified using Supabase's authentication service.

## Development

The backend uses hot-reload by default when running with `--reload` flag.

For Docker development, see the main project's `docker-compose.yml`.

