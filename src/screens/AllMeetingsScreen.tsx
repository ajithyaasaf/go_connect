import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, TextInput } from 'react-native';
import { useMeetingStore } from '../store/useMeetingStore';
import { Meeting } from '../store/types';
import { isToday, isPast, isFuture, parseISO, format } from 'date-fns';
import { FollowUpCard } from '../components/FollowUpCard';
import { theme } from '../theme';
import { Layout } from '../components/Layout';
import { Search } from 'lucide-react-native';

const AllMeetingsScreen = () => {
    const meetings = useMeetingStore((s) => s.meetings);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    const filteredMeetings = useMemo(() => {
        let filtered = meetings.filter(m =>
            m.status !== 'cancelled' &&
            (searchQuery === '' ||
                m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        if (filter === 'upcoming') {
            filtered = filtered.filter(m => isFuture(parseISO(m.dateTime)) || isToday(parseISO(m.dateTime)));
        } else if (filter === 'past') {
            filtered = filtered.filter(m => isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime)));
        }

        return filtered;
    }, [meetings, searchQuery, filter]);

    const sections = useMemo(() => {
        const sorter = (a: Meeting, b: Meeting) => a.dateTime.localeCompare(b.dateTime);

        const overdue = filteredMeetings.filter(m =>
            isPast(parseISO(m.dateTime)) && !isToday(parseISO(m.dateTime)) && m.status !== 'completed'
        ).sort(sorter);

        const today = filteredMeetings.filter(m =>
            isToday(parseISO(m.dateTime))
        ).sort(sorter);

        const upcoming = filteredMeetings.filter(m =>
            isFuture(parseISO(m.dateTime))
        ).sort(sorter);

        const sectionList = [];

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
    }, [filteredMeetings]);

    return (
        <Layout>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>All Meetings</Text>
                    <Text style={styles.count}>{filteredMeetings.length} meetings</Text>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Search color={theme.colors.textSecondary} size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by client or purpose..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>

                {/* Filters */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
                        onPress={() => setFilter('upcoming')}
                    >
                        <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>Upcoming</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
                        onPress={() => setFilter('past')}
                    >
                        <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>Past</Text>
                    </TouchableOpacity>
                </View>

                {/* Meetings List */}
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
                            <Text style={styles.emptyTitle}>No meetings found</Text>
                            <Text style={styles.emptySub}>
                                {searchQuery ? 'Try a different search term' : 'Schedule your first meeting'}
                            </Text>
                        </View>
                    }
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
        paddingTop: 24, // Matches Dashboard
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
        marginBottom: 20,
        paddingHorizontal: 16,
        paddingVertical: 4, // Slimmer container
        borderRadius: theme.spacing.radius.pill,
        ...theme.shadows.soft,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: theme.colors.text,
        height: 48, // Touch target
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12, // Spaced out more
    },
    filterButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: theme.spacing.radius.pill,
        backgroundColor: theme.colors.surface,
        // No border by default, use shadow/elevation
        ...theme.shadows.card,
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
        // Remove shadow when active for "pressed" look or keep glow
        ...theme.shadows.glow,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    sectionHeader: {
        backgroundColor: theme.colors.background, // Stick to bg color
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    listContent: {
        paddingBottom: 120, // Tab bar clearance
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        ...theme.typography.subHeader,
        marginBottom: 8,
    },
    emptySub: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

export default AllMeetingsScreen;
