import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients, type ThemeColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PrayerReminder {
  id: string;
  prayer_name: string;
  time: string;
  enabled: boolean;
  ringtone_uri: string | null;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PrayersScreen() {
  const [prayers, setPrayers] = useState<PrayerReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    requestPermissions();
    fetchPrayers();
  }, []);

  useEffect(() => {
    scheduleNotifications();
  }, [scheduleNotifications]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications for prayer reminders');
      }
    }
  };

  const fetchPrayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prayer_reminders')
        .select('*')
        .order('time', { ascending: true });

      if (error) throw error;

      setPrayers(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch prayer reminders');
    } finally {
      setLoading(false);
    }
  };

  const scheduleNotifications = useCallback(async () => {
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule new notifications for enabled prayers
    prayers.forEach(async (prayer) => {
      if (!prayer.enabled) return;

      const [hours, minutes] = prayer.time.split(':').map(Number);
      const trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Prayer Time: ${prayer.prayer_name}`,
          body: `It's time for ${prayer.prayer_name} prayer`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });
    });
  }, [prayers]);

  const handleTimeChange = async (id: string, newTime: string) => {
    try {
      setUpdating(id);
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ time: newTime })
        .eq('id', id);

      if (error) throw error;

      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer time');
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      setUpdating(id);
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ enabled: !enabled })
        .eq('id', id);

      if (error) throw error;

      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer reminder');
    } finally {
      setUpdating(null);
    }
  };

  const handlePickRingtone = async (id: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ ringtone_uri: uri })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Ringtone selected successfully!');
      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select ringtone');
    }
  };

  const testRingtone = async (ringtoneUri: string | null) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (ringtoneUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: ringtoneUri },
          { shouldPlay: true }
        );
        setSound(newSound);
      } else {
        Alert.alert('Info', 'No custom ringtone selected. Default system sound will be used for notifications.');
      }
    } catch {
      Alert.alert('Error', 'Could not play ringtone. Please select a valid audio file.');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <LinearGradient colors={Gradients.midnight} style={styles.headerGradient}>
          <IconSymbol size={160} name="moon.stars.fill" color="rgba(255,255,255,0.08)" />
          <View style={styles.headerCopy}>
            <ThemedText style={styles.headerEyebrow}>Prayer companion</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>
              Serenity in schedule
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Tailored reminders, custom chimes, and a calm interface.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(600)}>
        <ThemedView style={styles.infoCard}>
          <IconSymbol size={24} name="bell.fill" color={palette.accent} />
          <ThemedText style={styles.infoText}>
            Personalize your athan reminders with bespoke tones and smooth scheduling.
          </ThemedText>
        </ThemedView>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={palette.accent} />
          <ThemedText style={styles.loadingText}>Loading prayer reminders...</ThemedText>
        </View>
      ) : (
        <Animated.View entering={FadeInUp.delay(80).duration(600)}>
          <ScrollView style={styles.prayersList}>
            {prayers.map((prayer, index) => (
              <Animated.View key={prayer.id} entering={FadeInUp.delay(index * 60).duration(400)}>
                <ThemedView style={styles.prayerCard}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.prayerNameContainer}>
                      <IconSymbol size={26} name="moon.fill" color={palette.accentSecondary} />
                      <ThemedText type="subtitle" style={styles.prayerName}>
                        {prayer.prayer_name}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, prayer.enabled && styles.toggleButtonEnabled]}
                      onPress={() => handleToggleEnabled(prayer.id, prayer.enabled)}
                      disabled={updating === prayer.id}>
                      {updating === prayer.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText
                          style={[
                            styles.toggleText,
                            prayer.enabled && styles.toggleTextEnabled,
                          ]}>
                          {prayer.enabled ? 'ON' : 'OFF'}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeContainer}>
                    <View style={styles.timeInputRow}>
                      <IconSymbol size={18} name="clock" color={palette.icon} />
                      <TextInput
                        style={styles.timeInput}
                        value={prayer.time}
                        onChangeText={(text) => handleTimeChange(prayer.id, text)}
                        placeholder="HH:MM"
                        placeholderTextColor={palette.muted}
                        editable={!updating}
                      />
                    </View>
                    <ThemedText style={styles.timeDisplay}>{formatTime(prayer.time)}</ThemedText>
                  </View>

                  <View style={styles.ringtoneRow}>
                    <View style={styles.ringtoneInfo}>
                      <IconSymbol size={18} name="music.note" color={palette.icon} />
                      <ThemedText style={styles.ringtoneLabel}>
                        {prayer.ringtone_uri ? 'Custom ringtone selected' : 'Using default chime'}
                      </ThemedText>
                    </View>
                    <View style={styles.ringtoneButtons}>
                      <TouchableOpacity style={styles.ringtoneButton} onPress={() => handlePickRingtone(prayer.id)}>
                        <IconSymbol size={16} name="folder.fill" color={palette.accent} />
                        <ThemedText style={styles.ringtoneButtonText}>Pick</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.ringtoneButton} onPress={() => testRingtone(prayer.ringtone_uri)}>
                        <IconSymbol size={16} name="play.fill" color={palette.success} />
                        <ThemedText style={styles.ringtoneButtonText}>Test</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ThemedView>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </ParallaxScrollView>
  );
}

const createStyles = (palette: ThemeColorSet) =>
  StyleSheet.create({
    headerGradient: {
      flex: 1,
      padding: 32,
      justifyContent: 'flex-end',
    },
    headerCopy: {
      gap: 8,
      maxWidth: 260,
    },
    headerEyebrow: {
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: palette.muted,
    },
    headerTitle: {
      fontSize: 32,
    },
    headerSubtitle: {
      color: palette.muted,
      lineHeight: 20,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    infoText: {
      flex: 1,
      color: palette.text,
      lineHeight: 20,
    },
    loadingCard: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 32,
    },
    loadingText: {
      color: palette.muted,
    },
    prayersList: {
      marginBottom: 24,
    },
    prayerCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      backgroundColor: palette.card,
      marginBottom: 16,
    },
    prayerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    prayerNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    prayerName: {
      fontSize: 20,
    },
    toggleButton: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    toggleButtonEnabled: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    toggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.text,
    },
    toggleTextEnabled: {
      color: '#fff',
    },
    timeContainer: {
      gap: 8,
      marginBottom: 14,
    },
    timeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      backgroundColor: palette.surface,
    },
    timeInput: {
      flex: 1,
      fontSize: 18,
      paddingVertical: 12,
      color: palette.text,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    timeDisplay: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    ringtoneRow: {
      borderTopWidth: 1,
      borderColor: palette.border,
      paddingTop: 14,
      gap: 12,
    },
    ringtoneInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ringtoneLabel: {
      color: palette.muted,
    },
    ringtoneButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    ringtoneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    ringtoneButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });

