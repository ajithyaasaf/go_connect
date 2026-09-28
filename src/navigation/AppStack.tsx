import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';
import AddMeetingScreen from '../screens/AddMeetingScreen';
import AddClientScreen from '../screens/AddClientScreen';
import MeetingDetailsScreen from '../screens/MeetingDetailsScreen';
import { SearchScreen } from '../screens/SearchScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false, // Tabs handle their own specific headers or are headless
                contentStyle: { backgroundColor: '#F8FAFC' }, // Match Theme
            }}
        >
            {/* The Tab Navigator is the main "Screen" */}
            <Stack.Screen name="Main" component={BottomTabNavigator} />

            {/* Modals and Full Screen Flows */}
            <Stack.Screen
                name="AddMeeting"
                component={AddMeetingScreen}
                options={{
                    title: 'New Meeting',
                    presentation: 'modal',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="AddClient"
                component={AddClientScreen}
                options={{
                    title: 'Add New Client',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="MeetingDetails"
                component={MeetingDetailsScreen}
                options={{
                    title: 'Meeting Details',
                    headerShown: true,
                    presentation: 'card',
                    contentStyle: { backgroundColor: '#F8FAFC' }, // Fix white overlay on Android
                }}
            />

            <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{
                    headerShown: false,
                    animation: 'fade',
                    presentation: 'fullScreenModal',
                }}
            />
            {/* Note: ClientList is now inside the Tabs, so we don't need it here unless we want a specific pushed version */}
        </Stack.Navigator>
    );
};