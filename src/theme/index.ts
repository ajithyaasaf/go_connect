import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// 🎨 Fantastic & Vibrant Color Palette
// Strategy: Playful, High-Energy, "Daily Challenge" Aesthetic
export const colors = {
    // 1. Primary: Ocean Blue
    primary: '#2596be',
    primaryLight: '#5FB4D9',
    primaryDark: '#1A6B8A',

    // 2. Secondary: Deep Navy (Contrast)
    secondary: '#0F3D56',
    secondaryLight: '#1E5F82',

    // 3. Accent/Background: Soft Light Blue
    accent: '#E3F4F9',       // Very subtle blue highlight
    accentDark: '#2596be',   // Use primary for dark accent to keep strict

    // Neutrals
    background: '#FFFFFF',   // User requested White
    surface: '#FFFFFF',      // White for contrast
    surfaceSubtle: '#F9FAFB', // Very subtle gray for differentiation if needed

    // Text
    text: '#0F3D56',         // Navy for primary text
    textSecondary: '#547C96', // Muted Blue-Grey
    textLight: '#94A3B8',

    // Semantic (Adhering to Blue/Navy spectrum where possible, standard otherwise)
    success: '#2596be',      // Use Primary for success to keep palette tight
    warning: '#1A6B8A',      // Use Dark Primary
    error: '#EF4444',        // Keep standard red for errors (UX necessity)
    info: '#2596be',
    border: '#E2E8F0',

    // UI Specific
    navBackground: '#0F3D56', // Deep Navy for Navigation
    navActive: '#FFFFFF',
    navInactive: '#5FB4D9',
};

// 📐 Spacing & Layout
export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
    // Roundness
    radius: {
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        pill: 9999,
    },
    fullWidth: width,
    fullHeight: height,
};

// 🖋 Typography (Modern, Clean, Friendly)
export const typography = {
    header: {
        fontSize: 32,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
        color: colors.text,
    },
    subHeader: {
        fontSize: 20,
        fontWeight: '600' as const,
        color: colors.text, // Darker subheaders
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.textSecondary,
    },
    caption: {
        fontSize: 14,
        fontWeight: '500' as const,
        color: colors.textLight,
    },
    // Button Text
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
    }
};

// 🌑 Shadows (Soft, Colorful, "3D" Feel)
export const shadows = {
    soft: {
        shadowColor: colors.primary, // Tinted shadow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 5,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    sharp: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2,
    },
    glow: {
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 6,
    },
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    }
};

export const theme = {
    colors,
    spacing,
    typography,
    shadows,
    layout: {
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: spacing.radius.l,
            padding: spacing.m,
            ...shadows.card,
        }
    },
};
