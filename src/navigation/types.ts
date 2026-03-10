import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
    Login: undefined;
    VerifyOtp: { phone: string; verificationId: string };
};

export type AppStackParamList = {
    Main: undefined;
    Dashboard: undefined; // Exposed for nested navigation if needed, or remove if Main handles it
    AddMeeting: { meetingId?: string }; // Optional ID for editing
    AddClient: undefined;
    ClientList: undefined;
    Calendar: undefined;
    Settings: undefined;
    MeetingDetails: { meetingId: string };
    Search: undefined;
};

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    App: NavigatorScreenParams<AppStackParamList>;
};
