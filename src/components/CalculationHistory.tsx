'use client';

/*
Design: Retro-futuristic calculation history display
*/

import { Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryEntry } from "@/hooks/useCalculationHistory";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
  onDelete: (id: string) => void;
}

export default function CalculationHistory({ history, onClear, onDelete }: Props) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mass": return "MASS CALC";
      case "dilution": return "DILUTION";
      case "osmolarity": return "OSMOLARITY";
      case "serial_dilution": return "SERIAL DIL";
      case "multi_osmolarity": return "MULTI-OSM";
      default: return type.toUpperCase();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "mass": return "text-primary";
      case "dilution": return "text-primary";
      case "osmolarity": return "text-terminal-green";
      case "serial_dilution": return "text-accent";
      case "multi_osmolarity": return "text-accent";
      default: return "text-primary";
    }
  };

  if (history.length === 0) {
    return (
      <div className="border border-primary/30 bg-card/50 p-6 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground">NO CALCULATION HISTORY</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary tracking-widest border-b border-primary/30 pb-2">
          CALCULATION HISTORY
        </h3>
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive/80 text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          CLEAR ALL
        </Button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-primary/5 border border-primary/20 p-3 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${getTypeColor(entry.type)} tracking-wider`}>
                    {getTypeLabel(entry.type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <p className="text-sm mono-display text-foreground font-bold truncate">
                  {entry.result}
                </p>
              </div>
              <button
                onClick={() => onDelete(entry.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
