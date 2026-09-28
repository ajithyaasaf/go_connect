import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useOtaStore } from '../ota/useOtaStore';
import { otaService } from '../ota/OtaService';
import { theme } from '../theme';
import { Layout } from '../components/Layout';
import {
    User,
    Sparkles,
    RefreshCw,
    RotateCcw,
    Layers,
    CheckCircle,
    Sliders,
    LogOut,
    ShieldCheck,
    Cpu,
} from 'lucide-react-native';
import { authService } from '../services/auth';
import { OtaChannel } from '../ota/types';

export const SettingsScreen = () => {
    const user = useAuthStore((s) => s.user);
    const {
        appVersion,
        buildNumber,
        currentBundleVersion,
        isOtaActive,
        channel,
        status,
        lastChecked,
        autoDownloadEnabled,
        setChannel,
    } = useOtaStore();

    const [isChecking, setIsChecking] = useState(false);

    const handleCheckUpdate = async () => {
        setIsChecking(true);
        try {
            const release = await otaService.checkForUpdate(channel, true);
            if (!release) {
                Alert.alert('Up to Date', `You are running the latest version for channel "${channel}".`);
            }
        } catch (e: any) {
            Alert.alert('Check Failed', e?.message || 'Could not verify updates.');
        } finally {
            setIsChecking(false);
        }
    };

    const handleRollback = () => {
        Alert.alert(
            'Rollback to Base Version',
            'This will delete any downloaded OTA updates and revert the app to its original embedded APK version. The app will restart.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Rollback & Restart',
                    style: 'destructive',
                    onPress: () => otaService.rollbackToBase(),
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: () => authService.signOut(),
            },
        ]);
    };

    const channels: OtaChannel[] = ['production', 'staging', 'canary'];

    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Settings & Updates</Text>
                    <Text style={styles.subtitle}>System configuration and OTA manager</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.card}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.userName}>{user?.name || 'User'}</Text>
                            <Text style={styles.userRole}>Access Key: {user?.accessKey || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* OTA Updates System Section */}
                <View style={styles.sectionHeader}>
                    <Sparkles size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Over-The-Air (OTA) Updates</Text>
                </View>

                <View style={styles.card}>
                    {/* Status Overview */}
                    <View style={styles.otaStatusRow}>
                        <View>
                            <Text style={styles.otaLabel}>Installed Bundle</Text>
                            <Text style={styles.otaValue}>
                                {isOtaActive ? `OTA Bundle #${currentBundleVersion}` : 'Base APK Bundle (Stock)'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, isOtaActive ? styles.otaActiveBadge : styles.stockBadge]}>
                            <ShieldCheck size={14} color={isOtaActive ? '#15803D' : theme.colors.primary} />
                            <Text style={[styles.statusBadgeText, isOtaActive ? styles.otaActiveText : styles.stockText]}>
                                {isOtaActive ? 'OTA Active' : 'Stock'}
                            </Text>
                        </View>
                    </View>

                    {/* Native App Specs */}
                    <View style={styles.specsGrid}>
                        <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Native Version</Text>
                            <Text style={styles.specValue}>{appVersion} ({buildNumber})</Text>
                        </View>
                        <View style={styles.specItem}>
                            <Text style={styles.specLabel}>OTA Channel</Text>
                            <Text style={[styles.specValue, { textTransform: 'capitalize' }]}>{channel}</Text>
                        </View>
                    </View>

                    {/* Channel Selector */}
                    <Text style={styles.channelLabel}>Deployment Channel</Text>
                    <View style={styles.channelRow}>
                        {channels.map((ch) => (
                            <TouchableOpacity
                                key={ch}
                                style={[styles.channelChip, channel === ch && styles.channelChipActive]}
                                onPress={() => setChannel(ch)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.channelChipText, channel === ch && styles.channelChipTextActive]}>
                                    {ch}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Last Checked */}
                    {lastChecked && (
                        <Text style={styles.lastCheckedText}>
                            Last checked: {new Date(lastChecked).toLocaleTimeString()}
                        </Text>
                    )}

                    {/* Actions */}
                    <TouchableOpacity
                        style={styles.checkBtn}
                        onPress={handleCheckUpdate}
                        disabled={isChecking}
                        activeOpacity={0.8}
                    >
                        {isChecking ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.checkBtnText}>Check for Updates</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {isOtaActive && (
                        <TouchableOpacity
                            style={styles.rollbackBtn}
                            onPress={handleRollback}
                            activeOpacity={0.7}
                        >
                            <RotateCcw size={16} color="#EF4444" style={{ marginRight: 6 }} />
                            <Text style={styles.rollbackBtnText}>Rollback to Factory Bundle</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </Layout>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 120,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        ...theme.typography.header,
        fontSize: 28,
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...theme.shadows.card,
        elevation: 2,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    userRole: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    otaStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 16,
    },
    otaLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    otaValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: theme.spacing.radius.pill,
    },
    otaActiveBadge: {
        backgroundColor: '#DCFCE7',
    },
    stockBadge: {
        backgroundColor: '#E0F2FE',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    otaActiveText: {
        color: '#15803D',
    },
    stockText: {
        color: theme.colors.primary,
    },
    specsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    specItem: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
    },
    specLabel: {
        fontSize: 11,
        color: theme.colors.textLight,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    specValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 2,
    },
    channelLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    channelRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    channelChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: theme.spacing.radius.pill,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    channelChipActive: {
        backgroundColor: theme.colors.primary,
    },
    channelChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'capitalize',
    },
    channelChipTextActive: {
        color: '#FFFFFF',
    },
    lastCheckedText: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginBottom: 16,
    },
    checkBtn: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.spacing.radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    checkBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    rollbackBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        paddingVertical: 8,
    },
    rollbackBtnText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        backgroundColor: '#FEE2E2',
        paddingVertical: 16,
        borderRadius: theme.spacing.radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    logoutBtnText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
});
