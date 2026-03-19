import React, { useEffect, useState } from 'react';
import { Shield, Clock, Users, Zap } from 'lucide-react';

// ── Schedule definition ──────────────────────────────────────────────
// Set real dates/times for your hackathon below.
// Use YYYY-MM-DD HH:mm format (24h). Day-header rows have no timestamp.
interface ScheduleItem {
  label: string;       // Display time / day label
  event: string;
  /** ISO-like datetime string "YYYY-MM-DD HH:mm" for real-time comparison.
   *  Leave empty for section-header rows (DAY 1, DAY 2). */
  startsAt?: string;
}

const SCHEDULE: ScheduleItem[] = [
  { label: 'DAY 1',  event: 'FRIDAY — START' },
  { label: '09:00',  event: 'Registration & Verification', startsAt: '2026-03-19 09:00:00+05:30' },
  { label: '10:00',  event: 'Opening Ceremony',            startsAt: '2026-03-19 10:00:00+05:30' },
  { label: '11:00',  event: 'Hacking Commences',           startsAt: '2026-03-19 11:00:00+05:30' },
  { label: '13:00',  event: 'Lunch Break',                 startsAt: '2026-03-19 13:00:00+05:30' },
  { label: '19:00',  event: 'Day 1 Checkpoint',            startsAt: '2026-03-19 19:00:00+05:30' },
  { label: 'DAY 2',  event: 'SATURDAY — FINAL' },
  { label: '09:00',  event: 'Morning Briefing',            startsAt: '2026-03-20 09:00:00+05:30' },
  { label: '13:00',  event: 'Final Submissions',           startsAt: '2026-03-20 13:00:00+05:30' },
  { label: '15:00',  event: 'Project Demos',               startsAt: '2026-03-20 15:00:00+05:30' },
  { label: '17:00',  event: 'Closing & Awards',            startsAt: '2026-03-20 17:00:00+05:30' },
];

type Status = 'completed' | 'active' | 'pending' | 'header';

function getStatuses(now: Date): Status[] {
  // Collect only timed items
  const timed = SCHEDULE.map((item, idx) => ({ idx, startsAt: item.startsAt }))
                        .filter(x => x.startsAt);

  // Find the "active" slot: latest item whose startsAt <= now
  let activeIdx: number | null = null;
  for (const { idx, startsAt } of timed) {
    const t = new Date(startsAt!);
    if (t <= now) activeIdx = idx;
  }

  return SCHEDULE.map((item, idx) => {
    if (!item.startsAt) return 'header';
    if (idx === activeIdx) return 'active';
    const t = new Date(item.startsAt);
    return t < now ? 'completed' : 'pending';
  });
}

// ─────────────────────────────────────────────────────────────────────

interface EventLogSidebarProps {
  activityLog?: { text: string; time: string }[];
}

const EventLogSidebar: React.FC<EventLogSidebarProps> = ({ activityLog = [] }) => {
  const [now, setNow]       = useState(new Date());
  const [clock, setClock]   = useState('');

  // Tick every 30 seconds to keep statuses fresh
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setClock(n.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const statuses = getStatuses(now);

  return (
    <div className="w-72 h-screen fixed left-0 top-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden z-20">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-mono-display text-sm text-primary tracking-wider">JNTUK CTF</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono-display">SYSTEM EVENT LOG</span>
      </div>

      {/* Schedule */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mb-3">
          <Clock className="w-3 h-3" />
          <span>HACKATHON SCHEDULE</span>
        </div>

        {SCHEDULE.map((item, i) => {
          const status = statuses[i];

          if (status === 'header') {
            return (
              <div key={i} className="text-[10px] font-mono-display text-primary/60 tracking-widest pt-3 pb-1 uppercase">
                {item.label} — {item.event}
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-2 rounded text-xs font-mono-display ${
                status === 'active'
                  ? 'bg-primary/10 border border-primary/20'
                  : status === 'completed'
                  ? 'opacity-40'
                  : ''
              }`}
            >
              <span className="text-muted-foreground shrink-0 w-12">{item.label}</span>
              <span className={status === 'active' ? 'text-primary' : 'text-foreground'}>
                {item.event}
              </span>
              {status === 'active' && (
                <Zap className="w-3 h-3 text-primary shrink-0 ml-auto animate-pulse" />
              )}
            </div>
          );
        })}

        {/* Live notifications */}
        {activityLog.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono-display mt-6 mb-3">
              <Users className="w-3 h-3" />
              <span>TEAM ACTIVITY</span>
            </div>
            {activityLog.map((n, i) => (
              <div key={i} className="text-xs font-mono-display p-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
                <span className="text-primary">{n.time}</span> {n.text}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer — live clock */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground font-mono-display text-center">
          <span className="text-secondary">●</span> SYSTEM ONLINE &nbsp;|&nbsp; {clock}
        </div>
      </div>
    </div>
  );
};

export default EventLogSidebar;
