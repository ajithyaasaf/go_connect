import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { firestoreService } from '../services/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { useClientStore } from '../store/useClientStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '../services/schema';
import { theme } from '../theme';
import { SyncService } from '../services/sync';

const AddClientScreen = ({ navigation }: any) => {
    const userId = useAuthStore(state => state.user?.id);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Client name is required');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Validation Error', 'Phone number is required');
            return;
        }

        if (!userId) {
            Alert.alert('Error', 'User not authenticated');
            return;
        }

        setLoading(true);
        try {
            const user = useAuthStore.getState().user;
            const newId = uuidv4();
            const timestamp = Date.now();

            const newClient: Client = {
                id: newId,
                userId: userId,
                accessKey: user?.accessKey || 'default', // Fallback for type safety, though auth guard prevents this
                name: name.trim(),
                phone: phone.trim(),
                company: company.trim() || undefined,
                notes: notes.trim() || undefined,
                createdAt: new Date().toISOString()
            };

            // Local store update
            useClientStore.getState().addClient(newClient);

            // Add to offline queue
            useOfflineStore.getState().addToQueue({
                id: uuidv4(),
                type: 'CREATE_CLIENT' as any, // Need to handle this type in api.ts
                payload: newClient,
                timestamp,
                retryCount: 0,
            });

            // Trigger immediate sync
            SyncService.processQueue();

            Alert.alert('Success', 'Client added successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    placeholder="e.g. John Doe"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    placeholder="e.g. +1 555 123 4567"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <Text style={styles.label}>Company (Optional)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    placeholder="e.g. Acme Corp"
                    value={company}
                    onChangeText={setCompany}
                    returnKeyType="next"
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <Text style={styles.label}>Notes</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface }]}
                    placeholder="Additional details..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Save Client</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    form: {
        padding: 24,
    },
    label: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.radius.pill, // Pill shape
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text,
        ...theme.shadows.soft, // Soft shadow instead of border
    },
    textArea: {
        borderRadius: theme.spacing.radius.l, // Larger radius for text area
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18,
        borderRadius: theme.spacing.radius.pill,
        alignItems: 'center',
        marginTop: 40,
        ...theme.shadows.glow,
    },
    disabledButton: {
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default AddClientScreen;
