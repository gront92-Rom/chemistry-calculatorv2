'use client';

import { useState, useEffect, useCallback } from "react";

export interface HistoryEntry {
  id: string;
  type: "mass" | "dilution" | "osmolarity" | "serial_dilution" | "multi_osmolarity";
  timestamp: number;
  inputs: Record<string, unknown>;
  result: string;
}

const MAX_HISTORY_ITEMS = 20;

// Helper function to load history from localStorage
function loadHistoryFromStorage(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem("chemlab_history");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load history:", error);
  }
  return [];
}

export function useCalculationHistory() {
  // Use lazy initialization for the history state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load history on mount (client-side hydration)
  useEffect(() => {
    const savedHistory = loadHistoryFromStorage();
    setHistory(savedHistory);
    setIsHydrated(true);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated && history.length > 0) {
      try {
        localStorage.setItem("chemlab_history", JSON.stringify(history));
      } catch (error) {
        console.error("Failed to save history:", error);
      }
    }
  }, [history, isHydrated]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [newEntry, ...prev];
      // Keep only the most recent entries
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("chemlab_history");
    }
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  return {
    history,
    addEntry,
    clearHistory,
    deleteEntry,
  };
}
