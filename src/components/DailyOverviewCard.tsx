import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { theme } from '../theme';
import { Trophy, Users } from 'lucide-react-native';
import { useMeetingStore } from '../store/useMeetingStore';
import { isToday, parseISO } from 'date-fns';

const { width } = Dimensions.get('window');

export const DailyOverviewCard = () => {
    const meetings = useMeetingStore((s) => s.meetings);

    // Calculate Today's Pending Stats
    const todayMeetings = meetings.filter(m => isToday(parseISO(m.dateTime)) && m.status !== 'cancelled');
    const pendingCount = todayMeetings.filter(m => m.status !== 'completed').length;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Daily Overview</Text>
                    <View style={styles.iconBadge}>
                        <Trophy size={20} color={theme.colors.accentDark} fill={theme.colors.accent} />
                    </View>
                </View>

                <Text style={styles.subtitle}>
                    {pendingCount === 0
                        ? "You're all caught up for today!"
                        : `You have ${pendingCount} task${pendingCount === 1 ? '' : 's'} pending today.`}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.avatars}>
                        {/* Simulation of "Team" or "Clients" */}
                        <View style={[styles.avatar, { backgroundColor: '#FCA5A5', zIndex: 3 }]} />
                        <View style={[styles.avatar, { backgroundColor: '#93C5FD', zIndex: 2, marginLeft: -10 }]} />
                        <View style={[styles.avatar, { backgroundColor: '#FCD34D', zIndex: 1, marginLeft: -10 }]} />
                        <View style={[styles.avatar, { backgroundColor: theme.colors.surface, zIndex: 0, marginLeft: -10, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={styles.moreText}>+2</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Decorative Circle/Shape */}
            <View style={styles.circleDecoration} />
            <View style={styles.circleDecorationSmall} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.primary, // Ocean Blue bg
        borderRadius: 32,
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 24,
        height: 180,
        overflow: 'hidden',
        position: 'relative',
        ...theme.shadows.soft,
    },
    content: {
        zIndex: 10,
        flex: 1,
        justifyContent: 'space-between'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF', // White text on Blue
        lineHeight: 32,
        maxWidth: '70%',
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)', // Soft white
        fontWeight: '500',
        marginTop: 4,
    },
    iconBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 'auto',
    },
    avatars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: theme.colors.primary, // Match bg
        backgroundColor: 'white',
    },
    moreText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    circleDecoration: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: theme.colors.primaryDark,
        opacity: 0.3,
    },
    circleDecorationSmall: {
        position: 'absolute',
        right: 40,
        top: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.4,
    }
});
