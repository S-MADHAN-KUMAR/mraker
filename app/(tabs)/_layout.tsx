import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Tab image mappings
const TAB_IMAGES = {
  home: require('@/assets/images/tab-icons/home.jpeg'),
  savings: require('@/assets/images/tab-icons/savings.jpeg'),
  work: require('@/assets/images/tab-icons/remainder.jpeg'),
  expenses: require('@/assets/images/tab-icons/logo.png'),
  prayers: require('@/assets/images/tab-icons/namaz.jpeg'),
} as const;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  const renderTabIcon = (imageKey: keyof typeof TAB_IMAGES, iconName: Parameters<typeof IconSymbol>[0]['name'], label: string, isHome: boolean = false) => {
    const TabIconComponent = ({ focused }: { focused: boolean }) => {
      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(focused ? 1.15 : 1, { damping: 15 }) }],
      }));

      const iconSize = isHome ? 48 : 40;
      const containerSize = isHome ? 56 : 48;

      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center', width: containerSize, height: containerSize }]}>
            <Image
              source={TAB_IMAGES[imageKey]}
              style={[
                { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
                focused && { borderColor: palette.accent, borderWidth: 3 },
              ]}
              contentFit="cover"
              transition={200}
            />
          </Animated.View>
        </View>
      );
    };
    TabIconComponent.displayName = `${label}TabIcon`;
    return TabIconComponent;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
       
       tabBarStyle: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 100,
        paddingTop: 24,
        paddingBottom: 10,
        borderTopLeftRadius: 46,
        borderTopRightRadius: 46,
        paddingHorizontal: 8,
        backgroundColor: 'black',
      }
      }}>
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Savings',
          tabBarIcon: renderTabIcon('savings', 'banknote.fill', 'Savings', false),
        }}
      />
      <Tabs.Screen
        name="work-tracker"
        options={{
          title: 'Work Tracker',
          tabBarIcon: renderTabIcon('work', 'briefcase.fill', 'Work', false),
        }}
      />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: renderTabIcon('home', 'house.fill', 'Home', true),
          }}
        />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: renderTabIcon('expenses', 'arrow.down.circle.fill', 'Expenses', false),
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'صلاة',
          tabBarIcon: renderTabIcon('prayers', 'moon.stars.fill', 'Prayers', false),
        }}
      />
    </Tabs>
  );
}

