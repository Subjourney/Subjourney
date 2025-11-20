import { useEffect, useState } from 'react';
import { teamsApi } from '../api';
import type { Team } from '../types';

/**
 * Hook to get the current user's primary team (first team they're a member of)
 * For now, returns the first team. Later can be enhanced to support team switching.
 */
export function useTeam() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Load user's teams from API when backend is ready
    // For now, we'll need to get it from Supabase directly or use a default
    // teamsApi
    //   .getMyTeams()
    //   .then((teams) => {
    //     if (teams.length > 0) {
    //       setTeam(teams[0]); // Use first team for now
    //     }
    //     setLoading(false);
    //   })
    //   .catch((err) => {
    //     setError(err.message || 'Failed to load team');
    //     setLoading(false);
    //   });

    // For now, try to get team from Supabase directly
    const loadTeam = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user's team memberships
        const { data: allMemberships, error: membershipError } = await supabase
          .from('team_memberships')
          .select('team_id')
          .eq('user_id', user.id)
          .limit(1);

        if (membershipError || !allMemberships || allMemberships.length === 0) {
          setLoading(false);
          return;
        }

        const teamId = allMemberships[0].team_id;

        // Get team data
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();

        if (teamError || !teamData) {
          setError('Team not found');
        } else {
          setTeam(teamData);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team');
        setLoading(false);
      }
    };

    loadTeam();
  }, []);

  return { team, loading, error };
}

