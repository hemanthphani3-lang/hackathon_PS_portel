import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, RotateCcw, Shield, Users, Target, UserX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Team {
  id: string;
  team_name: string;
  selected_mission_id: string | null;
  updated_at: string;
  created_at: string;
  is_eliminated: boolean | null;
}

interface Mission {
  id: string;
  title: string;
  current_slots: number;
  max_slots: number;
}

const AdminDashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [resetting, setResetting] = useState<string | null>(null);
  const [eliminating, setEliminating] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.isAdmin) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      const [teamsRes, missionsRes] = await Promise.all([
        supabase.from('teams').select('id, team_name, selected_mission_id, updated_at, created_at, is_eliminated').order('team_name'),
        supabase.from('problem_statements').select('id, title, current_slots, max_slots').order('created_at'),
      ]);
      if (teamsRes.data) {
        // Only show teams that have logged in at least once or claimed a mission
        // In our case, every login updates 'updated_at'
        setTeams(teamsRes.data.filter(t => t.selected_mission_id !== null || t.updated_at !== t.created_at));
      }
      if (missionsRes.data) setMissions(missionsRes.data);
    };

    fetchData();

    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, navigate]);

  const handleReset = async (teamId: string) => {
    setResetting(teamId);

    // 1. Reset elimination status
    const { error: elimError } = await supabase
      .from('teams')
      .update({ is_eliminated: false })
      .eq('id', teamId);

    if (elimError) {
      toast.error('Failed to reset elimination status');
      setResetting(null);
      return;
    }

    // 2. Reset mission (call RPC)
    const { data, error: rpcError } = await supabase.rpc('reset_team_mission', { p_team_id: teamId });
    setResetting(null);

    const result = data as { success?: boolean; message?: string };

    // We ignore the "no mission" error if success is false but message indicates no mission
    if (rpcError) {
      toast.error(rpcError.message || 'Mission reset failed');
    } else if (!result?.success && result?.message !== 'Team has no mission to reset') {
      toast.error(result?.message || 'Reset failed');
    } else {
      toast.success('Team status reset');
    }
  };

  const handleEliminate = async (teamId: string, teamName: string) => {
    if (!window.confirm(`CRITICAL: Are you sure you want to ELIMINATE "${teamName}"? This action is irreversible.`)) {
      return;
    }

    setEliminating(teamId);
    const { error } = await supabase
      .from('teams')
      .update({ is_eliminated: true })
      .eq('id', teamId);
    setEliminating(null);

    if (error) {
      toast.error('Elimination failed: ' + error.message);
    } else {
      toast.success(`${teamName} has been ELIMINATED`);
    }
  };



  const getMissionTitle = (missionId: string | null) => {
    if (!missionId) return '—';
    return missions.find(m => m.id === missionId)?.title || 'Unknown';
  };

  const claimedTeams = teams.filter(t => t.selected_mission_id);
  const unclaimedTeams = teams.filter(t => !t.selected_mission_id);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-mono-display text-primary tracking-wider">ADMIN — MISSION CONTROL</h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mb-2">
            <Users className="w-3 h-3" /> TOTAL TEAMS
          </div>
          <div className="text-2xl font-mono-display text-primary">{teams.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mb-2">
            <Target className="w-3 h-3" /> MISSIONS CLAIMED
          </div>
          <div className="text-2xl font-mono-display text-secondary">{claimedTeams.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mb-2">
            <Target className="w-3 h-3" /> PENDING
          </div>
          <div className="text-2xl font-mono-display text-foreground">{unclaimedTeams.length}</div>
        </div>
      </div>

      {/* Mission Status */}
      <div className="glass-card p-5 mb-8">
        <h2 className="font-mono-display text-sm text-primary tracking-wider mb-4">MISSION STATUS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {missions.map(m => (
            <div key={m.id} className={`p-3 rounded border text-center ${m.current_slots >= m.max_slots
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-primary/20 bg-primary/5'
              }`}>
              <div className="text-xs font-mono-display text-muted-foreground truncate mb-1">{m.title}</div>
              <div className={`text-lg font-mono-display font-bold ${m.current_slots >= m.max_slots ? 'text-destructive' : 'text-primary'
                }`}>
                {m.current_slots}/{m.max_slots}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teams Table */}
      <div className="glass-card p-5">
        <h2 className="font-mono-display text-sm text-primary tracking-wider mb-4">TEAM ROSTER</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10">
                <th className="text-left py-2 px-3 font-mono-display text-xs text-muted-foreground tracking-wider">#</th>
                <th className="text-left py-2 px-3 font-mono-display text-xs text-muted-foreground tracking-wider">TEAM</th>
                <th className="text-left py-2 px-3 font-mono-display text-xs text-muted-foreground tracking-wider">MISSION</th>
                <th className="text-left py-2 px-3 font-mono-display text-xs text-muted-foreground tracking-wider">STATUS</th>
                <th className="text-right py-2 px-3 font-mono-display text-xs text-muted-foreground tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => (
                <tr key={team.id} className="border-b border-muted/20 hover:bg-muted/20">
                  <td className="py-2 px-3 font-mono-display text-xs text-muted-foreground">{i + 1}</td>
                  <td className={`py-2 px-3 font-mono-display text-sm ${team.is_eliminated ? 'text-destructive/50 line-through' : ''}`}>
                    {team.team_name}
                  </td>
                  <td className="py-2 px-3 font-mono-display text-xs text-muted-foreground">
                    {getMissionTitle(team.selected_mission_id)}
                  </td>
                  <td className="py-2 px-3">
                    {team.is_eliminated ? (
                      <span className="text-xs font-mono-display text-destructive animate-pulse">ELIMINATED</span>
                    ) : team.selected_mission_id ? (
                      <span className="text-xs font-mono-display text-secondary">CLAIMED</span>
                    ) : (
                      <span className="text-xs font-mono-display text-muted-foreground">PENDING</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right flex items-center justify-end gap-2">
                    {(team.selected_mission_id || team.is_eliminated) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(team.id)}
                        disabled={resetting === team.id || eliminating === team.id}
                        className="font-mono-display text-xs h-7 border-primary/20"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        {resetting === team.id ? 'RESETTING...' : 'RESET'}
                      </Button>
                    )}
                    {!team.is_eliminated && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleEliminate(team.id, team.team_name)}
                        disabled={eliminating === team.id || resetting === team.id}
                        className="font-mono-display text-xs h-7 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {eliminating === team.id ? 'ELIMINATING...' : 'ELIMINATE'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
