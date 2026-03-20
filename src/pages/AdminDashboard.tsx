import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, RotateCcw, Shield, Users, Target, UserX, Trash2, Upload, CheckCircle2, Pause, Play } from 'lucide-react';
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
  is_pushed: boolean | null;
  is_locked: boolean | null;
}

const AdminDashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [resetting, setResetting] = useState<string | null>(null);
  const [eliminating, setEliminating] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);

  const fetchData = async () => {
    const [teamsRes, missionsRes] = await Promise.all([
      supabase.from('teams').select('id, team_name, selected_mission_id, updated_at, created_at, is_eliminated')
        .order('is_eliminated', { ascending: true })
        .order('team_name', { ascending: true }),
      supabase.from('problem_statements').select('id, title, current_slots, max_slots, is_pushed, is_locked').order('created_at'),
    ]);
    if (teamsRes.data) {
      // Only show teams that have logged in at least once or claimed a mission
      // In our case, every login updates 'updated_at'
      setTeams(teamsRes.data.filter(t => t.selected_mission_id !== null || t.updated_at !== t.created_at));
    }
    if (missionsRes.data) setMissions(missionsRes.data);
  };

  useEffect(() => {
    if (!session?.isAdmin) {
      navigate('/');
      return;
    }

    fetchData();

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

  const handlePush = async (missionId: string, currentPushed: boolean) => {
    const { error } = await supabase
      .from('problem_statements')
      .update({ is_pushed: !currentPushed })
      .eq('id', missionId);

    if (error) {
      toast.error('Failed to update mission status');
    } else {
      toast.success(currentPushed ? 'Mission data hidden from teams' : 'Mission data initialized and broadcasted');
    }
  };

  const handlePushAll = async () => {
    if (!window.confirm('CRITICAL: Initialize all mission nodes and broadcast data to teams?')) return;

    const { error } = await supabase
      .from('problem_statements')
      .update({ is_pushed: true })
      .not('id', 'is', null);

    if (error) {
      toast.error('Failed to initialize mission data');
    } else {
      toast.success('All mission data initialized and broadcasted');
    }
  };


  const handleToggleLock = async (pushedMissions: Mission[]) => {
    const anyLocked = pushedMissions.some(m => m.is_locked);
    const newState = !anyLocked;

    if (newState && !window.confirm('CRITICAL: Freeze all mission selection nodes? Teams will not be able to claim new missions.')) return;
    if (!newState && !window.confirm('Restore mission selection nodes?')) return;

    const { error } = await supabase
      .from('problem_statements')
      .update({ is_locked: newState })
      .eq('is_pushed', true);

    if (error) {
      toast.error('Failed to update system state');
    } else {
      toast.success(newState ? 'DATA STREAM FROZEN' : 'DATA STREAM RESTORED');
    }
  };

  const handleResetMissions = async () => {
    if (!window.confirm('WARNING: This will RESET ALL MISSIONS, CLEAR ALL CLAIMED CODES, and HIDE all nodes from teams. Continue?')) return;

    // 1. Reset all missions
    const { error: missionError } = await supabase
      .from('problem_statements')
      .update({ is_pushed: false, is_locked: false, current_slots: 0 })
      .not('id', 'is', null);

    // 2. Clear all team claims
    const { error: teamError } = await supabase
      .from('teams')
      .update({ selected_mission_id: null })
      .not('id', 'is', null);

    if (missionError || teamError) {
      console.error('Reset error:', { missionError, teamError });
      toast.error('Failed to fully reset mission system');
    } else {
      toast.success('MISSION SYSTEM RESET TO BEGINNING STATE');
      // Small delay to allow Postgres triggers (if any) to settle
      setTimeout(() => fetchData(), 500);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamPassword.trim()) {
      toast.error('Team name and password are required');
      return;
    }

    setAddingTeam(true);
    const { data, error: rpcError } = await supabase.rpc('create_team_node', {
      p_team_name: newTeamName.trim(),
      p_password: newTeamPassword.trim()
    });

    setAddingTeam(false);

    const result = data as { success?: boolean; message?: string };

    if (rpcError || !result?.success) {
      toast.error('Failed to add team: ' + (result?.message || rpcError?.message || 'Unknown error'));
    } else {
      toast.success(`Team "${newTeamName}" added successfully`);
      setNewTeamName('');
      setNewTeamPassword('');
      fetchData();
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

      {/* Add Team Section */}
      <div className="glass-card p-5 mb-8 border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
        <h2 className="font-mono-display text-sm text-primary tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> ADD NEW TEAM
        </h2>
        <form onSubmit={handleAddTeam} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-mono-display text-muted-foreground mb-1.5 tracking-wider uppercase">Team Name</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. CyberKnights"
              className="w-full bg-black/40 border border-primary/30 rounded px-3 py-2 text-sm font-mono-display text-primary placeholder:text-primary/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-mono-display text-muted-foreground mb-1.5 tracking-wider uppercase">Access Key (Password)</label>
            <input
              type="text"
              value={newTeamPassword}
              onChange={(e) => setNewTeamPassword(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full bg-black/40 border border-primary/30 rounded px-3 py-2 text-sm font-mono-display text-primary placeholder:text-primary/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={addingTeam}
            className="font-mono-display text-xs px-8 py-2.5 h-auto bg-primary text-black hover:bg-primary/80 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)]"
          >
            {addingTeam ? 'PROVISIONING...' : 'ADD TEAM NODE'}
          </Button>
        </form>
      </div>

      {/* Mission Status */}
      <div className="glass-card p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono-display text-sm text-primary tracking-wider">MISSION STATUS</h2>
          <div className="flex gap-2">
            {missions.some(m => !m.is_pushed) ? (
              <Button
                variant="outline"
                onClick={handlePushAll}
                className="font-mono-display text-xs px-6 py-4 h-auto border-primary/50 text-primary hover:bg-primary hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.1)] hover:shadow-[0_0_25px_rgba(var(--primary),0.3)] uppercase tracking-[0.2em]"
              >
                BROADCAST MISSIONS
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleToggleLock(missions.filter(m => m.is_pushed))}
                className={`font-mono-display text-xs px-6 py-4 h-auto transition-all duration-300 uppercase tracking-[0.2em] ${missions.some(m => m.is_pushed && m.is_locked)
                  ? 'border-secondary/50 text-secondary hover:bg-secondary hover:text-black shadow-[0_0_15px_rgba(var(--secondary),0.1)]'
                  : 'border-destructive/50 text-destructive hover:bg-destructive hover:text-black shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                  }`}
              >
                {missions.some(m => m.is_pushed && m.is_locked) ? (
                  <><Play className="w-3 h-3 mr-2" /> RESTORE STREAM</>
                ) : (
                  <><Pause className="w-3 h-3 mr-2" /> FREEZE DATA STREAM</>
                )}
              </Button>
            )}

            {missions.some(m => m.is_pushed) && (
              <Button
                variant="outline"
                onClick={handleResetMissions}
                className="font-mono-display text-xs px-6 py-4 h-auto border-destructive/30 text-destructive/70 hover:bg-destructive hover:text-black transition-all duration-300 uppercase tracking-[0.2em]"
              >
                RESET MISSION DATA
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {missions.map(m => (
            <div key={m.id} className={`p-4 rounded-lg border text-center relative group transition-all duration-300 ${m.is_pushed
              ? (m.is_locked || m.current_slots >= 4)
                ? 'border-destructive/30 bg-destructive/5 opacity-80'
                : 'border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.05)]'
              : 'border-primary/10 bg-transparent opacity-40'
              }`}>
              <div className="text-xs font-mono-display text-muted-foreground truncate mb-1">{m.title}</div>
              <div className={`text-lg font-mono-display font-bold ${(m.is_locked || m.current_slots >= 4) ? 'text-destructive/70' : 'text-primary'
                }`}>
                {(m.is_locked || m.current_slots >= 4) ? 'LOCKED' : `${m.current_slots}/${m.max_slots}`}
              </div>

              <button
                onClick={() => handlePush(m.id, !!m.is_pushed)}
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border shadow-2xl transition-all flex items-center justify-center ${m.is_pushed
                  ? 'bg-primary border-primary text-black scale-110 shadow-[0_0_12px_rgba(var(--primary),0.4)]'
                  : 'bg-background border-primary/20 text-muted-foreground hover:scale-110'
                  }`}
                title={m.is_pushed ? "Deactivate Mission" : "Activate Mission"}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${m.is_pushed ? 'bg-black' : 'bg-primary/40'}`} />
              </button>
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
