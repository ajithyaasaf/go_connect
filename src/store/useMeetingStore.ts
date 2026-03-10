import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { Meeting } from '../services/schema';

interface MeetingState {
    meetings: Meeting[];
    updatedAt: string;
    setMeetings: (meetings: Meeting[]) => void;
    addMeeting: (meeting: Meeting) => void;
    updateMeeting: (id: string, updates: Partial<Meeting>) => void;
    removeMeeting: (id: string) => void;
}

export const useMeetingStore = create<MeetingState>()(
    persist(
        (set) => ({
            meetings: [],
            updatedAt: new Date().toISOString(),
            setMeetings: (meetings) =>
                set({ meetings, updatedAt: new Date().toISOString() }),
            addMeeting: (meeting) =>
                set((state) => ({
                    meetings: [...state.meetings, meeting],
                    updatedAt: new Date().toISOString(),
                })),
            updateMeeting: (id, updates) =>
                set((state) => {
                    const oldMeeting = state.meetings.find(m => m.id === id);
                    const hasDateTimeChange = updates.dateTime && oldMeeting?.dateTime !== updates.dateTime;

                    // If meeting time changed, trigger notification reschedule
                    if (hasDateTimeChange && oldMeeting) {
                        // Import notification service dynamically to avoid circular deps
                        const { notificationService } = require('../services/notification');

                        // Cancel old notifications
                        notificationService.cancelReminders(id);

                        // Schedule new notifications with updated time
                        const updatedMeeting = { ...oldMeeting, ...updates, updatedAt: new Date().toISOString() };
                        notificationService.scheduleMeetingReminder(updatedMeeting);

                        console.log(`[MeetingStore] Rescheduled notifications for meeting: ${id}`);
                    }

                    return {
                        meetings: state.meetings.map((m) =>
                            m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
                        ),
                        updatedAt: new Date().toISOString(),
                    };
                }),
            removeMeeting: (id) =>
                set((state) => ({
                    meetings: state.meetings.filter((m) => m.id !== id),
                    updatedAt: new Date().toISOString(),
                })),
        }),
        {
            name: 'meeting-storage',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
