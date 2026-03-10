import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import Swiper from 'react-native-swiper';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: 1,
        title: 'Welcome to GoConnect',
        description: 'Manage your clients, meetings, and schedule efficiently in one place.',
        // Placeholder images using lucide icons or simple views would be better if no assets
        // But user asked for premium design. We will use text/layout for now.
        icon: '👋'
    },
    {
        id: 2,
        title: 'Smart Reminders',
        description: 'Never miss a meeting. Get notified 30 mins, 10 mins, and a day before.',
        icon: '🔔'
    },
    {
        id: 3,
        title: 'Offline First',
        description: 'Work anywhere. Your data syncs automatically when you go back online.',
        icon: '⚡'
    }
];

export const OnboardingScreen = ({ navigation }: any) => {
    const setHasOnboarded = useAuthStore((s) => s.setHasOnboarded);

    const handleDone = () => {
        setHasOnboarded(true);
        // RootNavigator detects change in hasOnboarded and redirects to Auth
    };

    return (
        <View style={styles.container}>
            {/* Decorative Background Blob */}
            <View style={styles.blob} />

            <Swiper
                loop={false}
                dotStyle={styles.dot}
                activeDotStyle={styles.activeDot}
                paginationStyle={styles.pagination}
            >
                {slides.map((slide) => (
                    <View key={slide.id} style={styles.slide}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>{slide.icon}</Text>
                        </View>
                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.description}>{slide.description}</Text>
                    </View>
                ))}
            </Swiper>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handleDone} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    blob: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.2,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    iconContainer: {
        width: 140,
        height: 140,
        backgroundColor: theme.colors.surface,
        borderRadius: 70, // Circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        ...theme.shadows.glow,
    },
    icon: {
        fontSize: 60,
    },
    title: {
        ...theme.typography.header,
        textAlign: 'center',
        marginBottom: 16,
        color: theme.colors.primary, // Pop color for title
    },
    description: {
        ...theme.typography.body,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    pagination: {
        bottom: 130,
    },
    dot: {
        backgroundColor: theme.colors.textLight,
        width: 8,
        height: 8,
        borderRadius: 4,
        margin: 4,
        opacity: 0.3,
    },
    activeDot: {
        backgroundColor: theme.colors.primary,
        width: 24,
        height: 8,
        borderRadius: 4,
        margin: 4,
    },
    footer: {
        padding: 32,
        paddingBottom: 50,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 20,
        borderRadius: theme.spacing.radius.pill, // Pill Shape
        alignItems: 'center',
        ...theme.shadows.glow,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 1,
    }
});
