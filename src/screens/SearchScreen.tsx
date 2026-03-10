import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SectionList, Dimensions, StatusBar, Keyboard, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { ArrowLeft, X, Search as SearchIcon, Briefcase, Users, Phone } from 'lucide-react-native';
import { useMeetingStore } from '../store/useMeetingStore';
import { useClientStore } from '../store/useClientStore';
import { FollowUpCard } from '../components/FollowUpCard';
import { Meeting, Client } from '../services/schema';

const { width } = Dimensions.get('window');

type FilterType = 'All' | 'Meetings' | 'Clients';

export const SearchScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const meetings = useMeetingStore((s) => s.meetings);
    const clients = useClientStore((s) => s.clients);

    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const inputRef = useRef<TextInput>(null);

    // Auto-focus logic
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Search Logic
    const sections = useMemo(() => {
        if (!query.trim()) return [];

        const lowerQuery = query.toLowerCase().trim();
        const results = [];

        // 1. Search Clients
        if (activeFilter === 'All' || activeFilter === 'Clients') {
            const clientMatches = clients.filter(c =>
                c.name.toLowerCase().includes(lowerQuery) ||
                (c.company && c.company.toLowerCase().includes(lowerQuery)) ||
                (c.phone && c.phone.includes(query))
            );

            if (clientMatches.length > 0) {
                results.push({
                    title: 'Clients',
                    data: clientMatches,
                    type: 'client'
                });
            }
        }

        // 2. Search Meetings
        if (activeFilter === 'All' || activeFilter === 'Meetings') {
            const meetingMatches = meetings.filter(m =>
                m.clientName.toLowerCase().includes(lowerQuery) ||
                m.purpose.toLowerCase().includes(lowerQuery) ||
                m.action.toLowerCase().includes(lowerQuery) ||
                (m.notes && m.notes.toLowerCase().includes(lowerQuery))
            );

            if (meetingMatches.length > 0) {
                results.push({
                    title: 'Meetings',
                    data: meetingMatches,
                    type: 'meeting'
                });
            }
        }

        return results;
    }, [query, activeFilter, meetings, clients]);

    const handleClear = () => {
        setQuery('');
        inputRef.current?.focus();
    };

    const renderClientItem = ({ item }: { item: Client }) => (
        <TouchableOpacity
            style={styles.clientItem}
            activeOpacity={0.7}
            onPress={() => {
                // Future: Navigate to Client Details
                // For now, maybe prepopulate a meeting or just show alert
                // navigation.navigate('ClientDetails', { clientId: item.id });
            }}
        >
            <View style={styles.clientIcon}>
                <Text style={styles.clientIconText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{item.name}</Text>
                {item.company ? <Text style={styles.clientCompany}>{item.company}</Text> : null}
            </View>
            <TouchableOpacity style={styles.actionIcon}>
                <Phone size={18} color={theme.colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderMeetingItem = ({ item }: { item: Meeting }) => (
        <View style={{ marginBottom: 16 }}>
            <FollowUpCard meeting={item} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                    <SearchIcon size={20} color={theme.colors.textLight} />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Search clients, meetings..."
                        placeholderTextColor={theme.colors.textLight}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={handleClear}>
                            <X size={18} color={theme.colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                {(['All', 'Clients', 'Meetings'] as FilterType[]).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterChip,
                            activeFilter === filter && styles.activeFilterChip
                        ]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <Text style={[
                            styles.filterText,
                            activeFilter === filter && styles.activeFilterText
                        ]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Results */}
            <SectionList
                sections={sections}
                keyExtractor={(item: any) => item.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.listContent}
                renderItem={({ item, section }) => {
                    if (section.type === 'client') return renderClientItem({ item });
                    return renderMeetingItem({ item });
                }}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        {query ? (
                            <>
                                <SearchIcon size={48} color={theme.colors.textLight} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <Text style={styles.emptyText}>No results found for "{query}"</Text>
                                <Text style={styles.emptySubText}>Try checking for typos or using broader terms.</Text>
                            </>
                        ) : (
                            <>
                                <Briefcase size={48} color={theme.colors.textLight} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <Text style={styles.emptyText}>Search for anything</Text>
                                <Text style={styles.emptySubText}>Find clients, upcoming meetings, or notes.</Text>
                            </>
                        )}
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 16 : 60,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceSubtle,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.spacing.radius.pill,
        paddingHorizontal: 16,
        height: 48,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.text,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: theme.spacing.radius.pill,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeFilterChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        ...theme.shadows.glow,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    activeFilterText: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 8,
        letterSpacing: 0.5,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.spacing.radius.m,
        marginBottom: 12,
        ...theme.shadows.soft,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    clientIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    clientIconText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 18,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    clientCompany: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    actionIcon: {
        padding: 8,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
