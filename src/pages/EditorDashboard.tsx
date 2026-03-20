import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Target, Plus, Database, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MatrixRain from '@/components/MatrixRain';

const EditorDashboard: React.FC = () => {
    const { logout } = useAuth();

    // Team Form State
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamPassword, setNewTeamPassword] = useState('');
    const [addingTeam, setAddingTeam] = useState(false);

    // Mission Form State
    const [missionTitle, setMissionTitle] = useState('');
    const [missionDesc, setMissionDesc] = useState('');
    const [addingMission, setAddingMission] = useState(false);

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
            toast.success(`Team "${newTeamName}" provisioned successfully`);
            setNewTeamName('');
            setNewTeamPassword('');
        }
    };

    const handleAddMission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!missionTitle.trim() || !missionDesc.trim()) {
            toast.error('Title and Description are required');
            return;
        }

        setAddingMission(true);
        const { data, error: rpcError } = await supabase.rpc('create_mission_node', {
            p_title: missionTitle.trim(),
            p_description: missionDesc.trim()
        });

        setAddingMission(false);
        const result = data as { success?: boolean; message?: string };

        if (rpcError || !result?.success) {
            toast.error('Failed to add mission: ' + (result?.message || rpcError?.message || 'Unknown error'));
        } else {
            toast.success(`Mission node "${missionTitle}" deployed successfully`);
            setMissionTitle('');
            setMissionDesc('');
        }
    };

    return (
        <div className="min-h-screen p-6 relative overflow-hidden">
            {/* Background Continuity: Matrix Rain */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                <MatrixRain />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary animate-pulse" />
                        <div>
                            <h1 className="text-2xl font-mono-display text-primary tracking-[0.2em] uppercase">
                                EDITOR — MISSION PROVISIONING
                            </h1>
                            <p className="text-[10px] font-mono-display text-muted-foreground tracking-widest mt-1">
                                SECURE DATA INJECTION PORTAL v2.0
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="font-mono-display text-xs text-primary/60 hover:text-primary hover:bg-primary/10 transition-all border border-primary/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> TERMINATE SESSION
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Team Provisioning Section */}
                    <div className="glass-card p-6 border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.05)] flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-4">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-mono-display text-sm text-primary tracking-widest">TEAM PROVISIONING</h2>
                        </div>

                        <form onSubmit={handleAddTeam} className="space-y-6 flex-1">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Target Team Identity</label>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="IDENTITY_NAME"
                                    className="w-full bg-black/40 border border-primary/30 rounded px-4 py-3 text-sm font-mono-display text-primary placeholder:text-primary/10 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all uppercase"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Initial Access Key</label>
                                <input
                                    type="text"
                                    value={newTeamPassword}
                                    onChange={(e) => setNewTeamPassword(e.target.value)}
                                    placeholder="SECURE_PHRASE"
                                    className="w-full bg-black/40 border border-primary/30 rounded px-4 py-3 text-sm font-mono-display text-primary placeholder:text-primary/10 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all uppercase"
                                    required
                                />
                            </div>

                            <div className="pt-4 mt-auto">
                                <Button
                                    type="submit"
                                    disabled={addingTeam}
                                    className="w-full font-mono-display text-xs py-6 bg-primary text-black hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] tracking-widest uppercase"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> {addingTeam ? 'INJECTING...' : 'INITIATE TEAM PROVISIONING'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Mission Creation Section */}
                    <div className="glass-card p-6 border-secondary/20 shadow-[0_0_30px_rgba(var(--secondary),0.05)] flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6 border-b border-secondary/10 pb-4">
                            <Target className="w-5 h-5 text-secondary" />
                            <h2 className="font-mono-display text-sm text-secondary tracking-widest">MISSION BRIEFING INJECTION</h2>
                        </div>

                        <form onSubmit={handleAddMission} className="space-y-6 flex-1">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Mission designation</label>
                                <input
                                    type="text"
                                    value={missionTitle}
                                    onChange={(e) => setMissionTitle(e.target.value)}
                                    placeholder="OPERATION_NAME"
                                    className="w-full bg-black/40 border border-secondary/30 rounded px-4 py-3 text-sm font-mono-display text-secondary placeholder:text-secondary/10 focus:border-secondary focus:ring-1 focus:ring-secondary/30 outline-none transition-all uppercase"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Mission objective data</label>
                                <textarea
                                    value={missionDesc}
                                    onChange={(e) => setMissionDesc(e.target.value)}
                                    placeholder="BRIEFING_CONTENT..."
                                    rows={4}
                                    className="w-full bg-black/40 border border-secondary/30 rounded px-4 py-3 text-sm font-mono-display text-secondary placeholder:text-secondary/10 focus:border-secondary focus:ring-1 focus:ring-secondary/30 outline-none transition-all resize-none"
                                    required
                                />
                            </div>

                            <div className="pt-4 mt-auto">
                                <Button
                                    type="submit"
                                    disabled={addingMission}
                                    className="w-full font-mono-display text-xs py-6 bg-secondary text-black hover:bg-secondary/80 transition-all shadow-[0_0_20px_rgba(var(--secondary),0.2)] hover:shadow-[0_0_30px_rgba(var(--secondary),0.4)] tracking-widest uppercase"
                                >
                                    <Database className="w-4 h-4 mr-2" /> {addingMission ? 'UPLOADING...' : 'DEPLOY MISSION NODE'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center">
                    <div className="inline-block p-px bg-gradient-to-r from-transparent via-primary/50 to-transparent w-full max-w-md" />
                    <p className="mt-4 text-[9px] font-mono-display text-muted-foreground tracking-[0.5em] uppercase">
                        AUTHORIZED PERSONNEL ONLY — LOG ALL INJECTIONS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EditorDashboard;
