import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setError(error.message || 'Failed to sign in');
        return;
      }

      if (data?.user) {
        // Get user's team and redirect to dashboard
        const { data: memberships } = await supabase
          .from('team_memberships')
          .select('team_id, teams(slug)')
          .eq('user_id', data.user.id)
          .limit(1);

        if (memberships && memberships.length > 0 && (memberships[0] as any).teams) {
          const teamSlug = (memberships[0] as any).teams.slug;
          navigate(`/${teamSlug}/dashboard`);
        } else {
          // Fallback to home if no team found
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-0)',
        padding: 'var(--spacing-lg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-2xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1
          style={{
            margin: '0 0 var(--spacing-xl) 0',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            textAlign: 'center',
          }}
        >
          Sign In
        </h1>

        {error && (
          <div
            style={{
              padding: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-md)',
              background: 'var(--color-error-light)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            state={loading ? 'loading' : 'default'}
            disabled={loading}
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

