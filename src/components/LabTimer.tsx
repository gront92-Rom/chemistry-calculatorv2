/*
Design: Retro-futuristic timer with multiple named timers support
Each timer can have a custom title and runs independently
Supports both stopwatch and countdown modes with audio alerts

UPDATED: Now uses timestamps instead of interval counting for reliable
operation when screen is off or app is in background.
*/

'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Trash2, Plus, Volume2, VolumeX, Timer as TimerIcon, Clock, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

interface Timer {
  id: string;
  name: string;
  time: number; // current display time in milliseconds
  isRunning: boolean;
  mode: "stopwatch" | "countdown";
  targetDuration: number; // milliseconds, for countdown mode
  hasCompleted: boolean; // track if countdown reached zero
  // Timestamp-based tracking for background operation
  startedAt: number | null; // timestamp when timer started
  pausedAt: number | null; // timestamp when timer was paused
  endTime: number | null; // target end time for countdown
  accumulatedTime: number; // time accumulated before current session
}

export default function LabTimer() {
  const [timers, setTimers] = useState<Timer[]>([
    { 
      id: "1", 
      name: "Main Timer", 
      time: 0, 
      isRunning: false, 
      mode: "stopwatch",
      targetDuration: 0,
      hasCompleted: false,
      startedAt: null,
      pausedAt: null,
      endTime: null,
      accumulatedTime: 0
    }
  ]);
  const [newTimerName, setNewTimerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVisibilityState = useRef<string>("visible");

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return true;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Notifications enabled! You'll receive alerts even when screen is off.");
      return true;
    } else {
      toast.error("Notification permission denied. Timer alerts will only show when app is open.");
      return false;
    }
  }, []);

  // Initialize audio context and notifications
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Check if notifications are already enabled
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }

    return () => {
      audioContextRef.current?.close();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Play alarm sound with multiple beeps
  const playAlarm = useCallback((times: number = 3) => {
    if (isMuted || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    
    // Resume audio context if suspended (needed for mobile)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    for (let i = 0; i < times; i++) {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 880; // Higher pitch for alarm
        oscillator.type = "sine";

        const startTime = ctx.currentTime + (i * 0.3);
        gainNode.gain.setValueAtTime(0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      }, i * 300);
    }
  }, [isMuted]);

  // Show notification
  const showNotification = useCallback((timerName: string) => {
    if (!notificationsEnabled || !("Notification" in window)) return;

    const notification = new Notification(`⏰ Timer Complete!`, {
      body: `${timerName} has finished!`,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: `timer-${timerName}`,
      requireInteraction: true,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }, [notificationsEnabled]);

  // Calculate current time for a timer
  const calculateCurrentTime = useCallback((timer: Timer): number => {
    if (!timer.isRunning) {
      return timer.time;
    }

    const now = Date.now();

    if (timer.mode === "stopwatch") {
      // For stopwatch: accumulated time + time since started
      if (timer.startedAt) {
        return timer.accumulatedTime + (now - timer.startedAt);
      }
      return timer.accumulatedTime;
    } else {
      // For countdown: end time - now
      if (timer.endTime) {
        const remaining = timer.endTime - now;
        return Math.max(0, remaining);
      }
      return timer.time;
    }
  }, []);

  // Main update loop using requestAnimationFrame
  useEffect(() => {
    const updateTimers = () => {
      setTimers(prev => {
        let hasChanges = false;
        const updated = prev.map(timer => {
          if (!timer.isRunning) return timer;

          const currentTime = calculateCurrentTime(timer);
          
          // Check if countdown just completed
          if (timer.mode === "countdown" && currentTime === 0 && !timer.hasCompleted && timer.endTime) {
            hasChanges = true;
            
            // Play sound and show notification
            playAlarm(5);
            showNotification(timer.name);
            
            toast.success(`⏰ ${timer.name} completed!`, {
              duration: 10000,
            });

            return { 
              ...timer, 
              time: 0, 
              isRunning: false,
              hasCompleted: true,
              endTime: null,
              startedAt: null
            };
          }

          // Only update if time changed significantly
          if (Math.abs(currentTime - timer.time) >= 10) {
            hasChanges = true;
            return { ...timer, time: currentTime };
          }

          return timer;
        });

        return hasChanges ? updated : prev;
      });

      animationFrameRef.current = requestAnimationFrame(updateTimers);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimers);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateCurrentTime, playAlarm, showNotification]);

  // Handle page visibility changes - recalculate all timers when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && lastVisibilityState.current === "hidden") {
        // Page just became visible - recalculate all timers
        setTimers(prev => prev.map(timer => {
          if (!timer.isRunning) return timer;

          const currentTime = calculateCurrentTime(timer);
          
          // Check if countdown completed while in background
          if (timer.mode === "countdown" && currentTime === 0 && !timer.hasCompleted && timer.endTime) {
            playAlarm(5);
            showNotification(timer.name);
            
            toast.success(`⏰ ${timer.name} completed!`, {
              duration: 10000,
            });

            return { 
              ...timer, 
              time: 0, 
              isRunning: false,
              hasCompleted: true,
              endTime: null,
              startedAt: null
            };
          }

          return { ...timer, time: currentTime };
        }));
      }
      lastVisibilityState.current = document.visibilityState;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [calculateCurrentTime, playAlarm, showNotification]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    return {
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
      milliseconds: milliseconds.toString().padStart(2, "0"),
    };
  };

  const toggleTimer = (id: string) => {
    setTimers(prev =>
      prev.map(timer => {
        if (timer.id !== id) return timer;
        
        const now = Date.now();

        if (timer.isRunning) {
          // Pausing
          const currentTime = calculateCurrentTime(timer);
          return { 
            ...timer, 
            isRunning: false, 
            time: currentTime,
            startedAt: null,
            pausedAt: now,
            accumulatedTime: timer.mode === "stopwatch" ? currentTime : 0
          };
        } else {
          // Starting
          if (timer.mode === "countdown" && timer.time === 0) {
            toast.error("Set a target duration first!");
            return timer;
          }

          return { 
            ...timer, 
            isRunning: true, 
            hasCompleted: false,
            startedAt: now,
            pausedAt: null,
            endTime: timer.mode === "countdown" ? now + timer.time : null
          };
        }
      })
    );
  };

  const resetTimer = (id: string) => {
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id 
          ? { 
              ...timer, 
              time: timer.mode === "countdown" ? timer.targetDuration : 0, 
              isRunning: false,
              hasCompleted: false,
              startedAt: null,
              pausedAt: null,
              endTime: null,
              accumulatedTime: 0
            } 
          : timer
      )
    );
  };

  const deleteTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const addTimer = () => {
    if (newTimerName.trim()) {
      const newTimer: Timer = {
        id: Date.now().toString(),
        name: newTimerName.trim(),
        time: 0,
        isRunning: false,
        mode: "stopwatch",
        targetDuration: 0,
        hasCompleted: false,
        startedAt: null,
        pausedAt: null,
        endTime: null,
        accumulatedTime: 0
      };
      setTimers(prev => [...prev, newTimer]);
      setNewTimerName("");
    }
  };

  const toggleMode = (id: string) => {
    setTimers(prev =>
      prev.map(timer => {
        if (timer.id !== id) return timer;
        
        const newMode = timer.mode === "stopwatch" ? "countdown" : "stopwatch";
        return {
          ...timer,
          mode: newMode,
          time: newMode === "countdown" ? timer.targetDuration : 0,
          isRunning: false,
          hasCompleted: false,
          startedAt: null,
          pausedAt: null,
          endTime: null,
          accumulatedTime: 0
        };
      })
    );
  };

  const setTargetDuration = (id: string, minutes: number) => {
    const ms = minutes * 60 * 1000;
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id 
          ? { 
              ...timer, 
              targetDuration: ms, 
              time: ms, 
              hasCompleted: false,
              startedAt: null,
              pausedAt: null,
              endTime: null,
              accumulatedTime: 0
            } 
          : timer
      )
    );
  };

  const setPreset = (id: string, ms: number) => {
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id 
          ? { 
              ...timer, 
              time: ms, 
              isRunning: false,
              hasCompleted: false,
              startedAt: null,
              pausedAt: null,
              endTime: null,
              accumulatedTime: 0,
              ...(timer.mode === "countdown" ? { targetDuration: ms } : {}),
            } 
          : timer
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Notification Permission Banner */}
      {!notificationsEnabled && (
        <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 rounded">
          <div className="flex items-center gap-2 text-yellow-500">
            <Bell className="w-4 h-4" />
            <span className="text-xs font-bold">Enable notifications to receive alerts when screen is off!</span>
            <Button 
              onClick={requestNotificationPermission}
              size="sm"
              className="ml-auto bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
            >
              Enable
            </Button>
          </div>
        </div>
      )}

      {/* Add New Timer */}
      <div className="border border-accent/50 bg-accent/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-accent tracking-widest">ADD NEW TIMER</p>
          <div className="flex items-center gap-2">
            {notificationsEnabled && (
              <span className="text-xs text-terminal-green flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Notifications ON
              </span>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-accent hover:text-accent/80 transition-colors"
              title={isMuted ? "Unmute alerts" : "Mute alerts"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={newTimerName}
            onChange={(e) => setNewTimerName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTimer()}
            placeholder="Timer name..."
            className="flex-1 bg-black border-2 border-accent/50 text-accent font-bold"
          />
          <Button
            onClick={addTimer}
            className="bg-accent hover:bg-accent/80 text-accent-foreground px-6"
            style={{ boxShadow: "0 0 10px var(--color-neon-orange)" }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Timer List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {timers.map((timer) => {
          const { minutes, seconds, milliseconds } = formatTime(timer.time);
          
          return (
            <div
              key={timer.id}
              className={`border-2 bg-card/50 p-4 space-y-4 ${
                timer.hasCompleted 
                  ? "border-terminal-green animate-pulse" 
                  : "border-accent"
              }`}
              style={{
                boxShadow: timer.hasCompleted
                  ? "0 0 20px var(--color-terminal-green)"
                  : timer.isRunning
                  ? "0 0 15px var(--color-neon-orange)"
                  : "0 0 5px var(--color-neon-orange)"
              }}
            >
              {/* Timer Name and Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-accent tracking-wider uppercase">
                    {timer.name}
                  </h3>
                  <button
                    onClick={() => toggleMode(timer.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-secondary/50 border border-primary/30 hover:border-primary text-primary text-xs font-bold transition-all"
                    title={`Switch to ${timer.mode === "stopwatch" ? "countdown" : "stopwatch"} mode`}
                  >
                    {timer.mode === "stopwatch" ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>STOPWATCH</span>
                      </>
                    ) : (
                      <>
                        <TimerIcon className="w-3 h-3" />
                        <span>COUNTDOWN</span>
                      </>
                    )}
                  </button>
                </div>
                {timers.length > 1 && (
                  <button
                    onClick={() => deleteTimer(timer.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Countdown Target Duration Input */}
              {timer.mode === "countdown" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground tracking-widest">TARGET (MIN):</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={timer.targetDuration / 60000}
                    onChange={(e) => setTargetDuration(timer.id, parseFloat(e.target.value) || 0)}
                    className="w-24 bg-black border-2 border-primary/50 text-primary font-bold text-center"
                  />
                </div>
              )}

              {/* Timer Display */}
              <div className="flex justify-center">
                <div 
                  className={`w-48 h-48 rounded-full border-4 bg-black flex flex-col items-center justify-center relative scanlines ${
                    timer.hasCompleted ? "border-terminal-green" : "border-accent"
                  }`}
                  style={{
                    boxShadow: timer.hasCompleted
                      ? `
                        0 0 30px var(--color-terminal-green),
                        0 0 60px var(--color-terminal-green),
                        inset 0 0 20px rgba(0, 0, 0, 0.8)
                      `
                      : timer.isRunning
                      ? `
                        0 0 30px var(--color-neon-orange),
                        0 0 60px var(--color-neon-orange),
                        inset 0 0 20px rgba(0, 0, 0, 0.8)
                      `
                      : `
                        0 0 15px var(--color-neon-orange),
                        inset 0 0 20px rgba(0, 0, 0, 0.8)
                      `
                  }}
                >
                  <p 
                    className={`text-5xl font-bold mono-display ${
                      timer.hasCompleted ? "text-terminal-green" : "text-accent"
                    }`}
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: timer.hasCompleted
                        ? `
                          0 0 10px var(--color-terminal-green),
                          0 0 20px var(--color-terminal-green),
                          0 0 30px var(--color-terminal-green)
                        `
                        : `
                          0 0 10px var(--color-neon-orange),
                          0 0 20px var(--color-neon-orange),
                          0 0 30px var(--color-neon-orange)
                        `
                    }}
                  >
                    {minutes}:{seconds}
                  </p>
                  <p 
                    className="text-xl font-bold mono-display text-primary mt-1"
                    style={{
                      textShadow: `
                        0 0 5px var(--color-neon-cyan),
                        0 0 10px var(--color-neon-cyan)
                      `
                    }}
                  >
                    .{milliseconds}
                  </p>
                  
                  {timer.isRunning && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 rounded-full bg-terminal-green animate-pulse"
                        style={{
                          boxShadow: "0 0 10px var(--color-terminal-green)"
                        }}
                      />
                    </div>
                  )}

                  {timer.hasCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-terminal-green font-bold tracking-widest animate-pulse">
                        COMPLETE
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => toggleTimer(timer.id)}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground font-bold py-4 flex flex-col gap-1"
                  style={{
                    boxShadow: timer.isRunning ? "0 0 15px var(--color-neon-orange)" : "0 0 5px var(--color-neon-orange)"
                  }}
                >
                  {timer.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="text-xs tracking-wider">{timer.isRunning ? "PAUSE" : "START"}</span>
                </Button>
                
                <Button
                  onClick={() => resetTimer(timer.id)}
                  className="bg-secondary hover:bg-secondary/80 text-primary border-2 border-primary/50 font-bold py-4 flex flex-col gap-1"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-xs tracking-wider">RESET</span>
                </Button>
                
                <Button
                  onClick={() => setTimers(prev =>
                    prev.map(t => t.id === timer.id ? { 
                      ...t, 
                      time: 0, 
                      isRunning: false, 
                      hasCompleted: false,
                      startedAt: null,
                      pausedAt: null,
                      endTime: null,
                      accumulatedTime: 0
                    } : t)
                  )}
                  className="bg-secondary hover:bg-secondary/80 text-primary border-2 border-primary/50 font-bold py-4 flex flex-col gap-1"
                >
                  <span className="text-2xl">00</span>
                  <span className="text-xs tracking-wider">ZERO</span>
                </Button>
              </div>

              {/* Preset Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground tracking-widest">QUICK PRESETS</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "30s", ms: 30000 },
                    { label: "1m", ms: 60000 },
                    { label: "2m", ms: 120000 },
                    { label: "5m", ms: 300000 },
                    { label: "10m", ms: 600000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setPreset(timer.id, preset.ms)}
                      className="py-2 px-2 bg-secondary/50 border border-primary/30 hover:border-primary hover:bg-accent/20 text-primary font-bold text-xs transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {timers.length > 1 && (
        <div className="border border-primary/30 bg-card/50 p-3">
          <p className="text-xs text-muted-foreground tracking-widest mb-2">ACTIVE TIMERS</p>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold mono-display">{timers.length}</span>
            <span className="text-xs text-muted-foreground">TOTAL</span>
            <span className="mx-2">|</span>
            <span className="text-terminal-green font-bold mono-display">
              {timers.filter(t => t.isRunning).length}
            </span>
            <span className="text-xs text-muted-foreground">RUNNING</span>
            <span className="mx-2">|</span>
            <span className="text-accent font-bold mono-display">
              {timers.filter(t => t.hasCompleted).length}
            </span>
            <span className="text-xs text-muted-foreground">COMPLETED</span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center p-2 border border-primary/20 rounded">
        <p>💡 Timer uses timestamps to work accurately even when screen is off</p>
        <p>🔔 Enable notifications for alerts when the app is in background</p>
      </div>
    </div>
  );
}
