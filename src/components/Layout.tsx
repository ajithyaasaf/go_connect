import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView, ViewStyle, StatusBarStyle } from 'react-native';
import { theme } from '../theme';

interface LayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    barStyle?: StatusBarStyle;
    backgroundColor?: string;
}

/**
 * Standard Layout Wrapper
 * Enforces the professional background color and handles StatusBar.
 */
export const Layout = ({
    children,
    style,
    barStyle = 'dark-content',
    backgroundColor = theme.colors.background
}: LayoutProps) => {
    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar
                barStyle={barStyle}
                backgroundColor={backgroundColor}
                translucent={false}
            />
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.content, style]}>
                    {children}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
    }
});
