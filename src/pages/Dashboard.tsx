import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EventLogSidebar from '@/components/EventLogSidebar';
import MissionCard from '@/components/MissionCard';
import { Radio, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  max_slots: number;
  current_slots: number;
  category: string | null;
}

const TypewriterBriefing: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset on text change
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15); // Faster speed for long briefings
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}<span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse" /></span>;
};

const Dashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(session?.selectedMissionId || null);
  const [isEliminated, setIsEliminated] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  // Team-private activity log — only this team's own events
  const [activityLog, setActivityLog] = useState<{ text: string; time: string }[]>(() => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    return [{ text: 'Secure session established', time: now }];
  });

  const addActivity = (text: string) => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    setActivityLog(prev => [{ text, time: now }, ...prev].slice(0, 15));
  };

  useEffect(() => {
    if (!session || session.isAdmin) {
      navigate('/');
      return;
    }

    // Fetch missions
    const fetchMissions = async () => {
      const { data } = await supabase.from('problem_statements').select('*').order('created_at');
      if (data) setMissions(data);
    };

    // Check current team selection — always sync, even if null (admin may have reset)
    const checkSelection = async () => {
      const { data } = await supabase.from('teams').select('selected_mission_id, is_eliminated').eq('id', session.teamId).single();
      setSelectedMission(data?.selected_mission_id ?? null);
      setIsEliminated(!!data?.is_eliminated);
    };

    fetchMissions();
    checkSelection();

    // Realtime subscription for missions
    const channel = supabase
      .channel('mission-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'problem_statements' }, (payload) => {
        setMissions(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as Mission : m));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        const newData = payload.new as { id: string; selected_mission_id: string | null; team_name: string; is_eliminated: boolean | null };

        // Only process events for THIS team
        if (newData.id === session.teamId) {
          setSelectedMission(newData.selected_mission_id);
          setIsEliminated(!!newData.is_eliminated);

          if (newData.is_eliminated) {
            toast.error('ACCESS DENIED: TEAM ELIMINATED', { duration: 10000 });
          } else if (!newData.selected_mission_id) {
            toast.info('Your mission selection has been reset by an admin.');
            addActivity('Mission reset by administrator');
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, navigate]);

  const handleSelectMission = async (missionId: string) => {
    if (!session) return;
    setClaiming(missionId);

    const { data, error } = await supabase.rpc('claim_mission', {
      p_team_id: session.teamId,
      p_mission_id: missionId,
    });

    setClaiming(null);

    const result = data as any;

    if (error) {
      toast.error('Failed to claim mission');
      addActivity('Mission claim failed — slot unavailable');
      return;
    }

    if (result?.success) {
      setSelectedMission(missionId);
      toast.success('Mission claimed successfully!');
      const title = missions.find(m => m.id === missionId)?.title || 'Mission';
      addActivity(`Claimed: ${title}`);
    } else {
      toast.error(result?.message || 'Failed to claim mission');
      addActivity('Mission claim failed — already taken');
    }
  };



  return (
    <div className="min-h-screen flex">
      {isEliminated && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-destructive/40 via-transparent to-transparent" />
          </div>

          <div className="relative animate-pulse flex flex-col items-center">
            <div className="mb-8 p-6 rounded-full border-4 border-destructive bg-destructive/10">
              <AlertTriangle className="w-24 h-24 text-destructive" strokeWidth={2.5} />
            </div>

            <h1 className="text-7xl md:text-9xl font-mono-display font-bold text-destructive tracking-[0.2em] mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              ELIMINATED
            </h1>

            <div className="w-full max-w-2xl h-1 bg-destructive/30 mb-8 overflow-hidden relative">
              <div className="absolute inset-0 bg-destructive transform -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>

            <p className="text-xl md:text-2xl font-mono-display text-destructive/80 tracking-widest uppercase mb-12">
              Unauthorized access — Terminal locked
            </p>

            <div className="grid grid-cols-2 gap-8 text-destructive/40 font-mono text-xs tracking-[0.5em] uppercase">
              <div className="animate-pulse">System Override Active</div>
              <div className="animate-pulse [animation-delay:500ms]">Network Disconnected</div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}} />
        </div>
      )}

      <EventLogSidebar activityLog={activityLog} />

      <div className="ml-72 flex-1 p-6 relative">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.3] z-0 overflow-hidden text-center p-20">
          <img
            src="/ctf_logo2.jpg"
            alt=""
            className="w-full max-w-md object-contain saturate-150 contrast-110"
          />
        </div>

        {/* Header */}
        {/* Mission Content */}
        {selectedMission ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
            {/* Active Mission Header */}
            <div className="flex-1 glass-card-refined border-secondary/20 bg-secondary/5 rounded-none border-l-4 border-l-secondary flex flex-col">
              <div className="p-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-xs font-mono-display text-secondary tracking-[0.5em] uppercase animate-pulse">
                    [ OPERATION STATUS: ACTIVE ]
                  </div>
                  <div className="text-[10px] font-mono-display text-muted-foreground uppercase tracking-widest">
                    Secure Line — Terminal {session?.teamName}
                  </div>
                </div>

                <h2 className="text-5xl md:text-6xl font-mono-display text-foreground tracking-tighter mb-8 leading-none">
                  {missions.find(m => m.id === selectedMission)?.title}
                </h2>

                <div className="h-px w-full bg-gradient-to-r from-secondary/50 via-secondary/20 to-transparent mb-12" />

                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar bg-primary/[0.02] p-6 rounded-sm border border-primary/5">
                  <div className="text-lg md:text-xl text-primary font-mono leading-relaxed whitespace-pre-wrap font-normal max-w-5xl tracking-tight briefing-glow">
                    <TypewriterBriefing text={missions.find(m => m.id === selectedMission)?.description || "No further intelligence available for this operation."} />
                  </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 pt-8 border-t border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-[10px] font-mono-display text-muted-foreground mb-1 uppercase tracking-widest">Network Status</div>
                    <div className="text-sm font-mono-display text-primary uppercase">ENCRYPTED UPLINK ESTABLISHED</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-display text-muted-foreground mb-1 uppercase tracking-widest">Data Stream</div>
                    <div className="text-sm font-mono-display text-primary uppercase">FROZEN — SECURE NODE</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-display text-muted-foreground mb-1 uppercase tracking-widest">Encryption</div>
                    <div className="text-sm font-mono-display text-primary uppercase">AES-256 GCM ACTIVE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Mission Grid Header (Only shown when grid is active) */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mb-1">
                  <Radio className="w-3 h-3 text-primary animate-pulse" />
                  LIVE — MISSION SELECTION
                </div>
                <h1 className="text-xl font-mono-display text-primary tracking-wider">
                  {session?.teamName?.toUpperCase()}'S DASHBOARD
                </h1>
              </div>
            </div>

            {/* Mission Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {missions.map(mission => (
                <MissionCard
                  key={mission.id}
                  id={mission.id}
                  title={mission.title}
                  description={mission.description ?? undefined}
                  currentSlots={mission.current_slots}
                  maxSlots={mission.max_slots}
                  category={mission.category ?? undefined}
                  isSelected={selectedMission === mission.id}
                  teamHasMission={selectedMission !== null}
                  onSelect={handleSelectMission}
                  loading={claiming === mission.id}
                />
              ))}
            </div>

            {missions.length === 0 && (
              <div className="text-center text-muted-foreground font-mono-display mt-20">
                <p className="text-lg">NO MISSIONS LOADED</p>
                <p className="text-sm mt-2">Waiting for admin to deploy problem statements...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
