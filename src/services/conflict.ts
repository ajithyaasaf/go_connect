import { Meeting } from '../services/schema';
import { useMeetingStore } from '../store/useMeetingStore';
import { parseISO, differenceInMinutes } from 'date-fns';

const CONFLICT_THRESHOLD_MINUTES = 30;

export const ConflictService = {
    /**
     * Checks for meeting conflicts within +/- 30 minutes.
     * @param targetTime ISO string of the proposed meeting time
     * @param excludeId Optional ID to exclude (for edit mode)
     * @returns Array of conflicting meetings
     */
    checkConflicts: (targetTime: string, excludeId?: string): Meeting[] => {
        const { meetings } = useMeetingStore.getState();
        const targetDate = parseISO(targetTime);

        return meetings.filter((meeting) => {
            // Exclude self
            if (excludeId && meeting.id === excludeId) return false;

            // Exclude cancelled or missed (optional, usually we conflict with scheduled only)
            if (meeting.status === 'cancelled') return false;

            const meetingDate = parseISO(meeting.dateTime);
            const diff = Math.abs(differenceInMinutes(targetDate, meetingDate));

            return diff < CONFLICT_THRESHOLD_MINUTES;
        });
    }
};
