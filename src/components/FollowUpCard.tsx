import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { format, parseISO, isPast, isToday, differenceInHours } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Meeting } from '../services/schema';
import { theme } from '../theme';
import { Phone, MessageCircle, CheckCircle, Check } from 'lucide-react-native';
import { useMeetingStore } from '../store/useMeetingStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { SyncService } from '../services/sync';
import { v4 as uuidv4 } from 'uuid';

interface FollowUpCardProps {
    meeting: Meeting;
    onPress?: (meeting: Meeting) => void;
    highlightColor?: string;
}

export const FollowUpCard = React.memo(({ meeting, onPress, highlightColor }: FollowUpCardProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const updateMeeting = useMeetingStore((s) => s.updateMeeting);
    const addToQueue = useOfflineStore((s) => s.addToQueue);

    const isCompleted = meeting.status === 'completed';

    // Calculate urgency-based color
    const urgencyColor = useMemo(() => {
        if (isCompleted) return '#10B981'; // Fresh Green for completed
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
            return '#F59E0B'; // Amber for tomorrow
        }

        // Future meetings
        return theme.colors.primary;
    }, [meeting.dateTime, highlightColor, isCompleted]);

    const handlePress = () => {
        if (onPress) {
            onPress(meeting);
        } else {
            navigation.navigate('MeetingDetails', { meetingId: meeting.id });
        }
    };

    const handleToggleComplete = (e: any) => {
        e?.stopPropagation?.();
        const nextStatus = isCompleted ? 'scheduled' : 'completed';
        
        updateMeeting(meeting.id, { status: nextStatus });
        
        addToQueue({
            id: uuidv4(),
            type: 'UPDATE_MEETING',
            payload: { id: meeting.id, status: nextStatus },
            timestamp: Date.now(),
            retryCount: 0
        });

        SyncService.processQueue();
    };

    const handleCall = (e: any) => {
        e?.stopPropagation?.();
        if (!meeting.clientPhone) return;
        Linking.openURL(`tel:${meeting.clientPhone.replace(/[^0-9+]/g, '')}`);
    };

    const handleWhatsApp = (e: any) => {
        e?.stopPropagation?.();
        if (!meeting.clientPhone) return;
        Linking.openURL(`https://wa.me/${meeting.clientPhone.replace(/[^0-9]/g, '')}`);
    };

    return (
        <TouchableOpacity
            style={[styles.card, isCompleted && styles.cardCompleted]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Urgency / Time Badge */}
            <View style={[styles.timeContainer, { backgroundColor: urgencyColor + '18' }]}>
                <Text style={[styles.time, { color: urgencyColor }]}>
                    {format(parseISO(meeting.dateTime), 'HH:mm')}
                </Text>
                <Text style={styles.date}>{format(parseISO(meeting.dateTime), 'MMM d')}</Text>
            </View>

            {/* Meeting Info */}
            <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                    <Text style={[styles.clientName, isCompleted && styles.textCompleted]} numberOfLines={1}>
                        {meeting.clientName}
                    </Text>
                    {isCompleted && (
                        <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>Done</Text>
                        </View>
                    )}
                </View>
                
                <Text style={styles.purpose} numberOfLines={1}>
                    {meeting.purpose} • <Text style={{ color: theme.colors.textSecondary }}>{meeting.action}</Text>
                </Text>

                {meeting.notes ? (
                    <Text style={[styles.notes, isCompleted && styles.textCompleted]} numberOfLines={1}>
                        {meeting.notes}
                    </Text>
                ) : null}
            </View>

            {/* Direct Instant Action Buttons */}
            <View style={styles.actionsContainer}>
                {meeting.clientPhone && !isCompleted ? (
                    <>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.callBtn]}
                            onPress={handleCall}
                            activeOpacity={0.6}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Phone size={15} color={theme.colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.whatsappBtn]}
                            onPress={handleWhatsApp}
                            activeOpacity={0.6}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <MessageCircle size={15} color="#10B981" />
                        </TouchableOpacity>
                    </>
                ) : null}

                {/* Instant Done Toggle */}
                <TouchableOpacity
                    style={[styles.checkBtn, isCompleted && styles.checkBtnCompleted]}
                    onPress={handleToggleComplete}
                    activeOpacity={0.6}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    {isCompleted ? (
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                        <CheckCircle size={20} color={theme.colors.textLight} />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: theme.spacing.radius.l,
        alignItems: 'center',
        ...theme.shadows.card,
        elevation: 2,
    },
    cardCompleted: {
        backgroundColor: '#F8FAFC',
        opacity: 0.88,
        elevation: 1,
    },
    timeContainer: {
        alignItems: 'center',
        marginRight: 14,
        minWidth: 54,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: theme.spacing.radius.m,
    },
    time: {
        fontWeight: '800',
        fontSize: 15,
    },
    date: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        marginTop: 2
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        flexShrink: 1,
    },
    completedBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    completedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803D',
        textTransform: 'uppercase',
    },
    textCompleted: {
        color: theme.colors.textLight,
        textDecorationLine: 'line-through',
    },
    purpose: {
        ...theme.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    notes: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 3,
        fontStyle: 'italic'
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceSubtle || '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callBtn: {
        backgroundColor: '#E0F2FE',
    },
    whatsappBtn: {
        backgroundColor: '#DCFCE7',
    },
    checkBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    checkBtnCompleted: {
        backgroundColor: '#10B981',
    },
});
