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
  home: require('@/assets/images/home.webp'),
  savings: require('@/assets/images/saving.webp'),
  work: require('@/assets/images/work.png'),
  expenses: require('@/assets/images/expences.png'),
  prayers: require('@/assets/images/remainder.webp'),
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

      const animatedOpacity = useAnimatedStyle(() => ({
        opacity: withSpring(focused ? 1 : 0.4, { damping: 15 }),
      }));

      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center', width: containerSize, height: containerSize }]}>
            <Animated.View style={animatedOpacity}>
              <Image
                source={TAB_IMAGES[imageKey]}
                style={[
                  { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
                ]}
                contentFit="cover"
                transition={200}
              />
            </Animated.View>
          </Animated.View>
        </View>
      );
    };
    TabIconComponent.displayName = `${label}TabIcon`;
    return TabIconComponent;
  };

  return (
    <Tabs
      screenOptions={() => ({
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
          marginTop: 10,
          marginBottom: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          height: 100,
          paddingTop: 20,
          paddingBottom: 8,
          borderTopLeftRadius: 46,
          borderTopRightRadius: 46,
          paddingHorizontal: 8,
          backgroundColor: 'black',
          borderTopWidth: 0,
          elevation: 0,
        },
      })}>
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
          title: 'Work',
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

