import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ScrollView, FlatList, Dimensions, StatusBar, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { Meeting } from '../store/types';
import { isToday, isPast, isFuture, parseISO, format, isTomorrow } from 'date-fns';
import { FollowUpCard } from '../components/FollowUpCard';
import { DailyOverviewCard } from '../components/DailyOverviewCard'; // New Component
import { firestoreService } from '../services/firestore';
import { theme } from '../theme';
import { Layout } from '../components/Layout';
import { Bell, Search, LogOut, Info, AlertTriangle, AlertCircle, X } from 'lucide-react-native';
import { authService } from '../services/auth';
import { useRemoteConfigStore } from '../services/remoteConfig';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
    const user = useAuthStore((s) => s.user);
    const meetings = useMeetingStore((s) => s.meetings);
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => authService.signOut()
                },
            ]
        );
    };

    const { greeting, formattedDate } = useMemo(() => {
        const hour = new Date().getHours();
        let text = 'Good Evening';
        if (hour < 12) text = 'Good Morning';
        else if (hour < 18) text = 'Good Afternoon';
        return {
            greeting: text,
            formattedDate: format(new Date(), "'Today' d MMM") // Format like "Today 25 Nov"
        };
    }, []);

    const { overdue, today, tomorrow, upcoming } = useMemo(() => {
        const now = new Date();
        const sorter = (a: Meeting, b: Meeting) => a.dateTime.localeCompare(b.dateTime);

        const activeMeetings = meetings.filter(m => m.status !== 'cancelled' && m.status !== 'completed');

        return {
            overdue: activeMeetings.filter(m => isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime))).sort(sorter),
            today: activeMeetings.filter(m => isToday(parseISO(m.dateTime))).sort(sorter),
            tomorrow: activeMeetings.filter(m => isTomorrow(parseISO(m.dateTime))).sort(sorter),
            upcoming: activeMeetings.filter(m => isFuture(parseISO(m.dateTime)) && !isTomorrow(parseISO(m.dateTime))).sort(sorter)
        };
    }, [meetings]);

    const isMaintenance = useRemoteConfigStore((s) => s.isMaintenance);
    const maintenanceMessage = useRemoteConfigStore((s) => s.maintenanceMessage);
    const announcement = useRemoteConfigStore((s) => s.announcement);
    const [dismissedAnnouncementId, setDismissedAnnouncementId] = React.useState<string | null>(null);

    const showAnnouncement = announcement && announcement.active && dismissedAnnouncementId !== announcement.id;

    return (
        <Layout>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.profileRow}>
                        {/* Placeholder Avatar */}
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={styles.greetingText}>Hello, {user?.name?.split(' ')[0]}</Text>
                            <Text style={styles.dateText}>{formattedDate}</Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('Search')}
                        >
                            <Search size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { marginLeft: 10 }]}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                        >
                            <LogOut size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Maintenance Alert Banner */}
                {isMaintenance && (
                    <View style={styles.maintenanceBanner}>
                        <AlertTriangle size={20} color="#DC2626" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.maintenanceTitle}>Scheduled Maintenance</Text>
                            <Text style={styles.maintenanceText}>{maintenanceMessage}</Text>
                        </View>
                    </View>
                )}

                {/* Dynamic Remote Announcement Card */}
                {showAnnouncement && announcement && (
                    <View style={[
                        styles.announcementCard,
                        announcement.type === 'alert' && styles.announcementAlert,
                        announcement.type === 'warning' && styles.announcementWarning,
                    ]}>
                        <View style={styles.announcementIconWrapper}>
                            {announcement.type === 'alert' ? (
                                <AlertCircle size={20} color="#DC2626" />
                            ) : announcement.type === 'warning' ? (
                                <AlertTriangle size={20} color="#D97706" />
                            ) : (
                                <Info size={20} color={theme.colors.primary} />
                            )}
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.announcementTitle}>{announcement.title}</Text>
                            <Text style={styles.announcementBody}>{announcement.message}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setDismissedAnnouncementId(announcement.id)}
                            style={styles.announcementClose}
                            activeOpacity={0.7}
                        >
                            <X size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Hero Section */}
                <DailyOverviewCard />

                {/* Today's List */}
                <View style={styles.sectionContainer}>
                    {/* Clean Date Row like standard calendars */}
                    {/* We can reproduce the "Sun 22 | Mon 23" row here if we had time, 
                        but let's focus on the vertical list layout for now which is safer. */}

                    {today.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Your plan</Text>
                            {today.map(m => (
                                <FollowUpCard key={m.id} meeting={m} />
                            ))}
                        </>
                    )}
                </View>

                {/* Other Sections */}
                <View style={styles.sectionContainer}>
                    {overdue.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Attention Needed</Text>
                            {overdue.map(m => (
                                <FollowUpCard key={m.id} meeting={m} />
                            ))}
                        </View>
                    )}

                    {tomorrow.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.sectionTitle}>Tomorrow</Text>
                            {tomorrow.map(m => (
                                <FollowUpCard key={m.id} meeting={m} />
                            ))}
                        </View>
                    )}

                    {upcoming.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>Upcoming</Text>
                            {upcoming.map(m => (
                                <FollowUpCard key={m.id} meeting={m} />
                            ))}
                        </View>
                    )}

                    {upcoming.length === 0 && overdue.length === 0 && today.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>You're all set!</Text>
                            <Text style={styles.emptySub}>No upcoming meetings scheduled.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </Layout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 24,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DDD6FE', // Light Violet
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    dateText: {
        ...theme.typography.caption,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    greetingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 8,
        // Removed background, just icon for cleaner look
    },
    sectionContainer: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 22, // Larger section headers
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
        paddingHorizontal: 24,
        letterSpacing: -0.5,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyTitle: {
        ...theme.typography.subHeader,
        marginBottom: 8
    },
    emptySub: {
        ...theme.typography.caption
    },
    maintenanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        padding: 14,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 12,
    },
    maintenanceTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991B1B',
        marginBottom: 2,
    },
    maintenanceText: {
        fontSize: 12,
        color: '#B91C1C',
        lineHeight: 16,
    },
    announcementCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        padding: 14,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 12,
        ...theme.shadows.soft,
    },
    announcementAlert: {
        backgroundColor: '#FEF2F2',
        borderLeftColor: '#DC2626',
    },
    announcementWarning: {
        backgroundColor: '#FFFBEB',
        borderLeftColor: '#D97706',
    },
    announcementIconWrapper: {
        marginRight: 10,
        marginTop: 2,
    },
    announcementTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    announcementBody: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    announcementClose: {
        padding: 4,
    },
});

export default DashboardScreen;
