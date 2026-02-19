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
import { Play, Pause, RotateCcw, Trash2, Plus, Volume2, VolumeX, Timer as TimerIcon, Clock, Bell } from "lucide-react";
import { toast } from "sonner";

interface Timer {
  id: string;
  name: string;
  time: number;
  isRunning: boolean;
  mode: "stopwatch" | "countdown";
  targetDuration: number;
  hasCompleted: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  endTime: number | null;
  accumulatedTime: number;
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

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch (e) {
        console.warn("Audio not supported:", e);
      }
    }
    return audioContextRef.current;
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    try {
      if (!("Notification" in window)) {
        toast.error("Notifications not supported in this browser");
        return false;
      }

      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notifications already enabled!");
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
    } catch (e) {
      console.error("Notification error:", e);
      toast.error("Could not enable notifications");
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Check if notifications are already enabled
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play alarm sound with multiple beeps
  const playAlarm = useCallback((times: number = 3) => {
    if (isMuted) return;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;

      // Resume audio context if suspended (needed for mobile/autoplay policies)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      for (let i = 0; i < times; i++) {
        setTimeout(() => {
          try {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
            
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = 880;
            oscillator.type = "sine";

            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
          } catch (e) {
            console.warn("Error playing beep:", e);
          }
        }, i * 350);
      }
    } catch (e) {
      console.warn("Error in playAlarm:", e);
    }
  }, [isMuted, initAudioContext]);

  // Show notification
  const showNotification = useCallback((timerName: string) => {
    try {
      if (!notificationsEnabled || typeof window === "undefined" || !("Notification" in window)) return;

      if (Notification.permission !== "granted") return;

      const notification = new Notification(`⏰ Timer Complete!`, {
        body: `${timerName} has finished!`,
        tag: `timer-${timerName}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    } catch (e) {
      console.warn("Could not show notification:", e);
    }
  }, [notificationsEnabled]);

  // Calculate current time for a timer
  const calculateCurrentTime = useCallback((timer: Timer): number => {
    if (!timer.isRunning) {
      return timer.time;
    }

    const now = Date.now();

    if (timer.mode === "stopwatch") {
      if (timer.startedAt) {
        return timer.accumulatedTime + (now - timer.startedAt);
      }
      return timer.accumulatedTime;
    } else {
      if (timer.endTime) {
        const remaining = timer.endTime - now;
        return Math.max(0, remaining);
      }
      return timer.time;
    }
  }, []);

  // Handle timer completion
  const handleTimerComplete = useCallback((timer: Timer): Timer => {
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
  }, [playAlarm, showNotification]);

  // Main update loop
  useEffect(() => {
    const updateTimers = () => {
      setTimers(prev => {
        let hasChanges = false;
        const now = Date.now();
        
        const updated = prev.map(timer => {
          if (!timer.isRunning) return timer;

          const currentTime = calculateCurrentTime(timer);
          
          // Check if countdown just completed
          if (timer.mode === "countdown" && currentTime === 0 && !timer.hasCompleted && timer.endTime && now >= timer.endTime) {
            hasChanges = true;
            return handleTimerComplete(timer);
          }

          // Update time if changed
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
  }, [calculateCurrentTime, handleTimerComplete]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && lastVisibilityState.current === "hidden") {
        setTimers(prev => prev.map(timer => {
          if (!timer.isRunning) return timer;

          const currentTime = calculateCurrentTime(timer);
          const now = Date.now();
          
          // Check if countdown completed while in background
          if (timer.mode === "countdown" && currentTime === 0 && !timer.hasCompleted && timer.endTime && now >= timer.endTime) {
            return handleTimerComplete(timer);
          }

          return { ...timer, time: currentTime };
        }));
      }
      lastVisibilityState.current = document.visibilityState;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [calculateCurrentTime, handleTimerComplete]);

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
    // Initialize audio context on user interaction
    initAudioContext();
    
    setTimers(prev =>
      prev.map(timer => {
        if (timer.id !== id) return timer;
        
        const now = Date.now();

        if (timer.isRunning) {
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
        <div 
          className="p-3 rounded flex items-center gap-2"
          style={{ 
            backgroundColor: "rgba(234, 179, 8, 0.1)", 
            border: "1px solid rgba(234, 179, 8, 0.5)" 
          }}
        >
          <Bell className="w-4 h-4" style={{ color: "#eab308" }} />
          <span className="text-xs font-bold" style={{ color: "#eab308" }}>
            Enable notifications for alerts when screen is off!
          </span>
          <Button 
            onClick={requestNotificationPermission}
            size="sm"
            className="ml-auto text-black text-xs"
            style={{ backgroundColor: "#eab308" }}
          >
            Enable
          </Button>
        </div>
      )}

      {/* Add New Timer */}
      <div 
        className="p-4 space-y-3"
        style={{ 
          backgroundColor: "rgba(255, 107, 53, 0.1)", 
          border: "1px solid rgba(255, 107, 53, 0.5)" 
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest" style={{ color: "#ff6b35" }}>ADD NEW TIMER</p>
          <div className="flex items-center gap-2">
            {notificationsEnabled && (
              <span className="text-xs flex items-center gap-1" style={{ color: "#00ff41" }}>
                <Bell className="w-3 h-3" />
                Notifications ON
              </span>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{ color: "#ff6b35" }}
              className="hover:opacity-80 transition-opacity"
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
            className="flex-1 font-bold"
            style={{ 
              backgroundColor: "#000", 
              border: "2px solid rgba(255, 107, 53, 0.5)", 
              color: "#ff6b35" 
            }}
          />
          <Button
            onClick={addTimer}
            className="px-6"
            style={{ 
              backgroundColor: "#ff6b35", 
              color: "#fff",
              boxShadow: "0 0 10px rgba(255, 107, 53, 0.5)"
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Timer List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {timers.map((timer) => {
          const { minutes, seconds, milliseconds } = formatTime(timer.time);
          const borderColor = timer.hasCompleted ? "#00ff41" : "#ff6b35";
          const glowColor = timer.hasCompleted ? "#00ff41" : "#ff6b35";
          
          return (
            <div
              key={timer.id}
              className="p-4 space-y-4"
              style={{
                backgroundColor: "rgba(18, 18, 31, 0.5)",
                border: `2px solid ${borderColor}`,
                boxShadow: timer.hasCompleted
                  ? `0 0 20px ${glowColor}`
                  : timer.isRunning
                  ? `0 0 15px ${glowColor}`
                  : `0 0 5px ${glowColor}`
              }}
            >
              {/* Timer Name and Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 
                    className="text-lg font-bold tracking-wider uppercase"
                    style={{ color: "#ff6b35" }}
                  >
                    {timer.name}
                  </h3>
                  <button
                    onClick={() => toggleMode(timer.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold transition-all"
                    style={{ 
                      backgroundColor: "rgba(26, 26, 46, 0.5)", 
                      border: "1px solid rgba(0, 255, 255, 0.3)",
                      color: "#00ffff"
                    }}
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
                    className="transition-opacity hover:opacity-70"
                    style={{ color: "#ff4757" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Countdown Target Duration Input */}
              {timer.mode === "countdown" && (
                <div className="flex items-center gap-2">
                  <label 
                    className="text-xs tracking-widest"
                    style={{ color: "#6b8a8a" }}
                  >
                    TARGET (MIN):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={timer.targetDuration / 60000}
                    onChange={(e) => setTargetDuration(timer.id, parseFloat(e.target.value) || 0)}
                    className="w-24 font-bold text-center"
                    style={{ 
                      backgroundColor: "#000", 
                      border: "2px solid rgba(0, 255, 255, 0.5)", 
                      color: "#00ffff" 
                    }}
                  />
                </div>
              )}

              {/* Timer Display */}
              <div className="flex justify-center">
                <div 
                  className="w-48 h-48 rounded-full flex flex-col items-center justify-center relative scanlines"
                  style={{
                    backgroundColor: "#000",
                    border: `4px solid ${borderColor}`,
                    boxShadow: timer.hasCompleted
                      ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 20px rgba(0, 0, 0, 0.8)`
                      : timer.isRunning
                      ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 20px rgba(0, 0, 0, 0.8)`
                      : `0 0 15px ${glowColor}, inset 0 0 20px rgba(0, 0, 0, 0.8)`
                  }}
                >
                  <p 
                    className="text-5xl font-bold"
                    style={{ 
                      fontFamily: "'Orbitron', sans-serif",
                      color: timer.hasCompleted ? "#00ff41" : "#ff6b35",
                      textShadow: timer.hasCompleted
                        ? "0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41"
                        : "0 0 10px #ff6b35, 0 0 20px #ff6b35, 0 0 30px #ff6b35"
                    }}
                  >
                    {minutes}:{seconds}
                  </p>
                  <p 
                    className="text-xl font-bold mt-1"
                    style={{ 
                      fontFamily: "'Share Tech Mono', monospace",
                      color: "#00ffff",
                      textShadow: "0 0 5px #00ffff, 0 0 10px #00ffff"
                    }}
                  >
                    .{milliseconds}
                  </p>
                  
                  {timer.isRunning && (
                    <div className="absolute top-2 right-2">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ 
                          backgroundColor: "#00ff41",
                          boxShadow: "0 0 10px #00ff41"
                        }}
                      />
                    </div>
                  )}

                  {timer.hasCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p 
                        className="text-xs font-bold tracking-widest animate-pulse"
                        style={{ color: "#00ff41" }}
                      >
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
                  className="font-bold py-4 flex flex-col gap-1"
                  style={{ 
                    backgroundColor: "#ff6b35",
                    color: "#fff",
                    boxShadow: timer.isRunning ? "0 0 15px rgba(255, 107, 53, 0.5)" : "0 0 5px rgba(255, 107, 53, 0.5)"
                  }}
                >
                  {timer.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="text-xs tracking-wider">{timer.isRunning ? "PAUSE" : "START"}</span>
                </Button>
                
                <Button
                  onClick={() => resetTimer(timer.id)}
                  className="font-bold py-4 flex flex-col gap-1"
                  style={{ 
                    backgroundColor: "rgba(26, 26, 46, 0.8)",
                    border: "2px solid rgba(0, 255, 255, 0.5)",
                    color: "#00ffff"
                  }}
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
                  className="font-bold py-4 flex flex-col gap-1"
                  style={{ 
                    backgroundColor: "rgba(26, 26, 46, 0.8)",
                    border: "2px solid rgba(0, 255, 255, 0.5)",
                    color: "#00ffff"
                  }}
                >
                  <span className="text-2xl">00</span>
                  <span className="text-xs tracking-wider">ZERO</span>
                </Button>
              </div>

              {/* Preset Buttons */}
              <div className="space-y-2">
                <p className="text-xs tracking-widest" style={{ color: "#6b8a8a" }}>QUICK PRESETS</p>
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
                      className="py-2 px-2 font-bold text-xs transition-all hover:opacity-80"
                      style={{ 
                        backgroundColor: "rgba(26, 26, 46, 0.5)",
                        border: "1px solid rgba(0, 255, 255, 0.3)",
                        color: "#00ffff"
                      }}
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

      {/* Info */}
      <div 
        className="text-xs text-center p-2 rounded"
        style={{ 
          color: "#6b8a8a",
          border: "1px solid rgba(0, 255, 255, 0.2)"
        }}
      >
        <p>💡 Timer uses timestamps to work accurately even when screen is off</p>
        <p>🔔 Enable notifications for alerts when the app is in background</p>
      </div>
    </div>
  );
}
