export const Config = {
    // Toggle this manually or use react-native-config for advanced env management
    ENV: 'dev' as 'dev' | 'prod',

    FIREBASE_PROJECTS: {
        dev: 'goconnect-dev',
        prod: 'goconnect-prod-godivatech',
    },

    // Feature Flags
    ENABLE_ANALYTICS: true,
    ENABLE_CRASHLYTICS: true,
};
