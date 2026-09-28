import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme';
import { otaService } from './OtaService';
import { useOtaStore } from './useOtaStore';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react-native';
import crashlytics from '@react-native-firebase/crashlytics';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class OtaErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error('[OtaErrorBoundary] Fatal React Error:', error, errorInfo);

        try {
            crashlytics().recordError(error);
        } catch (e) {
            // ignore if crashlytics not configured
        }
    }

    handleRestart = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        otaService.applyUpdateAndRestart();
    };

    handleRollback = () => {
        otaService.rollbackToBase();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { currentBundleVersion, isOtaActive } = useOtaStore.getState();

            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.iconCircle}>
                            <AlertTriangle size={36} color="#EF4444" />
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            The application encountered an unexpected issue.
                        </Text>

                        {isOtaActive && (
                            <View style={styles.otaNotice}>
                                <Text style={styles.otaNoticeText}>
                                    Active OTA Bundle: #{currentBundleVersion}
                                </Text>
                            </View>
                        )}

                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>
                                {this.state.error?.toString() || 'Unknown error occurred.'}
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.restartBtn}
                                onPress={this.handleRestart}
                                activeOpacity={0.8}
                            >
                                <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.restartBtnText}>Restart App</Text>
                            </TouchableOpacity>

                            {isOtaActive && (
                                <TouchableOpacity
                                    style={styles.rollbackBtn}
                                    onPress={this.handleRollback}
                                    activeOpacity={0.8}
                                >
                                    <RotateCcw size={18} color="#EF4444" style={{ marginRight: 8 }} />
                                    <Text style={styles.rollbackBtnText}>
                                        Repair & Revert to Base Version
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    otaNotice: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.spacing.radius.pill,
        marginBottom: 16,
    },
    otaNoticeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    errorCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
    },
    errorText: {
        fontSize: 13,
        color: '#64748B',
        fontFamily: 'monospace',
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    restartBtn: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: theme.spacing.radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    restartBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    rollbackBtn: {
        flexDirection: 'row',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingVertical: 14,
        borderRadius: theme.spacing.radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rollbackBtnText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
});
