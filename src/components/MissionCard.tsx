import React from 'react';
import { Lock, Crosshair, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MissionCardProps {
  id: string;
  title: string;
  description?: string;
  currentSlots: number;
  maxSlots: number;
  category?: string;
  isSelected: boolean;
  teamHasMission: boolean;
  isLocked?: boolean;
  onSelect: (id: string) => void;
  loading?: boolean;
}



const MissionCard: React.FC<MissionCardProps> = ({
  id,
  title,
  description,
  currentSlots,
  maxSlots,
  category,
  isSelected,
  teamHasMission,
  isLocked = false,
  onSelect,
  loading,
}) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const isFull = currentSlots >= maxSlots;

  const isDisabled = isFull || teamHasMission || loading;
  const slotPercent = (currentSlots / maxSlots) * 100;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div
          className={`glass-card rounded p-5 relative transition-all duration-150 cursor-pointer hover:border-primary/40 group ${isFull || isLocked ? 'locked-overlay' : ''
            } ${isSelected ? 'border-secondary cyber-glow ring-1 ring-secondary/50' : ''} ${(teamHasMission && !isSelected) || (isLocked && !isSelected) ? 'opacity-40' : ''
            }`}
        >
          {/* Category tag */}
          {category && (
            <div className="text-xs font-mono-display text-muted-foreground mb-2 tracking-wider">
              {category}
            </div>
          )}

          {/* Title */}
          <h3 className="font-mono-display text-base text-foreground mb-4 leading-tight group-hover:text-primary transition-colors flex items-center justify-between">
            {title}
            <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>

          {/* Slot tracker */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-mono-display text-muted-foreground">SLOTS</span>
              <span className={`text-sm font-mono-display font-bold ${isFull ? 'text-destructive' : 'text-primary'}`}>
                {currentSlots}/{maxSlots}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-sm ${isFull ? 'bg-destructive' : 'bg-primary'
                  }`}
                style={{ width: `${slotPercent}%` }}
              />
            </div>
          </div>

          {/* Action */}
          {isSelected ? (
            <div className="flex items-center gap-2 text-sm font-mono-display text-secondary">
              <Lock className="w-4 h-4" />
              MISSION LOCKED IN
            </div>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) onSelect(id);
              }}
              disabled={isDisabled || isLocked}
              className={`w-full font-mono-display tracking-wider text-xs pointer-events-auto ${isLocked ? 'border-destructive/30 text-destructive/70 bg-destructive/5' : ''}`}
              size="sm"
            >
              {loading ? (
                '[ CLAIMING... ]'
              ) : isLocked ? (
                <>
                  <Lock className="w-3 h-3 mr-1" /> [ FROZEN ]
                </>
              ) : isFull ? (
                <>
                  <Lock className="w-3 h-3 mr-1" /> FULL
                </>
              ) : (
                <>
                  <Crosshair className="w-3 h-3 mr-1" /> SELECT MISSION
                </>
              )}
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl glass-card border-primary/20 backdrop-blur-xl cursor-pointer p-8"
        onClick={() => setIsDialogOpen(false)}
      >
        <DialogHeader>
          <div className="text-xs font-mono-display text-primary mb-3 tracking-widest uppercase opacity-70">Mission Briefing</div>
          <DialogTitle className="font-mono-display text-2xl text-foreground tracking-tight mb-2">{title}</DialogTitle>
          <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent my-6" />
          <DialogDescription className="text-base text-foreground/90 leading-relaxed font-body whitespace-pre-wrap">
            {description || "No mission intelligence available for this operation."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 text-center">
          <span className="text-[10px] font-mono-display text-muted-foreground/50 uppercase tracking-widest">Click anywhere to return</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MissionCard;
