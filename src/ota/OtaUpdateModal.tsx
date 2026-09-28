import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useOtaStore } from './useOtaStore';
import { otaService } from './OtaService';
import { theme } from '../theme';
import { Sparkles, Download, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const OtaUpdateModal = () => {
    const {
        isModalVisible,
        availableRelease,
        status,
        downloadProgress,
        bytesDownloaded,
        totalBytes,
        isMandatory,
        error,
        setModalVisible,
    } = useOtaStore();

    if (!isModalVisible || !availableRelease) {
        return null;
    }

    const isDownloading = status === 'downloading';
    const isReady = status === 'ready';

    const handleAction = () => {
        if (isReady) {
            otaService.applyUpdateAndRestart(availableRelease);
        } else if (isDownloading) {
            // Already in progress
        } else {
            otaService.downloadAndStageUpdate(availableRelease, true);
        }
    };

    const handleDismiss = () => {
        if (!isMandatory && !isDownloading) {
            setModalVisible(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) return '0 KB';
        const kb = bytes / 1024;
        if (kb < 1024) return `${Math.round(kb)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    };

    return (
        <Modal
            transparent
            visible={isModalVisible}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconBadge}>
                            <Sparkles size={24} color={theme.colors.primary} />
                        </View>
                        {!isMandatory && !isDownloading && (
                            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} activeOpacity={0.7}>
                                <X size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.versionBadge}>
                        Version {availableRelease.version} • Bundle #{availableRelease.bundleVersion}
                    </Text>

                    {/* Release Notes */}
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesHeader}>What's New:</Text>
                        <Text style={styles.notesBody}>
                            {availableRelease.releaseNotes || 'Bug fixes, speed enhancements, and new feature updates.'}
                        </Text>
                    </View>

                    {/* Progress Bar when downloading */}
                    {isDownloading && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, { width: `${Math.max(5, downloadProgress)}%` }]} />
                            </View>
                            <View style={styles.progressStats}>
                                <Text style={styles.progressText}>{downloadProgress}% downloaded</Text>
                                <Text style={styles.progressBytes}>
                                    {formatBytes(bytesDownloaded)} / {formatBytes(totalBytes || availableRelease.sizeBytes)}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Error State */}
                    {error && (
                        <View style={styles.errorBox}>
                            <AlertCircle size={16} color={theme.colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                isDownloading && styles.primaryBtnDisabled,
                                isReady && styles.primaryBtnReady,
                            ]}
                            onPress={handleAction}
                            disabled={isDownloading}
                            activeOpacity={0.8}
                        >
                            {isDownloading ? (
                                <View style={styles.btnRow}>
                                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryBtnText}>Downloading...</Text>
                                </View>
                            ) : isReady ? (
                                <View style={styles.btnRow}>
                                    <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryBtnText}>Restart & Apply Now</Text>
                                </View>
                            ) : (
                                <View style={styles.btnRow}>
                                    <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryBtnText}>
                                        {availableRelease.mandatory ? 'Update Now' : 'Download Update'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {!isMandatory && !isDownloading && (
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={handleDismiss}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.secondaryBtnText}>Later</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 61, 86, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: Math.min(width - 40, 380),
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        padding: 24,
        ...theme.shadows.glow,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceSubtle || '#F8FAFC',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 4,
    },
    versionBadge: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 16,
    },
    notesContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    notesHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    notesBody: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text,
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressBarTrack: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 4,
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    progressBytes: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEE2E2',
        padding: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.error,
        flex: 1,
    },
    actions: {
        gap: 10,
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.spacing.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.soft,
    },
    primaryBtnReady: {
        backgroundColor: '#10B981',
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    secondaryBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
});
