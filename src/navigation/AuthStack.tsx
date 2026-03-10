import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
// import VerifyOtpScreen from '../screens/VerifyOtpScreen'; // Todo

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            {/* <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} /> */}
        </Stack.Navigator>
    );
};
