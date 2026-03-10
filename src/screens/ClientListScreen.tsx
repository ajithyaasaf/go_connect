import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useClientStore } from '../store/useClientStore';
import { firestoreService } from '../services/firestore';
import { Client } from '../services/schema';
import { Skeleton } from '../components/Skeleton';
import { theme } from '../theme';

const ClientListScreen = ({ navigation }: any) => {
    const userId = useAuthStore(state => state.user?.id);
    const clients = useClientStore(state => state.clients);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (clients.length === 0) {
            console.log('Client list empty on mount, triggering fetch...');
            loadClients();
        }
    }, [userId]);
    const loadClients = async () => {
        const user = useAuthStore.getState().user;
        if (!user?.accessKey) return;
        try {
            setLoading(true);
            const data = await firestoreService.getClientsForUser(user.accessKey);
            useClientStore.getState().setClients(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCall = async (phone: string) => {
        try {
            // Remove non-numeric except +
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            // On modern Android, canOpenURL can return false for tel: links even if they work.
            // We'll attempt to open and fallback to alert.
            await Linking.openURL(`tel:${cleanPhone}`);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Unable to initiate call. Please dial manually.');
        }
    };

    const handleWhatsApp = async (phone: string) => {
        try {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            // wa.me is more reliable than whatsapp:// scheme
            const whatsappURL = `https://wa.me/${cleanPhone}`;
            await Linking.openURL(whatsappURL);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to open WhatsApp');
        }
    };

    const renderItem = ({ item }: { item: Client }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.company && <Text style={styles.company}>{item.company}</Text>}
                    <Text style={styles.phone}>{item.phone}</Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(item.phone)}>
                    <Text style={styles.actionText}>📞 Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleWhatsApp(item.phone)}>
                    <Text style={styles.actionText}>💬 WhatsApp</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.searchWrapper}>
                    <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, company or phone..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <X size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={styles.cardSkeleton}>
                            <Skeleton width={50} height={50} borderRadius={25} style={{ marginRight: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                                <Skeleton width="40%" height={16} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredClients}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadClients} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No clients found. Swipe down to refresh.</Text>
                            <Text style={styles.phone}>UID: {userId}</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddClient')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background, // New background
    },
    headerContainer: {
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: theme.colors.background,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.radius.pill, // Pill Shape
        paddingHorizontal: 16,
        paddingVertical: 4, // Taller pill
        ...theme.shadows.soft, // Soft shadow
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: theme.colors.text,
    },
    clearButton: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 20, // Align with headers
        paddingTop: 10,
        paddingBottom: 120, // FAB clearance
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.radius.l, // 24px
        padding: 20,
        marginBottom: 16,
        ...theme.shadows.card,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primaryLight + '20', // Tinted bg
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    company: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    phone: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.background, // Subtle divider
    },
    actionButton: {
        flex: 1, // Full width buttons
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        marginRight: 10,
        backgroundColor: theme.colors.background,
        borderRadius: theme.spacing.radius.m,
    },
    actionText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
        marginLeft: 6,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 110, // Avoid Tab Bar
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.glow,
    },
    fabText: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: -4,
    },
    cardSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        marginBottom: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.radius.l,
        ...theme.shadows.card,
    }
});

export default ClientListScreen;
