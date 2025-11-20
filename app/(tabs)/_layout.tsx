import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/store/useTheme';

export default function TabLayout() {
  const { palette } = useTheme();

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.text,
          headerShown: false,
          tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          marginBottom: -6,
          bottom: -6,
          borderRadius: 28,
          height: 80,
          paddingTop: 10,
          backgroundColor: palette.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 12,
        },
          tabBarItemStyle: {
            paddingTop: 10,
            paddingBottom: 10,
          },
          tabBarIconStyle: {
            marginBottom: -20,
          },
          tabBarShowLabel: false,
        }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
