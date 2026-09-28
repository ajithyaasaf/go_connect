import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, TextInput } from 'react-native';
import { useMeetingStore } from '../store/useMeetingStore';
import { Meeting } from '../store/types';
import {
    isToday,
    isPast,
    isFuture,
    parseISO,
    format,
    isSameDay,
    subDays,
    addDays,
} from 'date-fns';
import { FollowUpCard } from '../components/FollowUpCard';
import { theme } from '../theme';
import { Layout } from '../components/Layout';
import {
    Search,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    Clock,
    RotateCcw,
    Plus,
} from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import { useNavigation } from '@react-navigation/native';

export const AllMeetingsScreen = () => {
    const navigation = useNavigation<any>();
    const meetings = useMeetingStore((s) => s.meetings);

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Filter meetings
    const filteredMeetings = useMemo(() => {
        let list = meetings.filter(m =>
            m.status !== 'cancelled' &&
            (searchQuery === '' ||
                m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // If a specific date is selected for Activity History
        if (selectedDate) {
            return list.filter(m => isSameDay(parseISO(m.dateTime), selectedDate));
        }

        // Standard filters when no date is picked
        if (filter === 'upcoming') {
            list = list.filter(m => isFuture(parseISO(m.dateTime)) || isToday(parseISO(m.dateTime)));
        } else if (filter === 'past') {
            list = list.filter(m => isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime)));
        }

        return list;
    }, [meetings, searchQuery, filter, selectedDate]);

    // Compute sections
    const sections = useMemo(() => {
        const sorter = (a: Meeting, b: Meeting) => a.dateTime.localeCompare(b.dateTime);

        if (selectedDate) {
            // Activity History mode: divide into Scheduled vs Completed for the selected date
            const pending = filteredMeetings.filter(m => m.status !== 'completed').sort(sorter);
            const completed = filteredMeetings.filter(m => m.status === 'completed').sort(sorter);

            const list = [];
            if (pending.length > 0) {
                list.push({ title: 'Pending / Scheduled', data: pending, color: theme.colors.primary });
            }
            if (completed.length > 0) {
                list.push({ title: 'Completed Activities', data: completed, color: '#10B981' });
            }
            return list;
        }

        // Standard timeline grouping
        const overdue = filteredMeetings.filter(m =>
            isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime)) && m.status !== 'completed'
        ).sort(sorter);

        const today = filteredMeetings.filter(m => isToday(parseISO(m.dateTime))).sort(sorter);

        const upcoming = filteredMeetings.filter(m => isFuture(parseISO(m.dateTime))).sort(sorter);

        const past = filter === 'past'
            ? filteredMeetings.filter(m => isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime))).sort(sorter)
            : [];

        const sectionList = [];

        if (filter === 'past') {
            if (past.length > 0) {
                sectionList.push({ title: 'Past Activities', data: past, color: theme.colors.textSecondary });
            }
            return sectionList;
        }

        if (overdue.length > 0) {
            sectionList.push({ title: 'Overdue', data: overdue, color: theme.colors.error });
        }
        if (today.length > 0) {
            sectionList.push({ title: 'Today', data: today, color: theme.colors.primary });
        }
        if (upcoming.length > 0) {
            sectionList.push({ title: 'Upcoming', data: upcoming, color: theme.colors.primaryLight });
        }

        return sectionList;
    }, [filteredMeetings, selectedDate, filter]);

    // Selected Date Statistics
    const dateStats = useMemo(() => {
        if (!selectedDate) return null;
        const total = filteredMeetings.length;
        const completed = filteredMeetings.filter(m => m.status === 'completed').length;
        const pending = total - completed;
        return { total, completed, pending };
    }, [filteredMeetings, selectedDate]);

    // Quick Date Handlers
    const handlePickToday = () => {
        setSelectedDate(new Date());
    };

    const handlePickYesterday = () => {
        setSelectedDate(subDays(new Date(), 1));
    };

    const handlePrevDay = () => {
        setSelectedDate(prev => subDays(prev || new Date(), 1));
    };

    const handleNextDay = () => {
        setSelectedDate(prev => addDays(prev || new Date(), 1));
    };

    const handleClearDate = () => {
        setSelectedDate(null);
    };

    return (
        <Layout>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {selectedDate ? 'Activity History' : 'Calendar & History'}
                    </Text>
                    <Text style={styles.count}>
                        {selectedDate
                            ? `${dateStats?.total || 0} activities on ${format(selectedDate, 'MMM d, yyyy')}`
                            : `${filteredMeetings.length} total meetings`}
                    </Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search color={theme.colors.textSecondary} size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by client or purpose..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                            <X size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Date Presets & Filter Row */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, !selectedDate && filter === 'all' && styles.filterButtonActive]}
                        onPress={() => { setSelectedDate(null); setFilter('all'); }}
                    >
                        <Text style={[styles.filterText, !selectedDate && filter === 'all' && styles.filterTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, selectedDate && isToday(selectedDate) && styles.filterButtonActive]}
                        onPress={handlePickToday}
                    >
                        <Text style={[styles.filterText, selectedDate && isToday(selectedDate) && styles.filterTextActive]}>
                            Today
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, selectedDate && isSameDay(selectedDate, subDays(new Date(), 1)) && styles.filterButtonActive]}
                        onPress={handlePickYesterday}
                    >
                        <Text style={[styles.filterText, selectedDate && isSameDay(selectedDate, subDays(new Date(), 1)) && styles.filterTextActive]}>
                            Yesterday
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, styles.datePickerBtn, selectedDate && styles.filterButtonActive]}
                        onPress={() => setIsDatePickerOpen(true)}
                    >
                        <CalendarIcon size={14} color={selectedDate ? '#FFFFFF' : theme.colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.filterText, selectedDate && styles.filterTextActive]}>
                            {selectedDate ? format(selectedDate, 'dd MMM') : 'Pick Date'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Active Date Day-Stepper & Activity Summary Banner */}
                {selectedDate && (
                    <View style={styles.historyBanner}>
                        <View style={styles.historyStepperRow}>
                            <TouchableOpacity onPress={handlePrevDay} style={styles.stepperArrow} activeOpacity={0.7}>
                                <ChevronLeft size={20} color={theme.colors.text} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setIsDatePickerOpen(true)}
                                style={styles.historyDateCenter}
                                activeOpacity={0.7}
                            >
                                <CalendarIcon size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                                <Text style={styles.historyDateTitle}>
                                    {format(selectedDate, 'EEEE, d MMMM yyyy')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleNextDay} style={styles.stepperArrow} activeOpacity={0.7}>
                                <ChevronRight size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.historySummaryRow}>
                            <View style={styles.statChip}>
                                <CheckCircle2 size={13} color="#10B981" style={{ marginRight: 4 }} />
                                <Text style={styles.statChipText}>{dateStats?.completed} Done</Text>
                            </View>
                            <View style={styles.statChip}>
                                <Clock size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                                <Text style={styles.statChipText}>{dateStats?.pending} Pending</Text>
                            </View>

                            <TouchableOpacity onPress={handleClearDate} style={styles.clearDateBtn} activeOpacity={0.7}>
                                <RotateCcw size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={styles.clearDateText}>Show All</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Section List of Meetings */}
                <SectionList
                    sections={sections}
                    renderItem={({ item, section }) => (
                        <FollowUpCard
                            meeting={item}
                            highlightColor={section.color}
                        />
                    )}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: section.color }]}>
                                {section.title} ({section.data.length})
                            </Text>
                        </View>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <CalendarIcon size={48} color={theme.colors.border} style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyTitle}>
                                {selectedDate ? 'No activity on this date' : 'No meetings found'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {selectedDate
                                    ? `There are no meetings or follow-ups recorded for ${format(selectedDate, 'MMMM d, yyyy')}.`
                                    : searchQuery ? 'Try a different search term' : 'Schedule your first meeting'}
                            </Text>
                            {selectedDate && (
                                <TouchableOpacity
                                    style={styles.scheduleOnDateBtn}
                                    onPress={() => navigation.navigate('AddMeeting')}
                                    activeOpacity={0.8}
                                >
                                    <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.scheduleOnDateText}>New Meeting</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                {/* Interactive Date Picker Modal */}
                <DatePicker
                    modal
                    open={isDatePickerOpen}
                    date={selectedDate || new Date()}
                    mode="date"
                    onConfirm={(date) => {
                        setIsDatePickerOpen(false);
                        setSelectedDate(date);
                    }}
                    onCancel={() => {
                        setIsDatePickerOpen(false);
                    }}
                />
            </View>
        </Layout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    title: {
        ...theme.typography.header,
        marginBottom: 4,
    },
    count: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: theme.spacing.radius.pill,
        ...theme.shadows.soft,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: theme.colors.text,
        height: 48,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 14,
        gap: 8,
    },
    filterButton: {
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: theme.spacing.radius.pill,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.card,
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.glow,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    historyBanner: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        padding: 14,
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    historyStepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    stepperArrow: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    historyDateCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyDateTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    historySummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    clearDateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    clearDateText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    sectionHeader: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    listContent: {
        paddingBottom: 120,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        ...theme.typography.subHeader,
        marginBottom: 6,
    },
    emptySub: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    scheduleOnDateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        ...theme.shadows.glow,
    },
    scheduleOnDateText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default AllMeetingsScreen;
