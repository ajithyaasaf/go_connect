import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { authService } from '../services/auth';
import { theme } from '../theme';
import { useRemoteConfigStore } from '../services/remoteConfig';
import { useOtaStore } from '../ota/useOtaStore';
import { AlertTriangle } from 'lucide-react-native';

const LoginScreen = () => {
    const [accessPin, setAccessPin] = useState('');
    const [loading, setLoading] = useState(false);
    const isMaintenance = useRemoteConfigStore((s) => s.isMaintenance);
    const maintenanceMessage = useRemoteConfigStore((s) => s.maintenanceMessage);
    const { appVersion, currentBundleVersion, isOtaActive } = useOtaStore();

    const handleLogin = async () => {
        if (!accessPin || accessPin.length < 3) {
            Alert.alert('Invalid PIN', 'Please enter your access key.');
            return;
        }

        setLoading(true);
        try {
            await authService.loginWithAccessKey(accessPin);
        } catch (error: any) {
            console.error(error);
            Alert.alert(
                'Access Denied',
                'Invalid PIN. If this is your first time, use the default Admin PIN: 123456'
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Verifying Access...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Decorative Background Blob */}
            <View style={styles.blob} />

            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Text style={{ fontSize: 40 }}>🚀</Text>
                </View>
                <Text style={styles.title}>GoConnect</Text>
                <Text style={styles.subtitle}>Secure Workspace</Text>
            </View>

            {/* Maintenance notice if active */}
            {isMaintenance && (
                <View style={styles.maintenanceBox}>
                    <AlertTriangle size={18} color="#DC2626" style={{ marginRight: 8 }} />
                    <Text style={styles.maintenanceText}>{maintenanceMessage}</Text>
                </View>
            )}

            <View style={styles.form}>
                <Text style={styles.label}>Access PIN</Text>
                <TextInput
                    style={styles.input}
                    placeholder="• • • • • •"
                    value={accessPin}
                    onChangeText={setAccessPin}
                    secureTextEntry
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={10}
                    placeholderTextColor={theme.colors.textLight}
                />

                <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Enter Workspace</Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Default PIN: <Text style={{ fontWeight: 'bold' }}>123456</Text>
                </Text>
            </View>

            {/* Version and OTA footprint */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    GoConnect v{appVersion} • {isOtaActive ? `OTA #${currentBundleVersion}` : 'Stock'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: theme.colors.background,
    },
    blob: {
        position: 'absolute',
        top: -150,
        left: -100,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.15,
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    title: {
        ...theme.typography.header,
        color: theme.colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        ...theme.typography.subHeader,
        color: theme.colors.textSecondary,
        fontSize: 18,
    },
    form: {
        backgroundColor: theme.colors.surface,
        padding: 32,
        borderRadius: theme.spacing.radius.l,
        ...theme.shadows.card,
    },
    label: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    input: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.spacing.radius.pill,
        fontSize: 24,
        marginBottom: 32,
        color: theme.colors.text,
        textAlign: 'center',
        fontWeight: '700',
        letterSpacing: 8,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18,
        borderRadius: theme.spacing.radius.pill,
        alignItems: 'center',
        ...theme.shadows.glow,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    hint: {
        marginTop: 24,
        textAlign: 'center',
        color: theme.colors.textLight,
        fontSize: 13,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    maintenanceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    maintenanceText: {
        flex: 1,
        color: '#991B1B',
        fontSize: 12,
        fontWeight: '600',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
});

export default LoginScreen;
