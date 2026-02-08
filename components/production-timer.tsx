"use client";

import { useState, useEffect, useCallback } from "react";

interface ProductionTimerProps {
  startTime: string;
  totalPauseMs: number;
  status: string;
  lastPauseStart?: string | null;
}

export function ProductionTimer({
  startTime,
  totalPauseMs,
  status,
  lastPauseStart,
}: ProductionTimerProps) {
  const [elapsed, setElapsed] = useState("00:00:00");

  const calculateElapsed = useCallback(() => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    let totalMs = now - start - (totalPauseMs || 0);

    // If currently paused, subtract ongoing pause time
    if (status === "PAUSADO" && lastPauseStart) {
      const pauseStart = new Date(lastPauseStart).getTime();
      totalMs -= now - pauseStart;
    }

    if (totalMs < 0) totalMs = 0;

    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [startTime, totalPauseMs, status, lastPauseStart]);

  useEffect(() => {
    if (status === "FINALIZADO") {
      setElapsed(calculateElapsed());
      return;
    }

    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [status, calculateElapsed]);

  return (
    <span className="font-mono text-2xl font-bold tracking-wider">
      {elapsed}
    </span>
  );
}
