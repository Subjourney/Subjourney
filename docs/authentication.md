# Authentication

## Overview

Subjourney uses Supabase Auth for user authentication. When users register, a team is automatically created for them, and they are added as the team owner. This ensures every user has their own workspace from day one.

## Authentication Flow

### Registration
1. User provides email, password, and first name
2. Supabase creates the user account
3. Database trigger automatically creates a team
4. User is added as team owner
5. User is redirected to the home page

### Login
1. User provides email and password
2. Supabase authenticates the user
3. User is redirected to the home page

### Logout
1. User clicks sign out
2. Supabase session is cleared
3. User is redirected to login page

## Auto Team Creation

When a user registers, a database trigger (`create_team_for_new_user`) automatically:

1. **Extracts first name** from user metadata (or uses email prefix as fallback)
2. **Generates team name**: `"{FirstName}'s Team"` (e.g., "Tom's Team")
3. **Creates team** with auto-generated slug (e.g., "toms-team")
4. **Creates team membership** with user as owner

### Team Naming Rules
- Regular names: "Tom" → "Tom's Team" → slug: "toms-team"
- Names ending in 's': "James" → "James' Team" → slug: "james-team"
- Slug uniqueness: If slug exists, appends number (e.g., "toms-team-1")

## Pages

### Login Page (`/login`)
- Email and password input
- Link to register page
- Redirects to home if already authenticated
- Error handling for failed login attempts

### Register Page (`/register`)
- First name, email, and password inputs
- Password confirmation
- Preview of team name that will be created
- Link to login page
- Redirects to home if already authenticated

### Home Page (`/`)
- Protected route (requires authentication)
- Shows user email in header
- Sign out button
- Main application content

## Protected Routes

The `ProtectedRoute` component wraps routes that require authentication:

```typescript
<ProtectedRoute>
  <HomePage />
</ProtectedRoute>
```

- Shows loading state while checking authentication
- Redirects to `/login` if not authenticated
- Renders children if authenticated

## Authentication Utilities

### `src/lib/auth.ts`
Core authentication functions:
- `signIn(email, password)` - Sign in with email/password
- `signUp(email, password, firstName?)` - Register new user
- `signOut()` - Sign out current user
- `getSession()` - Get current session
- `getCurrentUser()` - Get current user
- `isAuthenticated()` - Check if user is authenticated

### `src/hooks/useAuth.ts`
React hooks for authentication:
- `useAuth()` - Returns `{ user, session, loading, isAuthenticated }`
- `useUser()` - Returns `{ user, loading, isAuthenticated }`

## Database Triggers

### Auto Team Creation Trigger
Located in: `supabase/migrations/20251120120000_auto_create_team_on_signup.sql`

**Function**: `create_team_for_new_user()`
- Triggered: `AFTER INSERT ON auth.users`
- Creates team with name based on first name
- Creates team membership with user as owner
- Uses `SECURITY DEFINER` to bypass RLS for team creation

### Slug Generation
**Function**: `generate_team_slug(team_name TEXT)`
- Generates URL-friendly slug from team name
- Ensures uniqueness by appending numbers if needed
- Used by `team_slug_trigger` on team creation

**Trigger**: `team_slug_trigger`
- Triggered: `BEFORE INSERT OR UPDATE ON teams`
- Auto-generates slug if not provided
- Uses `generate_team_slug()` function

## Routing

Routes are defined in `src/App.tsx`:

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
</Routes>
```

- Public routes: `/login`, `/register`
- Protected routes: `/` (and any future protected routes)
- Default redirect: Unknown routes redirect to `/`

## User Metadata

When registering, first name is stored in user metadata:

```typescript
await signUp(email, password, firstName);
// Stores: { first_name: firstName } in user_metadata
```

The database trigger reads this from `raw_user_meta_data->>'first_name'`.

## Team Access

After registration/login, users can:
- Access their own team (as owner)
- Create projects within their team
- Create journeys, phases, steps, and cards
- All data is scoped to their team via `team_id`

## Security

- **Password requirements**: Minimum 6 characters (enforced by Supabase)
- **Session management**: Handled by Supabase (stored in localStorage)
- **JWT tokens**: Automatically included in API requests
- **RLS policies**: Team-based access control on all tables
- **Protected routes**: Client-side route protection with redirect

## Troubleshooting

### "500 Internal Server Error" on registration
- Check database trigger is installed: `supabase db reset`
- Verify trigger function has correct permissions
- Check Supabase logs: `docker logs supabase_auth_Subjourney`

### User not redirected after login
- Check `useAuth` hook is working correctly
- Verify session is being stored
- Check browser console for errors

### Team not created on registration
- Verify trigger exists: Check migration was applied
- Check database logs for trigger execution
- Verify user metadata includes `first_name`

### Cannot access team data
- Check RLS policies allow team member access
- Verify team membership was created
- Check user is authenticated: `useAuth().isAuthenticated`

## Next Steps

After authentication is set up:
1. Implement team switching (if user belongs to multiple teams)
2. Add team invitation system
3. Implement password reset flow
4. Add email verification (if required)
5. Implement social login (OAuth providers)

