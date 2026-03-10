import { z } from 'zod';
import { isAfter, parseISO } from 'date-fns';

const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic E.164-like validation

export const MeetingSchema = z.object({
    clientName: z.string().min(1, 'Client name is required'),
    clientPhone: z.string().regex(phoneRegex, 'Invalid phone number'),
    purpose: z.enum(['Sales', 'Follow-up', 'Review', 'General']),
    action: z.enum(['Call', 'Visit', 'Email']),
    dateTime: z.string().refine((val) => {
        try {
            const date = parseISO(val);
            return isAfter(date, new Date());
        } catch {
            return false;
        }
    }, 'Meeting time must be in the future'),
    notes: z.string().optional(),
});

export type MeetingFormValues = z.infer<typeof MeetingSchema>;
