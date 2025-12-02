import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, View, Text, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, type ThemeColorSet } from '@/constants/theme';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  setPrayers, 
  setLoading, 
  setUpdating, 
  setGlobalRingtone, 
  updatePrayer, 
  togglePrayerEnabled 
} from '@/store/prayerSlice';
import { toggleTheme } from '@/store/themeSlice';

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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set notification categories with actions
Notifications.setNotificationCategoryAsync('prayer_alarm', [
  {
    identifier: 'STOP_ALARM',
    buttonTitle: 'Stop Alarm',
    options: {
      opensAppToForeground: false,
    },
  },
], {
  intentIdentifiers: [],
  categorySummaryFormat: '%u more notifications',
});

export default function PrayersScreen() {
  const dispatch = useAppDispatch();
  const { prayers, loading, updating, globalRingtone } = useAppSelector((state) => state.prayers);
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [timeInput, setTimeInput] = useState('');
  const [isPM, setIsPM] = useState(false);
  const [showManualTimePicker, setShowManualTimePicker] = useState(false);
  const [manualTime, setManualTime] = useState(new Date());
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);

  const playAlarmSound = useCallback(async (ringtoneUri: string | null) => {
    try {
      // Stop any currently playing sound
      if (playingSound) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
      }

      if (ringtoneUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: ringtoneUri },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        setPlayingSound(newSound);
      }
      // If no ringtone, notification sound will play automatically
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, [playingSound]);

  const stopAlarm = useCallback(async () => {
    if (playingSound) {
      await playingSound.stopAsync();
      await playingSound.unloadAsync();
      setPlayingSound(null);
    }
    setActiveAlarmId(null);
  }, [playingSound]);

  const scheduleNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    await Notifications.cancelAllScheduledNotificationsAsync();

    prayers.forEach(async (prayer) => {
      if (!prayer.enabled) return;

      const [hours, minutes] = prayer.time.split(':').map(Number);
      const trigger: Notifications.DailyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Prayer Time: ${prayer.prayer_name}`,
          body: `It's time for ${prayer.prayer_name} prayer. Tap to stop alarm.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            prayerId: prayer.id,
            prayerName: prayer.prayer_name,
            ringtoneUri: prayer.ringtone_uri || globalRingtone,
            categoryId: 'prayer_alarm',
          },
        },
        trigger,
      });
    });
  }, [prayers, globalRingtone]);

  useEffect(() => {
    requestPermissions();
    fetchPrayers();
    fetchGlobalRingtone();
    
    // Set up notification response listener
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { actionIdentifier, notification } = response;
        const categoryId = notification.request.content.data?.categoryId;
        
        if ((actionIdentifier === 'STOP_ALARM' || actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) && categoryId === 'prayer_alarm') {
          const prayerId = notification.request.content.data?.prayerId as string;
          if (prayerId) {
            await stopAlarm();
            // Dismiss the notification
            try {
              await Notifications.dismissNotificationAsync(notification.request.identifier);
            } catch (error) {
              // Ignore dismiss errors
            }
          }
        }
      }
    );

    // Set up notification received listener (when app is in foreground)
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const categoryId = notification.request.content.data?.categoryId;
        if (categoryId === 'prayer_alarm') {
          const prayerId = notification.request.content.data?.prayerId as string;
          const ringtoneUri = notification.request.content.data?.ringtoneUri as string | null;
          
          if (prayerId) {
            setActiveAlarmId(prayerId);
            // Start playing alarm sound
            if (ringtoneUri) {
              await playAlarmSound(ringtoneUri);
            } else if (globalRingtone) {
              await playAlarmSound(globalRingtone);
            }
          }
        }
      }
    );
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      notificationResponseSubscription.remove();
      notificationReceivedSubscription.remove();
      if (playingSound) {
        playingSound.unloadAsync();
      }
    };
  }, [playAlarmSound, stopAlarm, globalRingtone]);

  useEffect(() => {
    if (prayers.length > 0) {
      scheduleNotifications();
    }
  }, [scheduleNotifications, prayers.length]);


  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (playingSound) {
        playingSound.unloadAsync();
      }
    };
  }, [sound, playingSound]);

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
      dispatch(setLoading(true));
      const { data, error } = await supabase
        .from('prayer_reminders')
        .select('*')
        .order('time', { ascending: true });

      if (error) throw error;

      dispatch(setPrayers(data || []));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch prayer reminders');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchGlobalRingtone = async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_reminders')
        .select('ringtone_uri')
        .limit(1)
        .single();

      if (!error && data?.ringtone_uri) {
        dispatch(setGlobalRingtone(data.ringtone_uri));
      }
    } catch (error) {
      // Ignore if no ringtone found
    }
  };

  const handleTimeChange = async (id: string, newTime: string) => {
    try {
      dispatch(setUpdating(id));
      
      // Update Redux state FIRST for immediate UI feedback
      dispatch(updatePrayer({ id, time: newTime }));
      
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ time: newTime })
        .eq('id', id);

      if (error) throw error;
      
      // Clear editing state
      setEditingTimeId(null);
      setTimeInput('');
      setIsPM(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer time');
      await fetchPrayers();
      setEditingTimeId(null);
      setTimeInput('');
      setIsPM(false);
    } finally {
      dispatch(setUpdating(null));
    }
  };

  const convertTo12Hour = (time24: string): { time: string; isPM: boolean } => {
    const [hours, minutes] = time24.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const isPM = hours >= 12;
    return { time: `${hour12}:${minutes.toString().padStart(2, '0')}`, isPM };
  };

  const convertTo24Hour = (time12: string, isPM: boolean): string => {
    const [hours, minutes] = time12.split(':').map(Number);
    let hour24 = hours;
    if (isPM && hours !== 12) {
      hour24 = hours + 12;
    } else if (!isPM && hours === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleEditTime = (id: string, currentTime: string) => {
    setEditingTimeId(id);
    const { time, isPM: pm } = convertTo12Hour(currentTime);
    setTimeInput(time);
    setIsPM(pm);
  };

  const handleSaveTime = (id: string) => {
    if (!timeInput) {
      Alert.alert('Error', 'Please enter a time');
      return;
    }

    // Validate time format (H:MM or HH:MM)
    const timeRegex = /^([1-9]|1[0-2]):([0-5][0-9])$/;
    if (!timeRegex.test(timeInput)) {
      Alert.alert('Invalid Format', 'Please enter time in H:MM or HH:MM format (e.g., 6:30, 12:45)');
      return;
    }

    const time24 = convertTo24Hour(timeInput, isPM);
    handleTimeChange(id, time24);
  };

  const handleCancelEdit = () => {
    setEditingTimeId(null);
    setTimeInput('');
    setIsPM(false);
  };

  const handleManualTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        setManualTime(selectedDate);
        setCurrentTime(selectedDate);
        setShowManualTimePicker(false);
      } else if (event.type === 'dismissed') {
        setShowManualTimePicker(false);
      }
    } else {
      // iOS
      if (selectedDate) {
        setManualTime(selectedDate);
      }
    }
  };

  const handleIOSManualTimeDone = () => {
    setCurrentTime(manualTime);
    setShowManualTimePicker(false);
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      dispatch(setUpdating(id));
      
      // Optimistically update Redux state first
      dispatch(togglePrayerEnabled(id));
      
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ enabled: !enabled })
        .eq('id', id);

      if (error) {
        // Revert on error
        dispatch(togglePrayerEnabled(id));
        throw error;
      }

      // Schedule notifications without refetching
      await scheduleNotifications();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer reminder');
      // Refetch on error
      fetchPrayers();
    } finally {
      dispatch(setUpdating(null));
    }
  };

  const handleSetGlobalRingtone = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      dispatch(setGlobalRingtone(uri));

      // Update all prayers with the global ringtone
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ ringtone_uri: uri });

      if (error) throw error;

      Alert.alert('Success', 'Global ringtone set for all prayers!');
      fetchPrayers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set global ringtone');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatCurrentTime = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
  };

  const getTimeForPicker = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };


  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.themeToggleButton}
              onPress={() => dispatch(toggleTheme())}>
              <IconSymbol 
                size={20} 
                name={colorScheme === 'dark' ? 'sun.max.fill' : 'moon.fill'} 
                color={palette.text} 
              />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.headerLoadingContainer}>
              <Image
                source={require('@/assets/yapapa.gif')}
                style={styles.headerLoaderGif}
                contentFit="contain"
              />
              <ThemedText style={styles.headerLoadingText}>Loading prayers...</ThemedText>
            </View>
          ) : (
            <View style={{}}>
              <ThemedText style={styles.timeLabel}>Current Time</ThemedText>
              <TouchableOpacity 
                onPress={() => {
                  setManualTime(currentTime);
                  setShowManualTimePicker(true);
                }}>
                <ThemedText style={styles.currentTime}>{formatCurrentTime()}</ThemedText>  
              </TouchableOpacity>
            </View>
          )}
        </View>
      }>
      
      {/* Global Ringtone Setting */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.globalRingtoneCard}>
          <View style={styles.globalRingtoneHeader}>
            <View style={styles.globalRingtoneHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#05966915' }]}>
                <IconSymbol size={20} name="music.note" color="#059669" />
              </View>
              <View>
                <ThemedText style={styles.globalRingtoneTitle}>Global Ringtone</ThemedText>
                <ThemedText style={styles.globalRingtoneSubtitle}>
                  Applies to all prayer times
                </ThemedText>
              </View>
            </View>
          </View>
          
          <View style={styles.globalRingtoneInfo}>
            <IconSymbol size={16} name="bell.fill" color={palette.muted} />
            <ThemedText style={styles.globalRingtoneStatus}>
              {globalRingtone ? 'Custom ringtone set' : 'Using default system sound'}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.globalRingtoneButton}
            onPress={handleSetGlobalRingtone}>
            <IconSymbol size={16} name="folder.fill" color="#1e40af" />
            <ThemedText style={styles.globalRingtoneButtonText}>Set Ringtone</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={palette.accent} size="large" />
          <ThemedText style={styles.loadingText}>Loading prayer reminders...</ThemedText>
        </View>
      ) : (
        <Animated.View entering={FadeInUp.delay(80).duration(500)} style={styles.cardContainer}>
          <ScrollView style={styles.prayersList} showsVerticalScrollIndicator={false}>
            {prayers.map((prayer, index) => (
              <Animated.View key={prayer.id} entering={FadeInUp.delay(index * 60).duration(400)}>
                <ThemedView style={styles.prayerCard}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.prayerNameContainer}>
                      <View style={[styles.prayerIconContainer, { backgroundColor: '#1e40af15' }]}>
                        <IconSymbol size={20} name="moon.fill" color="#1e40af" />
                      </View>
                      <View>
                        <ThemedText style={styles.prayerName}>{prayer.prayer_name}</ThemedText>
                        <ThemedText style={styles.prayerTimeDisplay}>{formatTime(prayer.time)}</ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        prayer.enabled && styles.toggleButtonEnabled,
                      ]}
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

                  {editingTimeId === prayer.id ? (
                    <View style={styles.timeEditContainer}>
                      <View style={styles.timeInputGroup}>
                        <ThemedText style={styles.timeInputLabel}>Time</ThemedText>
                        <View style={styles.timeInputRow}>
                          <TextInput
                            style={styles.timeInput}
                            value={timeInput}
                            onChangeText={setTimeInput}
                            placeholder="6:30"
                            placeholderTextColor={palette.muted}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            autoFocus
                          />
                          <View style={styles.amPmToggleContainer}>
                            <TouchableOpacity
                              style={[styles.amPmButton, !isPM && styles.amPmButtonActive]}
                              onPress={() => setIsPM(false)}>
                              <ThemedText style={[styles.amPmText, !isPM && styles.amPmTextActive]}>AM</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.amPmButton, isPM && styles.amPmButtonActive]}
                              onPress={() => setIsPM(true)}>
                              <ThemedText style={[styles.amPmText, isPM && styles.amPmTextActive]}>PM</ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <ThemedText style={styles.timeInputHint}>12-hour format (e.g., 6:30 AM, 6:45 PM)</ThemedText>
                      </View>
                      <View style={styles.timeEditButtons}>
                        <TouchableOpacity
                          style={styles.timeEditCancelButton}
                          onPress={handleCancelEdit}>
                          <IconSymbol size={16} name="xmark.circle.fill" color={palette.text} />
                          <ThemedText style={styles.timeEditCancelText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.timeEditSaveButton}
                          onPress={() => handleSaveTime(prayer.id)}
                          disabled={updating === prayer.id}>
                          {updating === prayer.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <IconSymbol size={16} name="checkmark.circle.fill" color="#fff" />
                              <ThemedText style={styles.timeEditSaveText}>Save</ThemedText>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.timePickerContainer}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => handleEditTime(prayer.id, prayer.time)}
                        disabled={updating === prayer.id}>
                        <IconSymbol size={18} name="clock" color={palette.text} />
                        <ThemedText style={styles.timePickerText}>Change Time</ThemedText>
                        <IconSymbol size={16} name="chevron.right" color={palette.muted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </ThemedView>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
      
      {/* Manual time picker for top time display */}
      {showManualTimePicker && Platform.OS === 'ios' && (
        <View style={styles.manualTimePickerOverlay}>
          <View style={styles.manualTimePickerContainer}>
            <View style={styles.manualTimePickerHeader}>
              <ThemedText style={styles.manualTimePickerTitle}>Set Current Time</ThemedText>
            </View>
            <DateTimePicker
              value={manualTime}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleManualTimePickerChange}
              style={styles.timePicker}
            />
            <View style={styles.manualTimePickerButtons}>
              <TouchableOpacity
                style={styles.manualTimePickerCancelButton}
                onPress={() => setShowManualTimePicker(false)}>
                <ThemedText style={styles.manualTimePickerCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualTimePickerDoneButton}
                onPress={handleIOSManualTimeDone}>
                <ThemedText style={styles.manualTimePickerDoneText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {showManualTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={manualTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleManualTimePickerChange}
        />
      )}
    </ParallaxScrollView>
  );
}

const createStyles = (palette: ThemeColorSet) =>
  StyleSheet.create({
    headerContainer: {
      width: '100%',
      height: '100%',
      padding: 24,
      paddingBottom: 40,
      justifyContent: 'flex-end',
      alignItems: 'center',
      minHeight: 200,
    },
    headerTopRow: {
      position: 'absolute',
      top: 24,
      right: 24,
      zIndex: 10,
    },
    themeToggleButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    timeDisplayContainer: {
      alignItems: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 8,
    },
    timeLabel: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: palette.muted,
      fontFamily: FontFamily.semiBold,
    },
    currentTime: {
      fontSize: 42,
      fontWeight: '700',
      color: palette.text,
      fontFamily: FontFamily.bold,
      letterSpacing: 0.5,
      textAlign: 'center',
      width: '100%',
    },
    stopAlarmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: '#ef4444',
    },
    stopAlarmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
    changingTimeContainer: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      gap: 4,
      width: '100%',
      maxWidth: 300,
    },
    changingTimeLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: palette.muted,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
    },
    changingTimeValue: {
      fontSize: 18,
      textAlign: 'center',
      fontWeight: '600',
      color: palette.accent,
      fontFamily: FontFamily.semiBold,
    },
    headerLoadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      width: '100%',
    },
    headerLoaderGif: {
      width: 100,
      height: 100,
    },
    headerLoadingText: {
      fontSize: 14,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    cardContainer: {
      marginBottom: 16,
    },
    globalRingtoneCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    globalRingtoneHeader: {
      marginBottom: 16,
    },
    globalRingtoneHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    globalRingtoneTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    globalRingtoneSubtitle: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    globalRingtoneInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.surface,
    },
    globalRingtoneStatus: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    globalRingtoneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    globalRingtoneButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    loadingCard: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    prayersList: {
      marginBottom: 24,
    },
    prayerCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 20,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    prayerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    prayerNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    prayerIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prayerName: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
      textAlign: 'left', // Will be overridden by ThemedText for Arabic
    },
    prayerTimeDisplay: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    toggleButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    toggleButtonEnabled: {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    toggleTextEnabled: {
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
    timePickerContainer: {
      marginTop: 8,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    timePickerText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    timeEditContainer: {
      gap: 16,
      marginTop: 12,
    },
    timeInputGroup: {
      gap: 8,
    },
    timeInputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: FontFamily.semiBold,
    },
    timeInputRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    timeInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: palette.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: palette.surface,
      color: palette.text,
      fontFamily: FontFamily.medium,
    },
    amPmToggleContainer: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      overflow: 'hidden',
    },
    amPmButton: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amPmButtonActive: {
      backgroundColor: '#1e40af',
    },
    amPmText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    amPmTextActive: {
      color: '#fff',
    },
    timeInputHint: {
      fontSize: 11,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    timeEditButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    timeEditCancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    timeEditCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    timeEditSaveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#1e40af',
    },
    timeEditSaveText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
    timePicker: {
      height: 200,
    },
    manualTimePickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    manualTimePickerContainer: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
    },
    manualTimePickerHeader: {
      marginBottom: 16,
      alignItems: 'center',
    },
    manualTimePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    manualTimePickerButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 16,
      gap: 12,
    },
    manualTimePickerCancelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: 'center',
    },
    manualTimePickerCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    manualTimePickerDoneButton: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#1e40af',
      alignItems: 'center',
    },
    manualTimePickerDoneText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
  });
