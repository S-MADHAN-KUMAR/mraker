import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, View, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, type ThemeColorSet } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { useModal } from '@/components/ui/modal';

interface WorkEntry {
  id: string;
  project_name: string;
  task: string;
  screenshots: string[];
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
  const [editing, setEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [projectName, setProjectName] = useState('');
  const [task, setTask] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const { showModal } = useModal();
  const insets = useSafeAreaInsets();
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette, insets.top, insets.bottom), [palette, insets.top, insets.bottom]);

  useEffect(() => {
    requestPermissions();
    fetchWorkEntries();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        showModal({
          title: 'Permission Required',
          message: 'Please grant camera and media library permissions',
          type: 'warning',
        });
      }
    } catch (error) {
      console.error('Permission request error:', error);
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
      showModal({
        title: 'Error',
        message: error.message || 'Failed to fetch work entries',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
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
      showModal({
        title: 'Error',
        message: 'Failed to pick image',
        type: 'error',
      });
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
      showModal({
        title: 'Error',
        message: 'Failed to take photo',
        type: 'error',
      });
    }
  };

  const handleAddWork = async () => {
    if (!projectName || !task) {
      showModal({
        title: 'Error',
        message: 'Please fill in project name and task',
        type: 'error',
      });
      return;
    }

    try {
      setAdding(true);
      const today = new Date();
      const date = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()
        ? today.toISOString().split('T')[0]
        : new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];

      const { error } = await supabase
        .from('work_tracker')
        .insert({
          project_name: projectName,
          task: task,
          screenshots: screenshots,
          date,
          month: selectedMonth + 1,
          year: selectedYear,
        });

      if (error) throw error;

      showModal({
        title: 'Success',
        message: 'Work entry added successfully!',
        type: 'success',
      });
      setProjectName('');
      setTask('');
      setScreenshots([]);
      fetchWorkEntries();
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to add work entry',
        type: 'error',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleEditWork = (entry: WorkEntry) => {
    setEditingEntry(entry);
    setProjectName(entry.project_name);
    setTask(entry.task);
    setScreenshots(entry.screenshots || []);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditingEntry(null);
    setProjectName('');
    setTask('');
    setScreenshots([]);
  };

  const handleUpdateWork = async () => {
    if (!projectName || !task) {
      showModal({
        title: 'Error',
        message: 'Please fill in project name and task',
        type: 'error',
      });
      return;
    }

    if (!editingEntry) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('work_tracker')
        .update({
          project_name: projectName,
          task: task,
          screenshots: screenshots,
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      showModal({
        title: 'Success',
        message: 'Work entry updated successfully!',
        type: 'success',
      });
      handleCancelEdit();
      fetchWorkEntries();
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to update work entry',
        type: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    showModal({
      title: 'Delete Work Entry',
      message: 'Are you sure you want to delete this entry?',
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('work_tracker')
            .delete()
            .eq('id', id);

          if (error) throw error;
          fetchWorkEntries();
        } catch (error: any) {
          showModal({
            title: 'Error',
            message: error.message || 'Failed to delete work entry',
            type: 'error',
          });
        }
      },
    });
  };

  const filteredEntries = workEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
  });

  const screenshotCount = workEntries.reduce((sum, entry) => sum + (entry.screenshots?.length ?? 0), 0);

  // Check if there's already an entry for today
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0];
  
  const todayEntry = workEntries.find(entry => entry.date === todayDateString);
  const hasTodayEntry = !!todayEntry;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      
      {/* Stats Card */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#1e40af15' }]}>
              <IconSymbol size={20} name="briefcase.fill" color="#1e40af" />
            </View>
            <View>
              <ThemedText style={styles.statsLabel}>This Month</ThemedText>
              <ThemedText style={styles.statsTitle}>
                {MONTHS[selectedMonth]} {selectedYear}
              </ThemedText>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{filteredEntries.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Entries</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{screenshotCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Screenshots</ThemedText>
            </View>
          </View>
        </ThemedView>
      </Animated.View>

      {/* Add/Edit Work Form */}
      {(!hasTodayEntry || editing) && (
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.cardContainer}>
          <ThemedView style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: editing ? '#1e40af15' : '#05966915' }]}>
                <IconSymbol size={20} name={editing ? 'pencil.circle.fill' : 'plus.circle.fill'} color={editing ? '#1e40af' : '#059669'} />
              </View>
              <View>
                <ThemedText style={styles.formTitle}>{editing ? 'Edit Work Entry' : 'Add Work Entry'}</ThemedText>
                <ThemedText style={styles.formSubtitle}>{editing ? 'Update your work progress' : 'Record your daily work progress'}</ThemedText>
              </View>
            </View>
            {editing && (
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEdit}>
                <IconSymbol size={18} name="xmark.circle.fill" color={palette.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Project Name *</ThemedText>
            <TextInput
              style={styles.input}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor={palette.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Task Description *</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={task}
              onChangeText={setTask}
              placeholder="Describe the task you worked on..."
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Screenshots */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Screenshots</ThemedText>
            <View style={styles.screenshotButtons}>
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={handleTakePhoto}>
                <IconSymbol size={18} name="camera.fill" color="#1e40af" />
                <ThemedText style={styles.screenshotButtonText}>Take Photo</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={handlePickImage}>
                <IconSymbol size={18} name="photo.fill" color="#1e40af" />
                <ThemedText style={styles.screenshotButtonText}>Pick Image</ThemedText>
              </TouchableOpacity>
            </View>
            {screenshots.length > 0 && (
              <ScrollView horizontal style={styles.screenshotsList} showsHorizontalScrollIndicator={false}>
                {screenshots.map((uri, index) => (
                  <View key={index} style={styles.screenshotItem}>
                    <Image source={{ uri }} style={styles.screenshot} />
                    <TouchableOpacity
                      style={styles.removeScreenshot}
                      onPress={() => setScreenshots(screenshots.filter((_, i) => i !== index))}>
                      <IconSymbol size={16} name="xmark.circle.fill" color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.formActions}>
            {editing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                disabled={updating}>
                <IconSymbol size={18} name="xmark.circle.fill" color={palette.text} />
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitButton, (adding || updating) && styles.submitButtonDisabled]}
              onPress={editing ? handleUpdateWork : handleAddWork}
              disabled={adding || updating}>
              <LinearGradient
                colors={['#1e40af', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}>
                {(adding || updating) ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <IconSymbol size={18} name="checkmark.circle.fill" color="#fff" />
                    <ThemedText style={styles.submitButtonText}>
                      {editing ? 'Update Work Entry' : 'Add Work Entry'}
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Animated.View>
      )}

      {/* Work Entries List */}
      <Animated.View entering={FadeInUp.delay(160).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.listCard}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#1e40af15' }]}>
                <IconSymbol size={20} name="list.bullet" color="#1e40af" />
              </View>
              <View>
                <ThemedText style={styles.listTitle}>
                  {MONTHS[selectedMonth]} {selectedYear}
                </ThemedText>
                <ThemedText style={styles.listSubtitle}>
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                </ThemedText>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.accent} />
              <ThemedText style={styles.loadingText}>Loading entries...</ThemedText>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol size={48} name="tray" color={palette.muted} />
              <ThemedText style={styles.emptyText}>No entries yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Add your first work entry above</ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
              {filteredEntries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryHeaderLeft}>
                      <View style={[styles.entryIconContainer, { backgroundColor: '#1e40af15' }]}>
                        <IconSymbol size={18} name="folder.fill" color="#1e40af" />
                      </View>
                      <View style={styles.entryInfo}>
                        <ThemedText style={styles.entryProjectName}>{entry.project_name}</ThemedText>
                        <ThemedText style={styles.entryDate}>
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.entryActions}>
                      {entry.date === todayDateString && (
                        <TouchableOpacity
                          onPress={() => handleEditWork(entry)}
                          style={styles.editButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <IconSymbol size={18} name="pencil.circle.fill" color={palette.accent} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDeleteWork(entry.id)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <IconSymbol size={18} name="trash.fill" color={palette.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.entryTaskContainer}>
                    <ThemedText style={styles.entryTaskText}>{entry.task}</ThemedText>
                  </View>

                  {entry.screenshots && entry.screenshots.length > 0 && (
                    <ScrollView horizontal style={styles.entryScreenshots} showsHorizontalScrollIndicator={false}>
                      {entry.screenshots.map((uri, index) => (
                        <View key={index} style={styles.entryScreenshotContainer}>
                          <Image source={{ uri }} style={styles.entryScreenshot} />
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </ThemedView>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColorSet, topInset: number, bottomInset: number) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scrollContent: {
      padding: 16,
      paddingTop: Math.max(topInset + 20, 20),
      paddingBottom: Math.max(bottomInset + 120, 120), // Extra padding for bottom navigation bar
    },
    cardContainer: {
      marginBottom: 16,
    },
    statsCard: {
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
    statsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsLabel: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    statsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    statItem: {
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: palette.text,
      fontFamily: FontFamily.bold,
    },
    statLabel: {
      fontSize: 12,
      color: palette.muted,
      fontFamily: FontFamily.medium,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: palette.border,
    },
    selectorCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 20,
      gap: 16,
    },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectorLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.muted,
      minWidth: 50,
      fontFamily: FontFamily.semiBold,
    },
    monthScroll: {
      flex: 1,
    },
    monthChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: palette.surface,
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: palette.border,
    },
    monthChipActive: {
      backgroundColor: '#1e40af',
      borderColor: '#1e40af',
    },
    monthChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    monthChipTextActive: {
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
    yearInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: palette.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      backgroundColor: palette.surface,
      color: palette.text,
      fontFamily: FontFamily.medium,
    },
    formCard: {
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
    formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    formHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    cancelEditButton: {
      padding: 4,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    formSubtitle: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      fontFamily: FontFamily.semiBold,
    },
    input: {
      borderWidth: 1.5,
      borderColor: palette.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      backgroundColor: palette.surface,
      color: palette.text,
      fontFamily: FontFamily.regular,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
      fontFamily: FontFamily.regular,
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
      padding: 14,
      borderRadius: 12,
      backgroundColor: palette.surface,
      borderWidth: 1.5,
      borderColor: palette.border,
    },
    screenshotButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    screenshotsList: {
      marginTop: 8,
    },
    screenshotItem: {
      marginRight: 12,
      position: 'relative',
      width: 100,
      height: 100,
    },
    screenshot: {
      width: 100,
      height: 100,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
    },
    removeScreenshot: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: palette.danger,
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: palette.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    formActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    submitButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
      fontFamily: FontFamily.semiBold,
    },
    listCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 20,
    },
    listHeader: {
      marginBottom: 16,
    },
    listHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    listTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    listSubtitle: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    loadingText: {
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.muted,
      fontFamily: FontFamily.semiBold,
    },
    emptySubtext: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    entriesList: {
      maxHeight: 500,
      marginBottom: 8,
    },
    entryCard: {
      backgroundColor: palette.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
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
    entryIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryInfo: {
      flex: 1,
    },
    entryProjectName: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    entryDate: {
      fontSize: 12,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    entryActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      padding: 8,
    },
    deleteButton: {
      padding: 8,
    },
    entryTaskContainer: {
      marginBottom: 12,
    },
    entryTaskText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.text,
      fontFamily: FontFamily.regular,
    },
    entryScreenshots: {
      marginTop: 12,
    },
    entryScreenshotContainer: {
      marginRight: 12,
      position: 'relative',
    },
    entryScreenshot: {
      width: 120,
      height: 120,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
    },
  });
