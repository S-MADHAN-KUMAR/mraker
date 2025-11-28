import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

interface WorkEntry {
  id: string;
  project_name: string;
  task: string;
  screenshots: string[];
  audio_transcription: string | null;
  audio_uri: string | null;
  date: string;
  month: number;
  year: number;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function WorkTrackerScreen() {
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [projectName, setProjectName] = useState('');
  const [task, setTask] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: audioStatus } = await Audio.requestPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera and media library permissions');
    }
    if (audioStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please grant audio recording permissions');
    }
  };

  const fetchWorkEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_tracker')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth + 1)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkEntries(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch work entries');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    requestPermissions();
    fetchWorkEntries();
  }, [fetchWorkEntries]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newScreenshots = result.assets.map((asset) => asset.uri);
        setScreenshots([...screenshots, ...newScreenshots]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshots([...screenshots, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri || null);
      setRecording(null);
      setRecordingTime(0);

      // For now, we'll store the audio URI
      // In production, you'd upload this to Supabase Storage and get the URL
      // For transcription, you'd integrate with a service like Google Cloud Speech-to-Text
      Alert.alert('Recording Complete', 'Audio recorded. You can add transcription manually or it will be processed.');
    } catch {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const uploadAudioToSupabase = async (localUri: string): Promise<string | null> => {
    try {
      return localUri;
    } catch (err) {
      console.error('Error uploading audio:', err);
      return null;
    }
  };

  const handleAddWork = async () => {
    if (!projectName || !task) {
      Alert.alert('Error', 'Please fill in project name and task');
      return;
    }

    try {
      setAdding(true);
      const today = new Date();
      const date = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()
        ? today.toISOString().split('T')[0]
        : new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];

      // Upload screenshots to Supabase Storage if needed
      // For now, we'll store the local URIs
      const screenshotUris = screenshots;

      // Upload audio if exists
      let finalAudioUri = audioUri;
      if (audioUri) {
        finalAudioUri = await uploadAudioToSupabase(audioUri);
      }

      const { error } = await supabase
        .from('work_tracker')
        .insert({
          project_name: projectName,
          task: task + (transcription ? `\n\n[Audio Transcription]: ${transcription}` : ''),
          screenshots: screenshotUris,
          audio_uri: finalAudioUri,
          audio_transcription: transcription || null,
          date,
          month: selectedMonth + 1,
          year: selectedYear,
        });

      if (error) throw error;

      Alert.alert('Success', 'Work entry added successfully!');
      setProjectName('');
      setTask('');
      setScreenshots([]);
      setAudioUri(null);
      setTranscription('');
      fetchWorkEntries();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add work entry');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    Alert.alert(
      'Delete Work Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('work_tracker')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchWorkEntries();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete work entry');
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredEntries = workEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
  });

  const screenshotCount = workEntries.reduce((sum, entry) => sum + (entry.screenshots?.length ?? 0), 0);
  const audioCount = workEntries.filter((entry) => entry.audio_uri).length;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <LinearGradient colors={Gradients.oceanic} style={styles.headerGradient}>
          <IconSymbol size={180} color="rgba(255,255,255,0.08)" name="briefcase.fill" />
          <View style={styles.headerCopy}>
            <ThemedText style={styles.headerEyebrow}>Productivity vault</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>
              Capture, reflect, improve
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Logs, audio, and visual proof from every shift in one calm layout.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(600)} style={{ marginBottom: 4 }}>
        <LinearGradient colors={[palette.card, palette.cardElevated]} style={styles.titleContainer}>
          <View>
            <ThemedText style={styles.heroEyebrow}>This month</ThemedText>
            <ThemedText type="title" style={styles.heroTitle}>
              {MONTHS[selectedMonth]} {selectedYear}
            </ThemedText>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>Entries</ThemedText>
              <ThemedText style={styles.heroStatValue}>{filteredEntries.length}</ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>Shots</ThemedText>
              <ThemedText style={styles.heroStatValue}>{screenshotCount}</ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText style={styles.heroStatLabel}>Voice</ThemedText>
              <ThemedText style={styles.heroStatValue}>{audioCount}</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(600)} style={{ marginBottom: 4 }}>
        <ThemedView style={styles.selectorContainer}>
          <ThemedView style={styles.selectorRow}>
            <ThemedText style={styles.selectorLabel}>Month</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthButton, selectedMonth === index && styles.monthButtonSelected]}
                  onPress={() => setSelectedMonth(index)}>
                  <ThemedText
                    style={[
                      styles.monthButtonText,
                      selectedMonth === index && styles.monthButtonTextSelected,
                    ]}>
                    {month.substring(0, 3)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
          <ThemedView style={styles.selectorRow}>
            <ThemedText style={styles.selectorLabel}>Year</ThemedText>
            <TextInput
              style={styles.yearInput}
              value={selectedYear.toString()}
              onChangeText={(text) => setSelectedYear(parseInt(text) || new Date().getFullYear())}
              keyboardType="numeric"
              placeholder="2024"
              placeholderTextColor={palette.muted}
            />
          </ThemedView>
        </ThemedView>
      </Animated.View>

      {/* Add Work Form */}
      <Animated.View entering={FadeInDown.delay(120).duration(600)} style={{ marginBottom: 4 }}>
        <ThemedView style={styles.formContainer}>
        <ThemedView style={styles.formTitle}>
          <IconSymbol size={20} name="plus.circle.fill" color="#0a7ea4" />
          <ThemedText type="subtitle">Add Daily Work</ThemedText>
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Project Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Enter project name"
            placeholderTextColor="#999"
          />
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Task *</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={task}
            onChangeText={setTask}
            placeholder="Describe the task..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </ThemedView>

        {/* Audio Recording */}
        <ThemedView style={styles.inputGroup}>
          <ThemedView style={styles.audioHeader}>
            <ThemedText style={styles.label}>Audio Recording</ThemedText>
            {isRecording && (
              <ThemedText style={styles.recordingTime}>{formatTime(recordingTime)}</ThemedText>
            )}
          </ThemedView>
          <ThemedView style={styles.audioButtons}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={startRecording}
              >
                <IconSymbol size={20} name="mic.fill" color="#fff" />
                <ThemedText style={styles.recordButtonText}>Start Recording</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <IconSymbol size={20} name="stop.fill" color="#fff" />
                <ThemedText style={styles.recordButtonText}>Stop Recording</ThemedText>
              </TouchableOpacity>
            )}
            {audioUri && !isRecording && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={async () => {
                  try {
                    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
                    await sound.playAsync();
                  } catch {
                    Alert.alert('Error', 'Could not play audio');
                  }
                }}
              >
                <IconSymbol size={18} name="play.fill" color="#4CAF50" />
              </TouchableOpacity>
            )}
          </ThemedView>
          {audioUri && (
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Transcription (Optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={transcription}
                onChangeText={setTranscription}
                placeholder="Add transcription or notes from recording..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </ThemedView>
          )}
        </ThemedView>

        {/* Screenshots */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Screenshots</ThemedText>
          <ThemedView style={styles.screenshotButtons}>
            <TouchableOpacity
              style={styles.screenshotButton}
              onPress={handleTakePhoto}
            >
              <IconSymbol size={20} name="camera.fill" color="#0a7ea4" />
              <ThemedText style={styles.screenshotButtonText}>Take Photo</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.screenshotButton}
              onPress={handlePickImage}
            >
              <IconSymbol size={20} name="photo.fill" color="#0a7ea4" />
              <ThemedText style={styles.screenshotButtonText}>Pick Image</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          {screenshots.length > 0 && (
            <ScrollView horizontal style={styles.screenshotsList}>
              {screenshots.map((uri, index) => (
                <View key={index} style={styles.screenshotContainer}>
                  <Image source={{ uri }} style={styles.screenshot} />
                  <TouchableOpacity
                    style={styles.removeScreenshot}
                    onPress={() => setScreenshots(screenshots.filter((_, i) => i !== index))}
                  >
                    <IconSymbol size={16} name="xmark.circle.fill" color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ThemedView>

          <TouchableOpacity
            style={[styles.addButton, adding && styles.addButtonDisabled]}
            onPress={handleAddWork}
            disabled={adding}>
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />
                <ThemedText style={styles.addButtonText}>Add Work Entry</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>

      {/* Work Entries List */}
      <Animated.View entering={FadeInUp.delay(160).duration(600)} style={{ marginBottom: 4 }}>
        <ThemedView style={styles.listContainer}>
        <ThemedView style={styles.listTitle}>
          <IconSymbol size={20} name="list.bullet" color="#0a7ea4" />
          <ThemedText type="subtitle">
            {MONTHS[selectedMonth]} {selectedYear} ({filteredEntries.length} entries)
          </ThemedText>
        </ThemedView>

        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText}>Loading work entries...</ThemedText>
          </ThemedView>
        ) : filteredEntries.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol size={48} name="tray" color="#999" />
            <ThemedText style={styles.emptyText}>No work entries for this month</ThemedText>
            <ThemedText style={styles.emptySubtext}>Add your first work entry above</ThemedText>
          </ThemedView>
        ) : (
          <ScrollView style={styles.entriesList}>
            {filteredEntries.map((entry) => (
              <ThemedView key={entry.id} style={styles.entryCard}>
                <ThemedView style={styles.entryHeader}>
                  <ThemedView style={styles.entryHeaderLeft}>
                    <IconSymbol size={24} name="folder.fill" color="#2196F3" />
                    <ThemedView>
                      <ThemedText type="defaultSemiBold" style={styles.projectName}>
                        {entry.project_name}
                      </ThemedText>
                      <ThemedText style={styles.entryDate}>
                        {new Date(entry.date).toLocaleDateString()}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <TouchableOpacity
                    onPress={() => handleDeleteWork(entry.id)}
                    style={styles.deleteButton}
                  >
                    <IconSymbol size={20} name="trash.fill" color="#ff4444" />
                  </TouchableOpacity>
                </ThemedView>

                <ThemedView style={styles.taskContainer}>
                  <ThemedText style={styles.taskText}>{entry.task}</ThemedText>
                </ThemedView>

                {entry.screenshots && entry.screenshots.length > 0 && (
                  <ScrollView horizontal style={styles.entryScreenshots}>
                    {entry.screenshots.map((uri, index) => (
                      <Image key={index} source={{ uri }} style={styles.entryScreenshot} />
                    ))}
                  </ScrollView>
                )}

                {entry.audio_uri && (
                  <ThemedView style={styles.audioIndicator}>
                    <IconSymbol size={16} name="waveform" color="#4CAF50" />
                    <ThemedText style={styles.audioIndicatorText}>Audio recording available</ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            ))}
          </ScrollView>
        )}
        </ThemedView>
      </Animated.View>
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
      maxWidth: 280,
    },
    headerEyebrow: {
      fontSize: 12,
      letterSpacing: 2,
      color: palette.muted,
      textTransform: 'uppercase',
    },
    headerTitle: {
      fontSize: 32,
    },
    headerSubtitle: {
      color: palette.muted,
      lineHeight: 20,
    },
    titleContainer: {
      borderRadius: 28,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 20,
      backgroundColor: palette.card,
    },
    heroEyebrow: {
      fontSize: 12,
      letterSpacing: 2,
      color: palette.muted,
      textTransform: 'uppercase',
    },
    heroTitle: {
      fontSize: 28,
      marginTop: 6,
    },
    heroStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    heroStat: {
      flex: 1,
      gap: 4,
    },
    heroStatLabel: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
    },
    heroStatValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    selectorContainer: {
      marginBottom: 24,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      gap: 12,
    },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectorLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.muted,
      minWidth: 60,
    },
    monthScroll: {
      flex: 1,
    },
    monthButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: palette.surface,
      marginRight: 8,
      borderWidth: 1,
      borderColor: palette.border,
    },
    monthButtonSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    monthButtonText: {
      fontSize: 14,
      color: palette.text,
    },
    monthButtonTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    yearInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      padding: 12,
      fontSize: 16,
      backgroundColor: palette.surface,
      color: palette.text,
    },
    formContainer: {
      marginBottom: 24,
      padding: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    formTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: palette.muted,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      padding: 12,
      fontSize: 16,
      backgroundColor: palette.surface,
      color: palette.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    audioHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    recordingTime: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.danger,
    },
    audioButtons: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    recordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.success,
      padding: 12,
      borderRadius: 16,
    },
    stopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.danger,
      padding: 12,
      borderRadius: 16,
    },
    recordButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    playButton: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.success,
    },
    screenshotButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    screenshotButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    screenshotButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
    },
    screenshotsList: {
      marginTop: 8,
    },
    screenshotContainer: {
      marginRight: 12,
      position: 'relative',
    },
    screenshot: {
      width: 100,
      height: 100,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    removeScreenshot: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: palette.card,
      borderRadius: 12,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.accent,
      padding: 16,
      borderRadius: 16,
      gap: 8,
      marginTop: 8,
    },
    addButtonDisabled: {
      opacity: 0.6,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    listContainer: {
      marginBottom: 24,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      backgroundColor: palette.card,
    },
    listTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    loadingText: {
      color: palette.muted,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.muted,
    },
    emptySubtext: {
      fontSize: 14,
      color: palette.muted,
    },
    entriesList: {
      maxHeight: 500,
    },
    entryCard: {
      backgroundColor: palette.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: palette.border,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    entryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    projectName: {
      fontSize: 18,
      color: palette.info,
    },
    entryDate: {
      fontSize: 12,
      color: palette.muted,
      marginTop: 4,
    },
    deleteButton: {
      padding: 4,
    },
    taskContainer: {
      marginBottom: 12,
    },
    taskText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.text,
    },
    entryScreenshots: {
      marginTop: 12,
    },
    entryScreenshot: {
      width: 120,
      height: 120,
      borderRadius: 8,
      marginRight: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    audioIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      padding: 8,
      backgroundColor: palette.surface,
      borderRadius: 6,
    },
    audioIndicatorText: {
      fontSize: 12,
      color: palette.success,
    },
  });

