import { useEffect, useCallback, useRef } from 'react';
import { useUIState } from '../stores/uiState';

interface UseRoundTimerOptions {
  duration: number; // Duration in seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

/**
 * Custom hook for managing round timers
 * Integrates with UIState for timer display
 */
export const useRoundTimer = ({
  duration,
  onComplete,
  autoStart = false,
}: UseRoundTimerOptions) => {
  const { isTimerActive, roundTimeRemaining, setRoundTimer, updateRoundTimer, startTimer, stopTimer } = useUIState();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update the callback ref when it changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Start the timer
  const start = useCallback(() => {
    setRoundTimer(duration);
    startTimer();
  }, [duration, setRoundTimer, startTimer]);

  // Stop the timer
  const stop = useCallback(() => {
    stopTimer();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [stopTimer]);

  // Reset the timer
  const reset = useCallback(() => {
    stop();
    setRoundTimer(duration);
  }, [duration, stop, setRoundTimer]);

  // Restart the timer
  const restart = useCallback(() => {
    stop();
    start();
  }, [start, stop]);

  // Handle timer tick
  useEffect(() => {
    if (!isTimerActive || roundTimeRemaining === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start the countdown
    intervalRef.current = setInterval(() => {
      const currentTime = useUIState.getState().roundTimeRemaining;
      if (currentTime === null || currentTime <= 0) {
        updateRoundTimer(0);
      } else {
        updateRoundTimer(currentTime - 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerActive, updateRoundTimer]);

  // Handle timer completion
  useEffect(() => {
    if (isTimerActive && roundTimeRemaining === 0) {
      stop();
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }
  }, [isTimerActive, roundTimeRemaining, stop]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time for display (MM:SS)
  const formatTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining: roundTimeRemaining,
    formattedTime: formatTime(roundTimeRemaining),
    isActive: isTimerActive,
    start,
    stop,
    reset,
    restart,
  };
};
