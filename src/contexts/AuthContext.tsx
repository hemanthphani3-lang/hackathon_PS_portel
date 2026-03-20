import React, { createContext, useContext, useState, useEffect } from 'react';

interface TeamSession {
  teamId: string;
  teamName: string;
  isAdmin: boolean;
  isEditor: boolean;
  selectedMissionId: string | null;
}

interface AuthContextType {
  session: TeamSession | null;
  login: (teamName: string, password: string) => Promise<{ success: boolean; message: string; isAdmin: boolean; isEditor: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<TeamSession | null>(() => {
    const stored = sessionStorage.getItem('ctf_session');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (session) {
      sessionStorage.setItem('ctf_session', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('ctf_session');
    }
  }, [session]);

  const login = async (teamName: string, password: string): Promise<{ success: boolean; message: string; isAdmin: boolean; isEditor: boolean }> => {
    // Admin check
    if (teamName === 'admin@1234' && password === 'admin@1234') {
      setSession({ teamId: 'admin', teamName: 'Admin', isAdmin: true, isEditor: false, selectedMissionId: null });
      return { success: true, message: 'Admin login successful', isAdmin: true, isEditor: false };
    }

    // Editor check
    if (teamName === 'edit@123' && password === 'edit@123') {
      setSession({ teamId: 'editor', teamName: 'Editor', isAdmin: false, isEditor: true, selectedMissionId: null });
      return { success: true, message: 'Editor login successful', isAdmin: false, isEditor: true };
    }

    // Team login via RPC
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.rpc('verify_team_login', {
      p_team_name: teamName,
      p_password: password,
    });

    const result = data as { success?: boolean; message?: string; team_id?: string; team_name?: string; selected_mission_id?: string | null };

    if (error || !result?.success) {
      return { success: false, message: result?.message || error?.message || 'Login failed', isAdmin: false, isEditor: false };
    }

    // Update last_login
    await supabase.from('teams').update({ updated_at: new Date().toISOString() }).eq('id', result.team_id);

    setSession({
      teamId: result.team_id,
      teamName: result.team_name,
      isAdmin: false,
      isEditor: false,
      selectedMissionId: result.selected_mission_id,
    });

    return { success: true, message: 'Login successful', isAdmin: false, isEditor: false };
  };

  const logout = () => setSession(null);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
