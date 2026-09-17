import React from 'react';
import { formatTime } from '../../utils/timeUtils';
import { CheckCircle2, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';

interface AttendanceTimelineProps {
  events: any[];
}

const AttendanceTimeline: React.FC<AttendanceTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'STOP':
        return <PauseCircle className="w-5 h-5 text-yellow-500" />;
      case 'RESUME':
        return <PlayCircle className="w-5 h-5 text-green-500" />;
      case 'CHECK_OUT':
        return <StopCircle className="w-5 h-5 text-teal-500" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getEventDescription = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return 'Started working';
      case 'STOP': return 'Went on leave';
      case 'RESUME': return 'Work session resumed';
      case 'CHECK_OUT': return 'Work completed';
      default: return 'Event recorded';
    }
  };

  const getEventLabel = (type: string) => {
    if (type === 'STOP') return 'Leave';
    return type.replace('_', ' ').toLowerCase();
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-white flex items-center justify-center ring-8 ring-white">
                    {getEventIcon(event.eventType)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-900 font-medium capitalize">
                      {getEventLabel(event.eventType)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getEventDescription(event.eventType)}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={event.timestamp}>{formatTime(event.timestamp)}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AttendanceTimeline;
