import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, View } from 'react-native';
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
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { showModal } = useModal();
  const insets = useSafeAreaInsets();
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette, insets.top), [palette, insets.top]);

  const currentMonth = MONTHS[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

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
      showModal({
        title: 'Error',
        message: error.message || 'Failed to fetch savings',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSavings = async () => {
    if (!amount) {
      showModal({
        title: 'Error',
        message: 'Please enter an amount',
        type: 'error',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid amount',
        type: 'error',
      });
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('savings')
        .upsert({
          month: currentMonth,
          year: currentYear,
          amount: amountNum,
          description: description || null,
        }, {
          onConflict: 'month,year'
        });

      if (error) throw error;

      showModal({
        title: 'Success',
        message: 'Savings added successfully!',
        type: 'success',
      });
      setAmount('');
      setDescription('');
      fetchSavings();
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to add savings',
        type: 'error',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleEditSavings = () => {
    if (thisMonthSavings) {
      setAmount(thisMonthSavings.amount.toString());
      setDescription(thisMonthSavings.description || '');
      setEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setAmount('');
    setDescription('');
  };

  const handleUpdateSavings = async () => {
    if (!amount) {
      showModal({
        title: 'Error',
        message: 'Please enter an amount',
        type: 'error',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid amount',
        type: 'error',
      });
      return;
    }

    if (!thisMonthSavings) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('savings')
        .update({
          amount: amountNum,
          description: description || null,
        })
        .eq('id', thisMonthSavings.id);

      if (error) throw error;

      showModal({
        title: 'Success',
        message: 'Savings updated successfully!',
        type: 'success',
      });
      setEditing(false);
      setAmount('');
      setDescription('');
      fetchSavings();
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to update savings',
        type: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  const thisMonthSavings = savings.find(
    entry => entry.month === currentMonth && entry.year === currentYear
  );
  const thisMonthAmount = thisMonthSavings ? parseFloat(thisMonthSavings.amount.toString()) : 0;
  const hasThisMonthEntry = !!thisMonthSavings;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      
      {/* Total Savings Card */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.totalCard}>
          <View style={styles.totalCardHeader}>
            <View style={styles.totalCardHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#05966915' }]}>
                <IconSymbol size={24} name="banknote.fill" color="#059669" />
              </View>
              <View>
                <ThemedText style={styles.totalLabel}>Total Savings</ThemedText>
                <ThemedText style={styles.totalValue}>₹{totalSavings.toFixed(2)}</ThemedText>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.refreshBtn}
              onPress={fetchSavings}
              disabled={loading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol size={18} name="arrow.right.circle.fill" color={palette.muted} />
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Animated.View>

      {/* This Month Savings Card */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.monthCard}>
          <View style={styles.monthCardHeader}>
            <View style={styles.monthCardHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#1e40af15' }]}>
                <IconSymbol size={20} name="calendar" color="#1e40af" />
              </View>
              <View>
                <ThemedText style={styles.monthLabel}>This Month</ThemedText>
                <ThemedText style={styles.monthTitle}>{currentMonth} {currentYear}</ThemedText>
              </View>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={palette.accent} size="small" />
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
          ) : hasThisMonthEntry && !editing ? (
            <View style={styles.monthAmountContainer}>
              <View style={styles.monthAmountHeader}>
                <ThemedText style={styles.monthAmountLabel}>Saved this month</ThemedText>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditSavings}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <IconSymbol size={18} name="pencil.circle.fill" color={palette.accent} />
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.monthAmountValue}>₹{thisMonthAmount.toFixed(2)}</ThemedText>
              {thisMonthSavings?.description && (
                <ThemedText style={styles.monthDescription}>{thisMonthSavings.description}</ThemedText>
              )}
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Amount (₹) *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Note (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a note..."
                  placeholderTextColor={palette.muted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formButtons}>
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
                  disabled={adding || updating}
                  onPress={editing ? handleUpdateSavings : handleAddSavings}>
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
                          {editing ? 'Update Amount' : 'Save Amount'}
                        </ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ThemedView>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColorSet, topInset: number) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingTop: Math.max(topInset + 20, 20),
    },
    cardContainer: {
      marginBottom: 16,
    },
    totalCard: {
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
    totalCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    totalCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalLabel: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
      fontFamily: FontFamily.semiBold,
    },
    totalValue: {
      fontSize: 32,
      fontWeight: '700',
      color: palette.text,
      fontFamily: FontFamily.bold,
    },
    refreshBtn: {
      padding: 8,
    },
    monthCard: {
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
    monthCardHeader: {
      marginBottom: 20,
    },
    monthCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    monthLabel: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    loadingState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    monthAmountContainer: {
      gap: 8,
    },
    monthAmountHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthAmountLabel: {
      fontSize: 13,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    editButton: {
      padding: 4,
    },
    monthAmountValue: {
      fontSize: 28,
      fontWeight: '700',
      color: '#059669',
      fontFamily: FontFamily.bold,
    },
    monthDescription: {
      fontSize: 14,
      color: palette.text,
      marginTop: 8,
      fontFamily: FontFamily.regular,
    },
    formContainer: {
      gap: 16,
    },
    formButtons: {
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
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      minHeight: 80,
      textAlignVertical: 'top',
      fontFamily: FontFamily.regular,
    },
    submitButton: {
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 8,
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
  });
