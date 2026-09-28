import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { Home, Calendar as CalendarIcon, Users, Menu, Plus } from 'lucide-react-native';
import { theme } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import ClientListScreen from '../screens/ClientListScreen';
import AllMeetingsScreen from '../screens/AllMeetingsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// 🎨 Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    return (
        <View style={styles.tabBarContainer}>
            {/* Dark Pill Background */}
            <View style={[StyleSheet.absoluteFill, styles.pillBackground]} />

            <View style={styles.tabBarContent}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    // Central FAB Logic (Style as a floating distinct element or integrated)
                    if (route.name === 'AddAction') {
                        return (
                            <View key={index} style={styles.fabWrapper}>
                                <TouchableOpacity
                                    style={styles.fab}
                                    onPress={() => navigation.navigate('AddMeeting')}
                                    activeOpacity={0.8}
                                >
                                    <Plus color={theme.colors.primary} size={32} strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    // Icons
                    let IconComponent = Home;
                    if (route.name === 'Dashboard') IconComponent = Home;
                    if (route.name === 'Calendar') IconComponent = CalendarIcon;
                    if (route.name === 'Clients') IconComponent = Users;
                    if (route.name === 'Menu') IconComponent = Menu;

                    // Active State: White vs Inactive Grey
                    const iconColor = isFocused ? theme.colors.navActive : theme.colors.navInactive;

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                                <IconComponent
                                    color={iconColor}
                                    size={26}
                                    strokeWidth={isFocused ? 2.5 : 2}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: 'transparent',
                    height: 100, // Increased for floating area
                }
            }}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Calendar" component={AllMeetingsScreen} />

            {/* Dummy Screen for FAB */}
            <Tab.Screen
                name="AddAction"
                component={DashboardScreen}
                options={{ tabBarLabel: () => null }}
            />

            <Tab.Screen name="Clients" component={ClientListScreen} />
            <Tab.Screen name="Menu" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 30, // Floating higher
        left: 20,
        right: 20,
        height: 80,
        borderRadius: 40, // Pill shape
        ...theme.shadows.soft, // Soft shadow for depth
        shadowColor: theme.colors.primary, // Tinted shadow
    },
    pillBackground: {
        backgroundColor: theme.colors.navBackground,
        borderRadius: 40,
        opacity: 1,
    },
    tabBarContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        padding: 10,
        borderRadius: 20,
    },
    activeIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle highlight
    },
    fabWrapper: {
        flex: 1,
        top: -25, // Pop out out of the bar
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.glow,
        borderWidth: 5,
        borderColor: theme.colors.background, // Knockout effect against the screen background
    }
});
