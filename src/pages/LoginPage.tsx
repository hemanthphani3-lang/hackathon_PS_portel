import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Terminal, AlertTriangle, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MatrixRain from '@/components/MatrixRain';

const LoginPage: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(teamName.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      setAuthSuccess(true);
      setTimeout(() => {
        navigate(result.isAdmin ? '/admin-dashboard' : '/dashboard');
      }, 2400); // 2.4s total cinematic animation
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Continuity: Matrix Rain */}
      <div className="absolute inset-0 z-0 opacity-[0.08]">
        <MatrixRain />
      </div>
      
      {/* Animated Scan Line */}
      <div className="absolute inset-x-0 h-[2px] bg-primary/20 z-0 animate-[scan_8s_linear_infinite]" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes fill-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes sequence {
          0%, 10% { opacity: 0; transform: scale(0.95); }
          20%, 80% { opacity: 1; transform: scale(1); }
          90%, 100% { opacity: 0; transform: scale(1.05); }
        }
        @keyframes fadeOut {
          to { opacity: 0; visibility: hidden; }
        }
        @keyframes slamIn {
          0% { opacity: 0; transform: scale(2.5); filter: blur(10px); }
          40% { opacity: 1; transform: scale(0.9); filter: blur(0px); }
          70% { opacity: 1; transform: scale(1.05); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}} />

      <div className="glass-card cyber-glow p-8 w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded border border-primary/30 bg-primary/5">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-mono-display text-primary tracking-wider">
            JNTUK CTF PORTAL
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-body">
            Cybersecurity Capture The Flag — Mission Control
          </p>
        </div>

        {/* Terminal-style label */}
        <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground font-mono-display">
          <Terminal className="w-3 h-3" />
          <span>SYSTEM://AUTH/LOGIN</span>
        </div>

        {!authSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono-display text-muted-foreground mb-1.5 tracking-wider">
                TEAM_NAME
              </label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team identifier..."
                className="bg-muted/50 border-primary/20 font-mono-display text-sm focus:border-primary"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-display text-muted-foreground mb-1.5 tracking-wider">
                ACCESS_KEY
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access key..."
                className="bg-muted/50 border-primary/20 font-mono-display text-sm focus:border-primary"
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm font-mono-display bg-destructive/10 p-2 rounded">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-mono-display tracking-wider"
            >
              {loading ? '[ AUTHENTICATING... ]' : '[ INITIATE ACCESS ]'}
            </Button>
          </form>
        ) : (
          <div className="relative w-full h-[300px] flex flex-col items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-black/80">
            {/* Background Flash at 1.4s */}
            <div className="absolute inset-0 bg-primary animate-[flash_2s_ease-out_1.4s_forwards] opacity-0 mix-blend-overlay pointer-events-none z-20" />
            
            <div className="flex flex-col items-center w-full px-8 relative z-10 h-full">
              
              {/* Stage 1: Decryption (opacity fades out after 0.8s) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-[fadeOut_0.1s_ease-in_0.8s_forwards]">
                <Terminal className="w-12 h-12 text-primary/70 animate-pulse mb-4" />
                <div className="w-full h-24 overflow-hidden relative opacity-50 font-mono-display text-xs text-primary blur-[0.5px]">
                  <div className="absolute top-0 w-full animate-[scrollUp_0.5s_linear_infinite] text-center opacity-70">
                    {/* CSS Hack string for scrolling hex effect */}
                    {Array.from({length: 20}).map((_, i) => (
                       <div key={i}>{Math.random().toString(16).slice(2, 10).toUpperCase()} - {Math.random().toString(16).slice(2, 10).toUpperCase()}</div>
                    ))}
                  </div>
                </div>
                <h3 className="mt-4 font-mono-display text-primary tracking-[0.3em] text-sm animate-pulse">DECRYPTING KEY...</h3>
              </div>

              {/* Stage 2: Firewall Bypass (fades in at 0.8s, out at 1.4s) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-[sequence_0.6s_ease-in-out_0.8s_forwards] opacity-0">
                <Shield className="w-16 h-16 text-secondary animate-ping mb-4" />
                <h3 className="font-mono-display text-secondary tracking-[0.2em] text-sm">OVERRIDING FIREWALL</h3>
                <div className="w-full h-1 bg-secondary/20 mt-4 rounded overflow-hidden">
                  <div className="h-full bg-secondary animate-[fill-bar_0.6s_ease-out_0.8s_forwards]" style={{width: '0%'}}></div>
                </div>
              </div>

              {/* Stage 3: Access Granted (slams in at 1.4s) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-[slamIn_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_1.4s_forwards] opacity-0 scale-150">
                <div className="relative">
                   <Unlock className="w-20 h-20 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),1)] mb-6" />
                   <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-0 [animation-delay:1.4s]" />
                </div>
                <h2 className="text-3xl font-mono-display text-primary tracking-[0.3em] drop-shadow-[0_0_10px_rgba(var(--primary),0.8)] text-center font-bold">
                  ACCESS
                  <br />
                  GRANTED
                </h2>
                <p className="mt-4 text-xs font-mono-display text-primary/70 tracking-[0.4em] uppercase">
                  Welcome, {teamName}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground font-mono-display">
            JNTU KAKINADA — CYBERSECURITY DIVISION
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
