import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { format, parseISO, isPast, isToday, differenceInHours } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Meeting } from '../services/schema';
import { theme } from '../theme';

interface FollowUpCardProps {
    meeting: Meeting;
    onPress?: (meeting: Meeting) => void;
    highlightColor?: string;
}

export const FollowUpCard = React.memo(({ meeting, onPress, highlightColor }: FollowUpCardProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Calculate urgency-based color
    const urgencyColor = useMemo(() => {
        if (highlightColor) return highlightColor;

        const meetingDate = parseISO(meeting.dateTime);
        const now = new Date();
        const hoursUntilMeeting = differenceInHours(meetingDate, now);

        // Very urgent: within 2 hours or overdue
        if (isPast(meetingDate) || hoursUntilMeeting < 2) {
            return '#FF8C00'; // Dark Orange for very urgent
        }

        // Today's meetings (but not within 2 hours)
        if (isToday(meetingDate)) {
            return '#FFA500'; // Orange for today
        }

        // Tomorrow's meetings (within 48 hours)
        if (hoursUntilMeeting < 48 && hoursUntilMeeting >= 0) {
            return '#FFC107'; // Amber (Darker Yellow) for better visibility
        }

        // Future meetings - use current primary color
        return theme.colors.primary; // Blue for future
    }, [meeting.dateTime, highlightColor]);

    const handlePress = () => {
        if (onPress) {
            onPress(meeting);
        } else {
            navigation.navigate('MeetingDetails', { meetingId: meeting.id });
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={[styles.timeContainer, { backgroundColor: urgencyColor + '15' }]}>
                <Text style={[styles.time, { color: urgencyColor }]}>
                    {format(parseISO(meeting.dateTime), 'HH:mm')}
                </Text>
                <Text style={styles.date}>{format(parseISO(meeting.dateTime), 'MMM d')}</Text>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.clientName}>{meeting.clientName}</Text>
                <Text style={styles.purpose} numberOfLines={1}>
                    {meeting.purpose} • <Text style={{ color: theme.colors.textSecondary }}>{meeting.action}</Text>
                </Text>
                {meeting.notes ? <Text style={styles.notes} numberOfLines={1}>{meeting.notes}</Text> : null}
            </View>

            <View style={[styles.iconContainer, { backgroundColor: urgencyColor + '20' }]}>
                <Text style={[styles.arrow, { color: urgencyColor }]}>›</Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 20, // Increased padding
        marginHorizontal: 16,
        marginBottom: 16, // More spacing
        borderRadius: theme.spacing.radius.l, // 24px Radius
        alignItems: 'center',
        ...theme.shadows.card,
        elevation: 3,
    },
    timeContainer: {
        alignItems: 'center',
        marginRight: 16,
        minWidth: 50,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.spacing.radius.m,
    },
    time: {
        fontWeight: '800',
        fontSize: 16,
        color: theme.colors.text
    },
    date: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontWeight: '600',
        marginTop: 2
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center'
    },
    clientName: {
        fontSize: 17, // Larger title
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4
    },
    purpose: {
        ...theme.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
        color: theme.colors.primary, // Pop color
    },
    notes: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginTop: 4,
        fontStyle: 'italic'
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },
    arrow: {
        fontSize: 24,
        color: theme.colors.textLight,
        fontWeight: '600',
        marginTop: -2 // Visual correction
    }
});
