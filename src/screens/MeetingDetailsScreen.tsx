import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useMeetingStore } from '../store/useMeetingStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { theme } from '../theme';
import { Layout } from '../components/Layout';
import { Calendar, User, FileText, Trash2, Phone, MessageCircle, CheckCircle } from 'lucide-react-native';
import { SyncService } from '../services/sync';
import { notificationService } from '../services/notification';
import { Linking } from 'react-native';

type MeetingDetailsRouteProp = RouteProp<AppStackParamList, 'MeetingDetails'>;

const MeetingDetailsScreen = () => {
    const route = useRoute<RouteProp<AppStackParamList, 'MeetingDetails'>>();
    const { meetingId } = route.params;
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Store Actions
    const removeMeeting = useMeetingStore((s) => s.removeMeeting);
    const updateMeeting = useMeetingStore((s) => s.updateMeeting);
    const addToQueue = useOfflineStore((s) => s.addToQueue);

    const meeting = useMeetingStore((s) => s.meetings.find(m => m.id === meetingId));

    const [isEditing, setIsEditing] = useState(false);

    if (!meeting) {
        console.error('[MeetingDetails] FATAL: Meeting not found for ID:', meetingId);
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Meeting not found</Text>
            </View>
        );
    }

    const handleMarkDone = () => {
        updateMeeting(meeting.id, { status: 'completed' });
        // Trigger sync for persistence
        SyncService.processQueue();
        Alert.alert('Success', 'Meeting marked as completed', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    const handleCall = () => {
        if (!meeting.clientPhone) return;
        Linking.openURL(`tel:${meeting.clientPhone.replace(/[^0-9+]/g, '')}`);
    };

    const handleWhatsApp = () => {
        if (!meeting.clientPhone) return;
        Linking.openURL(`https://wa.me/${meeting.clientPhone.replace(/[^0-9]/g, '')}`);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Meeting',
            'Are you sure you want to delete this meeting?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // 1. Cancel all scheduled notifications first
                        notificationService.cancelReminders(meetingId);

                        // 2. Queue the Delete Action
                        addToQueue({
                            id: uuidv4(),
                            type: 'DELETE_MEETING',
                            payload: { id: meetingId },
                            timestamp: Date.now(),
                            retryCount: 0
                        });

                        // 3. Remove from Local Store
                        removeMeeting(meetingId);

                        // 4. Trigger Sync
                        SyncService.processQueue();

                        Alert.alert('Deleted', 'Meeting removed.');
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.rootContainer}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{meeting.clientName}</Text>
                    <Text style={styles.status}>{meeting.status.toUpperCase()}</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.infoRow}>
                        <Calendar color={theme.colors.primary} size={20} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Date & Time</Text>
                            <Text style={styles.infoValue}>{format(parseISO(meeting.dateTime), 'EEEE, MMMM d, yyyy')}</Text>
                            <Text style={styles.infoValue}>{format(parseISO(meeting.dateTime), 'h:mm a')}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <User color={theme.colors.primary} size={20} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Client</Text>
                            <Text style={styles.infoValue}>{meeting.clientName}</Text>
                        </View>
                        {/* Quick Actions */}
                        {meeting.clientPhone && (
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity onPress={handleCall} style={styles.iconBtn}>
                                    <Phone size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleWhatsApp} style={styles.iconBtn}>
                                    <MessageCircle size={20} color={theme.colors.success} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <FileText color={theme.colors.primary} size={20} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Purpose</Text>
                            <Text style={styles.infoValue}>{meeting.purpose}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <FileText color={theme.colors.primary} size={20} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Next Action</Text>
                            <Text style={styles.infoValue}>{meeting.action}</Text>
                        </View>
                    </View>

                    {meeting.notes && (
                        <View style={styles.notesSection}>
                            <Text style={styles.infoLabel}>Notes</Text>
                            <Text style={styles.notesText}>{meeting.notes}</Text>
                        </View>
                    )}
                </View>

                {meeting.status !== 'completed' && (
                    <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={handleMarkDone}>
                        <CheckCircle color="white" size={20} />
                        <Text style={styles.actionButtonText}>Mark as Completed</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                    <Trash2 color="white" size={20} />
                    <Text style={styles.actionButtonText}>Delete Meeting</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        ...theme.typography.header,
        marginBottom: 8,
    },
    status: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '700',
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        ...theme.shadows.soft,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    infoContent: {
        marginLeft: 16,
        flex: 1,
    },
    infoLabel: {
        ...theme.typography.caption,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    infoValue: {
        ...theme.typography.body,
        color: theme.colors.text,
    },
    notesSection: {
        marginTop: 8,
    },
    notesText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        ...theme.shadows.soft,
    },
    completeButton: {
        backgroundColor: theme.colors.success,
    },
    deleteButton: {
        backgroundColor: theme.colors.error,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 16,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        ...theme.shadows.sharp,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        ...theme.typography.body,
        color: theme.colors.error,
    },
});

export default MeetingDetailsScreen;
