import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export const LoadingScreen = () => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.text}>Loading...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    text: {
        marginTop: 16,
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
});
