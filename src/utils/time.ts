/**
 * Formats minutes since midnight into a time string.
 * @param minutes - Minutes since midnight (0-1439)
 * @param is24Hour - Whether to use 24-hour format
 * @returns Formatted time string (e.g., "14:30" or "2:30 PM")
 */
export function formatTime(minutes: number, is24Hour: boolean): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const paddedMins = mins.toString().padStart(2, '0');

    if (is24Hour) {
        const paddedHours = hours.toString().padStart(2, '0');
        return `${paddedHours}:${paddedMins}`;
    }

    // 12-hour format with AM/PM
    if (hours === 0) {
        return `12:${paddedMins} AM`;
    } else if (hours < 12) {
        return `${hours}:${paddedMins} AM`;
    } else if (hours === 12) {
        return `12:${paddedMins} PM`;
    } else {
        return `${hours - 12}:${paddedMins} PM`;
    }
}
