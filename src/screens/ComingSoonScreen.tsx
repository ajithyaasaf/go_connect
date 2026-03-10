import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { theme } from '../theme';

const ComingSoonScreen = ({ title, icon: Icon, message }: { title: string; icon: any; message: string }) => {
    return (
        <View style={styles.container}>
            <Icon color={theme.colors.textSecondary} size={64} strokeWidth={1.5} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: theme.colors.background,
    },
    title: {
        ...theme.typography.header,
        marginTop: 24,
        marginBottom: 8,
    },
    message: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
    },
});

export default ComingSoonScreen;
