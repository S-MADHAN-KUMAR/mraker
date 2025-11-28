import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, type ThemeColorSet } from '@/constants/theme';
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
  const styles = useMemo(() => createStyles(palette), [palette]);

  const renderTabIcon = (imageKey: keyof typeof TAB_IMAGES, iconName: Parameters<typeof IconSymbol>[0]['name'], label: string) => {
    const TabIconComponent = ({ focused }: { focused: boolean }) => {
      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(focused ? 1.1 : 1, { damping: 15 }) }],
      }));

      return (
        <View style={styles.tabContainer}>
          <Animated.View style={[animatedStyle, styles.iconContainer]}>
            <Image
              source={TAB_IMAGES[imageKey]}
              style={[
                styles.tabImage,
                focused && { borderColor: palette.accent, borderWidth: 2 },
              ]}
              contentFit="cover"
              transition={200}
            />
          </Animated.View>
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              {
                color: focused ? palette.accent : palette.icon,
                fontWeight: focused ? '700' : '500',
              },
            ]}>
            {label}
          </Text>
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
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarBackground: () => (
          <View style={styles.tabBackground}>
            <LinearGradient
              colors={[palette.card, palette.cardElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: renderTabIcon('home', 'house.fill', 'Home'),
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Savings',
          tabBarIcon: renderTabIcon('savings', 'banknote.fill', 'Savings'),
        }}
      />
      <Tabs.Screen
        name="work-tracker"
        options={{
          title: 'Work Tracker',
          tabBarIcon: renderTabIcon('work', 'briefcase.fill', 'Work'),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: renderTabIcon('expenses', 'arrow.down.circle.fill', 'Expenses'),
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'صلاة',
          tabBarIcon: renderTabIcon('prayers', 'moon.stars.fill', 'Prayers'),
        }}
      />
    </Tabs>
  );
}

const createStyles = (palette: ThemeColorSet) =>
  StyleSheet.create({
    tabBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      borderRadius: 24,
      height: 80,
      paddingTop: 10,
      paddingBottom: 10,
      paddingHorizontal: 8,
      borderTopWidth: 0,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      backgroundColor: 'transparent',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 0,
      height: '100%',
    },
    tabBackground: {
      flex: 1,
      borderRadius: 24,
      overflow: 'hidden',
    },
    tabGradient: {
      flex: 1,
      opacity: 0.98,
    },
    tabContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      width: '100%',
      height: '100%',
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
    },
    tabImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    tabLabel: {
      fontSize: 10,
      marginTop: 0,
      textAlign: 'center',
      letterSpacing: 0.2,
      lineHeight: 12,
    },
  });
