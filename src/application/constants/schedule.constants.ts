export function tuesdayToSaturdaySchedule (timeEntry: string, timeDeparture: string) {
  return {
    monday: null,
    tuesday: {
      start: timeEntry,
      end: timeDeparture
    },
    wednesday: {
      start: timeEntry,
      end: timeDeparture
    },
    thursday: {
      start: timeEntry,
      end: timeDeparture
    },
    friday: {
      start: timeEntry,
      end: timeDeparture
    },
    saturday: {
      start: timeEntry,
      end: timeDeparture
    },
    sunday: null,
  }
}

export function mondayToFridaySchedule (timeEntry: string, timeDeparture: string) {
  return {
    monday: {
      start: timeEntry,
      end: timeDeparture
    },
    tuesday: {
      start: timeEntry,
      end: timeDeparture
    },
    wednesday: {
      start: timeEntry,
      end: timeDeparture
    },
    thursday: {
      start: timeEntry,
      end: timeDeparture
    },
    friday: {
      start: timeEntry,
      end: timeDeparture
    },
    saturday: null,
    sunday: null,
  }
}


type TimeEntry = { start: string; end: string } | null;
type Schedule = Record<string, TimeEntry>;

interface BusinessHours {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export function convertToBusinessHours(schedule: Schedule): BusinessHours[] | BusinessHours {
  const daysMapping: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const businessHours: BusinessHours[] = [];
  let current: BusinessHours | null = null;

  Object.entries(schedule).forEach(([day, time]) => {
    const dayIndex = daysMapping[day];
    if (time) {
      if (current && current.startTime === time.start && current.endTime === time.end) {
        current.daysOfWeek.push(dayIndex);
      } else {
        if (current) businessHours.push(current);
        current = { daysOfWeek: [dayIndex], startTime: time.start, endTime: time.end };
      }
    } else if (current) {
      businessHours.push(current);
      current = null;
    }
  });

  if (current) businessHours.push(current);
  return businessHours.length > 1 ? businessHours : businessHours[0];
}