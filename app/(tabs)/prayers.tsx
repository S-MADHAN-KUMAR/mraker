import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
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
  }),
});

export default function PrayersScreen() {
  const dispatch = useAppDispatch();
  const { prayers, loading, updating, globalRingtone } = useAppSelector((state) => state.prayers);
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [pickingTime, setPickingTime] = useState<string | null>(null);
  const [changingTimeId, setChangingTimeId] = useState<string | null>(null);

  const scheduleNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    await Notifications.cancelAllScheduledNotificationsAsync();

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
          sound: globalRingtone ? true : true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });
    });
  }, [prayers, globalRingtone]);

  useEffect(() => {
    requestPermissions();
    fetchPrayers();
    fetchGlobalRingtone();
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

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
      setChangingTimeId(id);
      
      const { error } = await supabase
        .from('prayer_reminders')
        .update({ time: newTime })
        .eq('id', id);

      if (error) throw error;

      // Update Redux state directly without refetching
      dispatch(updatePrayer({ id, time: newTime }));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update prayer time');
      // Refetch on error
      fetchPrayers();
    } finally {
      dispatch(setUpdating(null));
      setShowTimePicker(null);
      setPickingTime(null);
      setChangingTimeId(null);
    }
  };

  const handleTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }

    if (event.type === 'set' && selectedDate && pickingTime) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      handleTimeChange(pickingTime, timeString);
    } else {
      setShowTimePicker(null);
      setPickingTime(null);
    }
  };

  const openTimePicker = (id: string, currentTime: string) => {
    setPickingTime(id);
    setShowTimePicker(id);
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

  // Get the prayer that is currently changing time
  const changingPrayer = changingTimeId ? prayers.find(p => p.id === changingTimeId) : null;

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
          <View style={styles.timeDisplayContainer}>
            <ThemedText style={styles.timeLabel}>Current Time</ThemedText>
            <ThemedText style={styles.currentTime}>{formatCurrentTime()}</ThemedText>
            {changingPrayer && (
              <View style={styles.changingTimeContainer}>
                <ThemedText style={styles.changingTimeLabel}>
                  Changing: {changingPrayer.prayer_name}
                </ThemedText>
                <ThemedText style={styles.changingTimeValue}>
                  {formatTime(changingPrayer.time)}
                </ThemedText>
              </View>
            )}
          </View>
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

                  <View style={styles.timePickerContainer}>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(prayer.id, prayer.time)}
                      disabled={updating === prayer.id}>
                      <IconSymbol size={18} name="clock" color={palette.text} />
                      <ThemedText style={styles.timePickerText}>Change Time</ThemedText>
                      <IconSymbol size={16} name="chevron.right" color={palette.muted} />
                    </TouchableOpacity>
                  </View>

                  {showTimePicker === prayer.id && Platform.OS === 'ios' && (
                    <View style={styles.timePickerWrapper}>
                      <DateTimePicker
                        value={getTimeForPicker(prayer.time)}
                        mode="time"
                        is24Hour={false}
                        display="spinner"
                        onChange={handleTimePickerChange}
                        style={styles.timePicker}
                      />
                    </View>
                  )}
                  {showTimePicker === prayer.id && Platform.OS === 'android' && (
                    <DateTimePicker
                      value={getTimeForPicker(prayer.time)}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={handleTimePickerChange}
                    />
                  )}
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
    headerContainer: {
      width: '100%',
      height: '100%',
      padding: 24,
      paddingBottom: 32,
      justifyContent: 'flex-end',
      alignItems: 'center',
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
    },
    timeLabel: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: palette.muted,
      fontFamily: FontFamily.semiBold,
    },
    currentTime: {
      fontSize: 32,
      fontWeight: '700',
      color: palette.text,
      fontFamily: FontFamily.bold,
      letterSpacing: 1,
    },
    changingTimeContainer: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      gap: 4,
    },
    changingTimeLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    changingTimeValue: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.accent,
      fontFamily: FontFamily.semiBold,
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
    timePickerWrapper: {
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: palette.surface,
    },
    timePicker: {
      height: 200,
    },
  });
