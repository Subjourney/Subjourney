import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    setLoading(true);

    try {
      // Sign up the user with first name in metadata
      const { data, error: signUpError } = await signUp(email, password, firstName);

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account');
        return;
      }

      if (data?.user) {
        // Team creation will be handled by database trigger
        // Wait a moment for the trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));

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
          Create Account
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
              htmlFor="firstName"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
              placeholder="Tom"
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
            {firstName && (
              <div
                style={{
                  marginTop: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Your team will be: <strong>
                  {firstName.toLowerCase().endsWith('s') 
                    ? `${firstName}' Team` 
                    : `${firstName}'s Team`}
                </strong>
              </div>
            )}
          </div>

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

          <div style={{ marginBottom: 'var(--spacing-md)' }}>
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
              minLength={6}
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
              htmlFor="confirmPassword"
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'var(--spacing-md)',
              background: loading ? 'var(--color-primary-light)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

