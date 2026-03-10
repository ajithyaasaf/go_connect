import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    style?: ViewStyle;
    borderRadius?: number;
}

export const Skeleton = ({ width = '100%', height = 20, style, borderRadius = 4 }: SkeletonProps) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width: width as any, height, opacity, borderRadius }, // Cast to any to silence Animation/Style type mismatch
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: theme.colors.border,
    },
});
