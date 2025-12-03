'use client';

interface EvolutionBarProps {
  currentDay: number;
  totalDays?: number;
}

export default function EvolutionBar({ currentDay, totalDays = 365 }: EvolutionBarProps) {
  const progress = (currentDay / totalDays) * 100;
  const checkpoints = [91, 181, 271];

  return (
    <div className="w-full bg-black border-b border-[#D4AF37]/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Day Counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-light">
            Dia <span className="font-bold text-[#D4AF37]">{currentDay}</span> de {totalDays}
          </span>
          <span className="text-[#D4AF37] text-xs">
            {progress.toFixed(1)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
          {/* Golden Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />

          {/* Checkpoint Markers */}
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint}
              className="absolute top-0 h-full w-0.5 bg-white/40"
              style={{ left: `${(checkpoint / totalDays) * 100}%` }}
              title={`Colapso de Ressurreição - Dia ${checkpoint}`}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#D4AF37] border border-white/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
