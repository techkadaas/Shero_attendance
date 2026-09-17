import { differenceInSeconds, startOfDay, endOfDay } from 'date-fns';

export const calculateDurationSeconds = (start: Date, end: Date): number => {
  return differenceInSeconds(end, start);
};

export const getTodayRange = (date: Date = new Date()) => {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
};
