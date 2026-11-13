import React from 'react';
import { Tabs, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { TouchableOpacity, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.activeTab,
        tabBarInactiveTintColor: theme.colors.inactiveTab,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="compass" size={size ?? 22} color={color ? String(color) : theme.colors.activeTab} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Icon name="book-open" size={size ?? 22} color={color ? String(color) : theme.colors.activeTab} />
          ),
        }}
      />
      <Tabs.Screen
        name="write-action"
        options={{
          title: 'Write',
          tabBarIcon: ({ size }) => (
            <Icon name="edit-3" size={size ?? 22} color={theme.colors.accent} />
          ),
          tabBarButton: (props: any) => (
            <TouchableOpacity
              onPress={() => router.push('/write')}
              style={[props.style, styles.centerWriteTab]}
              activeOpacity={0.8}
            >
              <Icon name="edit-3" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar" size={size ?? 22} color={color ? String(color) : theme.colors.activeTab} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size ?? 22} color={color ? String(color) : theme.colors.activeTab} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerWriteTab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
