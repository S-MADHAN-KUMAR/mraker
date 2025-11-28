import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients, type ThemeColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SavingsEntry {
  id: string;
  month: string;
  year: number;
  amount: number;
  description: string | null;
  created_at: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function SavingsScreen() {
  const [savings, setSavings] = useState<SavingsEntry[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    fetchSavings();
  }, []);

  const fetchSavings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      setSavings(data || []);
      const total = (data || []).reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
      setTotalSavings(total);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch savings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSavings = async () => {
    if (!selectedMonth || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('savings')
        .upsert({
          month: selectedMonth,
          year: parseInt(selectedYear),
          amount: amountNum,
          description: description || null,
        }, {
          onConflict: 'month,year'
        });

      if (error) throw error;

      Alert.alert('Success', 'Savings added successfully!');
      setSelectedMonth('');
      setAmount('');
      setDescription('');
      fetchSavings();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add savings');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSavings = async (id: string) => {
    Alert.alert(
      'Delete Savings',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('savings')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchSavings();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete savings');
            }
          },
        },
      ]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <LinearGradient colors={Gradients.aurora} style={styles.headerGradient}>
          <IconSymbol size={160} color="rgba(255,255,255,0.08)" name="banknote.fill" />
          <View style={styles.headerCopy}>
            <ThemedText style={styles.headerEyebrow}>Savings cockpit</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>
              Automate your future
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Lock goals, log deposits, and see your runway at a glance.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(600)}>
        <LinearGradient colors={[palette.card, palette.cardElevated]} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <ThemedText style={styles.heroEyebrow}>Total saved</ThemedText>
              <ThemedText type="title" style={styles.heroAmount}>
                ₹{totalSavings.toFixed(2)}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.syncButton} onPress={fetchSavings}>
              <IconSymbol size={18} name="arrow.right.circle.fill" color={palette.text} />
              <ThemedText style={styles.syncText}>Sync</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.heroMetaRow}>
            <View>
              <ThemedText style={styles.metaLabel}>Entries</ThemedText>
              <ThemedText style={styles.metaValue}>{savings.length}</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.metaLabel}>Monthly avg</ThemedText>
              <ThemedText style={styles.metaValue}>
                ₹{savings.length ? (totalSavings / savings.length).toFixed(2) : '0.00'}
              </ThemedText>
            </View>
            <View>
              <ThemedText style={styles.metaLabel}>Goal</ThemedText>
              <ThemedText style={[styles.metaValue, { color: palette.accentSecondary }]}>₹1,200</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(600)}>
        <ThemedView style={styles.formContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Add a deposit
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>Log this month’s contribution.</ThemedText>
            </View>
            <IconSymbol size={24} name="plus.circle.fill" color={palette.accent} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScroller}>
            {MONTHS.map((month) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthChip, selectedMonth === month && styles.monthChipActive]}
                onPress={() => setSelectedMonth(month)}>
                <ThemedText
                  style={[
                    styles.monthChipText,
                    selectedMonth === month && styles.monthChipTextActive,
                  ]}>
                  {month.slice(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Year</ThemedText>
              <TextInput
                style={styles.inputControl}
                value={selectedYear}
                onChangeText={setSelectedYear}
                keyboardType='numeric'
                placeholder='2025'
                placeholderTextColor={palette.muted}
              />
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Amount</ThemedText>
              <TextInput
                style={styles.inputControl}
                value={amount}
                onChangeText={setAmount}
                keyboardType='decimal-pad'
                placeholder='0.00'
                placeholderTextColor={palette.muted}
              />
            </View>
          </View>

          <View style={styles.inputBlock}>
            <ThemedText style={styles.inputLabel}>Note</ThemedText>
            <TextInput
              style={[styles.inputControl, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder='Optional highlight...'
              placeholderTextColor={palette.muted}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.gradientButton, adding && styles.buttonDisabled]}
            disabled={adding}
            onPress={handleAddSavings}>
            <LinearGradient colors={[palette.accent, palette.accentSecondary]} style={styles.gradientInner}>
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={styles.buttonText}>Save entry</ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).duration(600)}>
        <ThemedView style={styles.listContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Timeline
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                {savings.length ? 'Latest deposits first' : 'Log your first savings entry'}
              </ThemedText>
            </View>
            <IconSymbol size={22} name="list.bullet" color={palette.accentSecondary} />
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={palette.accent} />
              <ThemedText style={styles.stateText}>Loading your timeline...</ThemedText>
            </View>
          ) : savings.length === 0 ? (
            <View style={styles.stateCard}>
              <IconSymbol size={42} name="tray" color={palette.muted} />
              <ThemedText style={styles.stateText}>No savings yet</ThemedText>
              <ThemedText style={styles.stateSubtext}>Add your first entry above to kickstart the streak.</ThemedText>
            </View>
          ) : (
            savings.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryLeft}>
                  <View style={styles.entryBadge}>
                    <IconSymbol size={16} name="calendar" color={palette.text} />
                    <ThemedText style={styles.entryBadgeText}>{entry.month.slice(0, 3)}</ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.entryTitle}>
                      {entry.month} {entry.year}
                    </ThemedText>
                    {entry.description ? (
                      <ThemedText style={styles.entrySubtitle}>{entry.description}</ThemedText>
                    ) : (
                      <ThemedText style={styles.entrySubtitle}>No notes</ThemedText>
                    )}
                  </View>
                </View>
                <View style={styles.entryRight}>
                  <ThemedText style={styles.entryAmount}>
                    ₹{parseFloat(entry.amount.toString()).toFixed(2)}
                  </ThemedText>
                  <TouchableOpacity onPress={() => handleDeleteSavings(entry.id)} style={styles.deleteButton}>
                    <IconSymbol size={20} name="trash.fill" color={palette.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
    heroCard: {
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 16,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroEyebrow: {
      color: palette.muted,
      textTransform: 'uppercase',
      fontSize: 12,
      letterSpacing: 2,
    },
    heroAmount: {
      fontSize: 40,
    },
    heroMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaLabel: {
      fontSize: 12,
      color: palette.muted,
      marginBottom: 4,
    },
    metaValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: palette.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
    },
    syncText: {
      fontSize: 12,
      color: palette.text,
    },
    formContainer: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 18,
      backgroundColor: palette.card,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 22,
    },
    sectionSubtitle: {
      color: palette.muted,
      marginTop: 4,
    },
    monthScroller: {
      gap: 10,
      paddingVertical: 6,
    },
    monthChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      marginRight: 10,
    },
    monthChipActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    monthChipText: {
      fontWeight: '600',
      color: palette.text,
    },
    monthChipTextActive: {
      color: '#fff',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputBlock: {
      flex: 1,
    },
    inputLabel: {
      fontSize: 13,
      color: palette.muted,
      marginBottom: 8,
    },
    inputControl: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: palette.text,
      backgroundColor: palette.surface,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    gradientButton: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    gradientInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    listContainer: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 16,
      backgroundColor: palette.card,
    },
    stateCard: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    stateText: {
      fontSize: 16,
      fontWeight: '600',
    },
    stateSubtext: {
      color: palette.muted,
      textAlign: 'center',
    },
    entryCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: palette.border,
    },
    entryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    entryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: palette.surface,
    },
    entryBadgeText: {
      fontWeight: '700',
    },
    entryTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    entrySubtitle: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 4,
    },
    entryRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    entryAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.accentSecondary,
    },
    deleteButton: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: palette.surface,
    },
  });
