import React, { useEffect, useState } from 'react';
import { formatDuration } from '../../utils/timeUtils';

interface LiveTimerProps {
  status: string;
  initialWorkingSeconds: number;
  lastResumeTimestamp?: string;
  lastStopTimestamp?: string;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ 
  status, 
  initialWorkingSeconds, 
  lastResumeTimestamp,
  lastStopTimestamp 
}) => {
  const [currentSeconds, setCurrentSeconds] = useState(initialWorkingSeconds);

  useEffect(() => {
    // Determine the base seconds when the component mounts or props change
    let baseSeconds = initialWorkingSeconds;
    
    // If working, we need to add the duration from the last resume/check-in to NOW
    if (status === 'WORKING' && lastResumeTimestamp) {
      const now = new Date();
      const resumeTime = new Date(lastResumeTimestamp);
      const diffInSeconds = Math.floor((now.getTime() - resumeTime.getTime()) / 1000);
      baseSeconds += diffInSeconds;
    }

    setCurrentSeconds(baseSeconds);

    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (status === 'WORKING') {
      interval = setInterval(() => {
        setCurrentSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, initialWorkingSeconds, lastResumeTimestamp, lastStopTimestamp]);

  return <span className="font-mono">{formatDuration(currentSeconds)}</span>;
};

export default LiveTimer;
