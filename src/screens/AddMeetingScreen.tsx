import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';

import { MeetingFormValues, MeetingSchema } from '../utils/validation';
import { ConflictService } from '../services/conflict';
import { SyncService } from '../services/sync';
import { useMeetingStore } from '../store/useMeetingStore';
import { useClientStore } from '../store/useClientStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { useAuthStore } from '../store/useAuthStore';
import { notificationService } from '../services/notification';
import { firestoreService } from '../services/firestore';
import { Client, Meeting } from '../services/schema';
import { addDays, setHours, setMinutes, format, parseISO } from 'date-fns';
import { Search, Plus, Calendar, Target, Activity, FileText, X, Check } from 'lucide-react-native';
import { theme } from '../theme';
import DatePicker from 'react-native-date-picker';
import { useRemoteConfigStore } from '../services/remoteConfig';

// --- Pure Sub-components (Moved outside for performance/stability) ---

const SectionHeader = React.memo(({ icon: Icon, title }: any) => (
    <View style={styles.sectionHeader}>
        <Icon size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
));

const QuickChip = React.memo(({ label, onPress, active }: any) => (
    <TouchableOpacity
        style={[styles.chip, active && styles.chipActive]}
        onPress={onPress}
    >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
));

const AddMeetingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // Remote Config
    const remotePurposes = useRemoteConfigStore((s) => s.purposes);
    const remoteActions = useRemoteConfigStore((s) => s.actions);

    // Services
    const addMeeting = useMeetingStore((s) => s.addMeeting);
    const addToQueue = useOfflineStore((s) => s.addToQueue);
    const user = useAuthStore((s) => s.user);

    // Local State
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearch, setClientSearch] = useState('');

    // Date Picker Modal State
    const [showDatePicker, setShowDatePicker] = useState(false);

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<MeetingFormValues>({
        resolver: zodResolver(MeetingSchema),
        defaultValues: {
            dateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
            purpose: 'General',
            action: 'Call',
            clientName: '',
            clientPhone: '',
            notes: '',
        },
    });

    const watchedDate = watch('dateTime');

    useEffect(() => {
        loadClients();
    }, [user?.id]);

    const loadClients = async () => {
        if (!user?.accessKey) return;
        try {
            const data = await firestoreService.getClientsForUser(user.accessKey);
            setClients(data);

            // Check if passed via route (from ClientList)
            if (route.params?.clientId) {
                const preselected = data.find(c => c.id === route.params.clientId);
                if (preselected) selectClient(preselected);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingClients(false);
        }
    };

    const selectClient = useCallback((client: Client) => {
        setSelectedClient(client);
        setValue('clientName', client.name);
        setValue('clientPhone', client.phone);
    }, [setValue]);

    const clearClient = useCallback(() => {
        setSelectedClient(null);
        setValue('clientName', '');
        setValue('clientPhone', '');
    }, [setValue]);

    const setQuickTime = (type: 'tmrw_10' | 'today_4' | 'next_week') => {
        let date = new Date();
        switch (type) {
            case 'tmrw_10':
                date = addDays(date, 1);
                date = setHours(date, 10);
                date = setMinutes(date, 0);
                break;
            case 'today_4':
                date = setHours(date, 16);
                date = setMinutes(date, 0);
                if (date < new Date()) date = addDays(date, 1); // If 4pm passed, do tomorrow
                break;
            case 'next_week':
                date = addDays(date, 7);
                date = setHours(date, 10);
                date = setMinutes(date, 0);
                break;
        }
        setValue('dateTime', date.toISOString());
    };

    const handleDateConfirm = (selectedDate: Date) => {
        setValue('dateTime', selectedDate.toISOString());
        setShowDatePicker(false);
    };

    const onSubmit = (data: MeetingFormValues) => {
        if (!selectedClient && !data.clientName) {
            Alert.alert('Validation Error', 'Please select a client or enter details manually.');
            return;
        }

        const conflicts = ConflictService.checkConflicts(data.dateTime);

        if (conflicts.length > 0) {
            Alert.alert(
                'Schedule Conflict',
                `Conflict with ${conflicts[0].clientName} around this time.\n\nOverride?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Override', style: 'destructive', onPress: () => processSave(data) }
                ]
            );
        } else {
            processSave(data);
        }
    };

    const processSave = (data: MeetingFormValues) => {
        const newId = uuidv4();
        const timestamp = Date.now();

        // 1. Auto-save Client if entered manually
        let finalClientId = selectedClient?.id;
        if (!finalClientId && data.clientName?.trim()) {
            finalClientId = uuidv4();
            const newClient: Client = {
                id: finalClientId,
                userId: user?.id || 'unknown',
                accessKey: user?.accessKey || 'default',
                name: data.clientName.trim(),
                phone: (data.clientPhone || '').trim(),
                createdAt: new Date().toISOString(),
            };

            // Save to local store so they appear in ClientList
            useClientStore.getState().addClient(newClient);

            // Queue for cloud sync
            addToQueue({
                id: uuidv4(),
                type: 'CREATE_CLIENT' as any,
                payload: newClient,
                timestamp,
                retryCount: 0,
            });
        }

        const newMeeting: Meeting = {
            id: newId,
            userId: user?.id || 'unknown',
            accessKey: user?.accessKey || 'default',
            clientId: finalClientId || uuidv4(),
            clientName: data.clientName,
            clientPhone: data.clientPhone || '',
            purpose: data.purpose,
            action: data.action,
            dateTime: data.dateTime,
            status: 'scheduled',
            notes: data.notes,
            remindersScheduled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addMeeting(newMeeting);

        addToQueue({
            id: uuidv4(),
            type: 'CREATE_MEETING',
            payload: newMeeting,
            timestamp,
            retryCount: 0,
        });

        // Trigger immediate sync
        SyncService.processQueue();

        notificationService.scheduleMeetingReminder(newMeeting);

        navigation.goBack();
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    const parsedDate = watchedDate ? parseISO(watchedDate) : new Date();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            {/* 1. WHO SECTION */}
            <SectionHeader icon={Target} title="Client Details" />

            <View style={styles.card}>
                {selectedClient ? (
                    <View style={styles.selectedClientCard}>
                        <View style={styles.selectedClientHeader}>
                            <View style={styles.clientTag}>
                                <Check size={12} color="#15803D" strokeWidth={3} />
                                <Text style={styles.clientTagText}>Selected Client</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.clearClientBtn}
                                onPress={clearClient}
                                activeOpacity={0.7}
                            >
                                <X size={14} color="#EF4444" />
                                <Text style={styles.clearClientText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                        <Text style={styles.selectedClientPhone}>{selectedClient.phone}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.searchWrapper}>
                            <Search size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput
                                placeholder="Filter clients..."
                                style={styles.searchField}
                                value={clientSearch}
                                onChangeText={setClientSearch}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>

                        {loadingClients ? (
                            <ActivityIndicator style={{ marginVertical: 10 }} />
                        ) : (
                            <View style={styles.clientSelector}>
                                <FlatList<Client>
                                    data={filteredClients}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item: Client) => item.id}
                                    nestedScrollEnabled={true}
                                    renderItem={({ item }: { item: Client }) => (
                                        <QuickChip
                                            label={item.name}
                                            active={false}
                                            onPress={() => selectClient(item)}
                                        />
                                    )}
                                    ListHeaderComponent={
                                        <TouchableOpacity
                                            style={styles.addClientBtn}
                                            onPress={() => navigation.navigate('AddClient')}
                                        >
                                            <Plus size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
                                            <Text style={styles.addClientText}>New</Text>
                                        </TouchableOpacity>
                                    }
                                />
                            </View>
                        )}

                        <Text style={styles.subLabel}>Or Enter Client Manually</Text>

                        <Controller
                            control={control}
                            name="clientName"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="Client Name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="clientPhone"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    onChangeText={onChange}
                                    value={value}
                                    keyboardType="phone-pad"
                                    placeholder="Phone Number (Required)"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            )}
                        />
                        {errors.clientPhone && <Text style={styles.error}>{errors.clientPhone.message}</Text>}
                    </>
                )}
            </View>

            {/* 2. WHAT SECTION */}
            <SectionHeader icon={Activity} title="Purpose & Action" />

            <View style={styles.card}>
                <Text style={styles.subLabel}>Primary Goal</Text>
                <View style={styles.chipRow}>
                    {(remotePurposes && remotePurposes.length > 0 ? remotePurposes : ['Sales', 'Follow-up', 'Review', 'General']).map(p => (
                        <QuickChip
                            key={p}
                            label={p}
                            onPress={() => setValue('purpose', p as any)}
                            active={watch('purpose') === p}
                        />
                    ))}
                </View>

                <Text style={styles.subLabel}>Next Action</Text>
                <View style={styles.chipRow}>
                    {(remoteActions && remoteActions.length > 0 ? remoteActions : ['Call', 'Visit', 'Email']).map(a => (
                        <QuickChip
                            key={a}
                            label={a}
                            onPress={() => setValue('action', a as any)}
                            active={watch('action') === a}
                        />
                    ))}
                </View>
            </View>

            {/* 3. WHEN SECTION */}
            <SectionHeader icon={Calendar} title="Schedule" />

            <View style={styles.card}>
                <View style={styles.chipRow}>
                    <QuickChip label="Tmrw 10AM" onPress={() => setQuickTime('tmrw_10')} />
                    <QuickChip label="Today 4PM" onPress={() => setQuickTime('today_4')} />
                    <QuickChip label="Next Week" onPress={() => setQuickTime('next_week')} />
                </View>

                <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                >
                    <Calendar size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                    <View>
                        <Text style={styles.pickerLabel}>Meeting Date & Time</Text>
                        <Text style={styles.pickerValue}>
                            {format(parsedDate, 'EEEE, MMM do • h:mm a')}
                        </Text>
                    </View>
                </TouchableOpacity>

                <DatePicker
                    modal
                    open={showDatePicker}
                    date={parsedDate}
                    onConfirm={handleDateConfirm}
                    onCancel={() => setShowDatePicker(false)}
                    minimumDate={new Date()}
                    mode="datetime"
                />

                <View style={styles.helperBox}>
                    <Text style={styles.helperText}>
                        🗓️ Confirming: {format(parsedDate, 'MMMM do, yyyy')} at {format(parsedDate, 'h:mm a')}
                    </Text>
                </View>
                {errors.dateTime && <Text style={styles.error}>{errors.dateTime.message}</Text>}
            </View>

            {/* 4. NOTES */}
            <SectionHeader icon={FileText} title="Additional Notes" />
            <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        onChangeText={onChange}
                        value={value}
                        placeholder="Any specific context or goals..."
                        placeholderTextColor={theme.colors.textSecondary}
                        multiline
                        numberOfLines={4}
                    />
                )}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)}>
                <Text style={styles.saveButtonText}>Confirm & Schedule</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 24, paddingBottom: 80 },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
        paddingHorizontal: 4
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: 0.2
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.radius.l,
        padding: 20,
        ...theme.shadows.card,
        marginBottom: 12,
    },

    label: { fontSize: 13, marginBottom: 8, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 16, textTransform: 'uppercase' },
    subLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12, fontWeight: '700', textTransform: 'uppercase' },

    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.spacing.radius.pill,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 48,
    },
    searchField: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 8,
    },

    input: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: theme.spacing.radius.pill,
        marginBottom: 16,
        fontSize: 16,
        color: theme.colors.text,
        ...theme.shadows.soft,
    },
    selectedClientCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        borderRadius: theme.spacing.radius.m,
        padding: 16,
        marginBottom: 8,
    },
    selectedClientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clientTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: theme.spacing.radius.pill,
    },
    clientTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803D',
        textTransform: 'uppercase',
    },
    clearClientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.spacing.radius.pill,
        backgroundColor: '#FEE2E2',
    },
    clearClientText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
    },
    selectedClientName: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    selectedClientPhone: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },

    readOnlyInput: {
        backgroundColor: theme.colors.background,
        color: theme.colors.textSecondary,
        opacity: 0.8
    },
    textArea: {
        borderRadius: theme.spacing.radius.l,
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16
    },

    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.spacing.radius.l,
        marginBottom: 16,
        ...theme.shadows.soft,
    },
    pickerLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4
    },
    pickerValue: {
        fontSize: 17,
        color: theme.colors.text,
        fontWeight: '700'
    },

    helperBox: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.spacing.radius.m,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        marginTop: 8,
    },
    helperText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '600' },

    error: { color: theme.colors.error, marginTop: 4, fontSize: 12, marginLeft: 16 },

    // Chips
    clientSelector: { flexDirection: 'row', marginBottom: 20 },
    addClientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.spacing.radius.pill,
        marginRight: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.primary,
    },
    addClientText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 10 },
    chip: {
        backgroundColor: theme.colors.background,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: theme.spacing.radius.pill,
        marginBottom: 8,
        ...theme.shadows.soft,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.glow,
    },
    chipText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 14 },
    chipTextActive: { color: 'white' },

    saveButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18,
        borderRadius: theme.spacing.radius.pill,
        alignItems: 'center',
        marginTop: 32,
        ...theme.shadows.glow,
    },
    saveButtonText: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});

export default AddMeetingScreen;
