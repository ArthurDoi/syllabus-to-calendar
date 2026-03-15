/**
 * Date utility functions for calendar and week calculations
 */

/**
 * Get the Monday of the week for a given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get all weeks between start and end date (Monday-Sunday)
 */
export function getWeeksBetween(startDate: Date, endDate: Date): Array<{
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}> {
  const weeks: Array<{ weekNumber: number; startDate: Date; endDate: Date }> = [];
  const start = getMonday(startDate);
  const end = new Date(endDate);
  
  let currentWeekStart = new Date(start);
  let weekNumber = 1;

  while (currentWeekStart <= end) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    weeks.push({
      weekNumber,
      startDate: new Date(currentWeekStart),
      endDate: weekEnd,
    });

    // Move to next Monday
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format datetime to YYYY-MM-DDTHH:mm
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get week number for a given date (relative to course start)
 */
export function getWeekNumber(date: Date, courseStartDate: Date): number {
  const monday = getMonday(courseStartDate);
  const targetMonday = getMonday(date);
  
  const diffTime = targetMonday.getTime() - monday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return Math.max(1, weekNumber);
}

