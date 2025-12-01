import { useState, useEffect, useMemo, useRef } from 'react';
import { ScrollView, TextInput, TouchableOpacity, ActivityIndicator, View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, type ThemeColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useModal } from '@/components/ui/modal';

interface Expense {
  id: string;
  name: string;
  amount: number;
  type: 'daily' | 'monthly';
  date: string;
  created_at: string;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenseType, setExpenseType] = useState<'daily' | 'monthly'>('daily');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width - 40; // Account for padding
  const { showModal } = useModal();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette, screenWidth, insets.top, insets.bottom), [palette, screenWidth, insets.top, insets.bottom]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to fetch expenses',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!name || !amount) {
      showModal({
        title: 'Error',
        message: 'Please fill in all required fields',
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
        .from('expenses')
        .insert({
          name,
          amount: amountNum,
          type: expenseType,
          date: selectedDate,
        });

      if (error) throw error;

      showModal({
        title: 'Success',
        message: 'Expense added successfully!',
        type: 'success',
      });
      setName('');
      setAmount('');
      fetchExpenses();
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to add expense',
        type: 'error',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    showModal({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

          if (error) throw error;
          fetchExpenses();
        } catch (error: any) {
          showModal({
            title: 'Error',
            message: error.message || 'Failed to delete expense',
            type: 'error',
          });
        }
      },
    });
  };

  const dailyExpenses = expenses.filter(e => e.type === 'daily');
  const monthlyExpenses = expenses.filter(e => e.type === 'monthly');
  const dailyTotal = dailyExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      
      {/* Swipeable Daily and Monthly Expenses Cards */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.cardContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentCardIndex(index);
          }}
          style={styles.carouselContainer}
          contentContainerStyle={styles.carouselContent}>
          {/* Daily Expenses Card */}
          <ThemedView style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FACC1515' }]}>
                <IconSymbol size={20} name="sun.max.fill" color="#FACC15" />
              </View>
              <View style={styles.statContent}>
                <ThemedText style={styles.statLabel}>Daily Expenses</ThemedText>
                <ThemedText style={styles.statValue}>₹{dailyTotal.toFixed(2)}</ThemedText>
                <ThemedText style={styles.statCount}>{dailyExpenses.length} {dailyExpenses.length === 1 ? 'expense' : 'expenses'}</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Monthly Expenses Card */}
          <ThemedView style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: '#38BDF815' }]}>
                <IconSymbol size={20} name="calendar" color="#38BDF8" />
              </View>
              <View style={styles.statContent}>
                <ThemedText style={styles.statLabel}>Monthly Expenses</ThemedText>
                <ThemedText style={styles.statValue}>₹{monthlyTotal.toFixed(2)}</ThemedText>
                <ThemedText style={styles.statCount}>{monthlyExpenses.length} {monthlyExpenses.length === 1 ? 'expense' : 'expenses'}</ThemedText>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
        
        {/* Page Indicators */}
        <View style={styles.pageIndicators}>
          <View style={[styles.pageIndicator, currentCardIndex === 0 && styles.pageIndicatorActive]} />
          <View style={[styles.pageIndicator, currentCardIndex === 1 && styles.pageIndicatorActive]} />
        </View>
      </Animated.View>

      {/* Add Expense Form */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#05966915' }]}>
                <IconSymbol size={20} name="plus.circle.fill" color="#059669" />
              </View>
              <View>
                <ThemedText style={styles.formTitle}>Add Expense</ThemedText>
                <ThemedText style={styles.formSubtitle}>Track your spending</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.typeSelector}>
            {(['daily', 'monthly'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  expenseType === type && styles.typeChipActive,
                ]}
                onPress={() => setExpenseType(type)}>
                <IconSymbol
                  size={16}
                  name={type === 'daily' ? 'sun.max.fill' : 'calendar'}
                  color={expenseType === type ? '#fff' : palette.text}
                />
                <ThemedText
                  style={[
                    styles.typeChipText,
                    expenseType === type && styles.typeChipTextActive,
                  ]}>
                  {type === 'daily' ? 'Daily' : 'Monthly'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Expense Name *</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Groceries, Rent, Coffee..."
              placeholderTextColor={palette.muted}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
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
            <View style={styles.inputGroupHalf}>
              <ThemedText style={styles.inputLabel}>Date *</ThemedText>
              <TextInput
                style={styles.input}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, adding && styles.submitButtonDisabled]}
            disabled={adding}
            onPress={handleAddExpense}>
            <LinearGradient
              colors={['#1e40af', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}>
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={styles.submitButtonText}>Add Expense</ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>

      {/* Daily Expenses List */}
      <Animated.View entering={FadeInUp.delay(120).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.listCard}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FACC1515' }]}>
                <IconSymbol size={20} name="sun.max.fill" color="#FACC15" />
              </View>
              <View>
                <ThemedText style={styles.listTitle}>Daily Expenses</ThemedText>
                <ThemedText style={styles.listSubtitle}>
                  {dailyExpenses.length} {dailyExpenses.length === 1 ? 'item' : 'items'}
                </ThemedText>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.accent} />
              <ThemedText style={styles.loadingText}>Loading expenses...</ThemedText>
            </View>
          ) : dailyExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol size={48} name="tray" color={palette.muted} />
              <ThemedText style={styles.emptyText}>No daily expenses yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Add your first expense above</ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
              {dailyExpenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseItemLeft}>
                    <View style={[styles.expenseTypeBadge, { backgroundColor: '#FACC1515' }]}>
                      <IconSymbol size={14} name="sun.max.fill" color="#FACC15" />
                    </View>
                    <View style={styles.expenseInfo}>
                      <ThemedText style={styles.expenseName}>{expense.name}</ThemedText>
                      <ThemedText style={styles.expenseDate}>
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.expenseItemRight}>
                    <ThemedText style={styles.expenseAmount}>
                      ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(expense.id)}
                      style={styles.deleteButton}>
                      <IconSymbol size={16} name="trash.fill" color={palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </ThemedView>
      </Animated.View>

      {/* Monthly Expenses List */}
      <Animated.View entering={FadeInUp.delay(160).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.listCard}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#38BDF815' }]}>
                <IconSymbol size={20} name="calendar" color="#38BDF8" />
              </View>
              <View>
                <ThemedText style={styles.listTitle}>Monthly Expenses</ThemedText>
                <ThemedText style={styles.listSubtitle}>
                  {monthlyExpenses.length} {monthlyExpenses.length === 1 ? 'item' : 'items'}
                </ThemedText>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.accent} />
              <ThemedText style={styles.loadingText}>Loading expenses...</ThemedText>
            </View>
          ) : monthlyExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol size={48} name="tray" color={palette.muted} />
              <ThemedText style={styles.emptyText}>No monthly expenses yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Add your first expense above</ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
              {monthlyExpenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseItemLeft}>
                    <View style={[styles.expenseTypeBadge, { backgroundColor: '#38BDF815' }]}>
                      <IconSymbol size={14} name="calendar" color="#38BDF8" />
                    </View>
                    <View style={styles.expenseInfo}>
                      <ThemedText style={styles.expenseName}>{expense.name}</ThemedText>
                      <ThemedText style={styles.expenseDate}>
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.expenseItemRight}>
                    <ThemedText style={styles.expenseAmount}>
                      ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(expense.id)}
                      style={styles.deleteButton}>
                      <IconSymbol size={16} name="trash.fill" color={palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </ThemedView>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColorSet, screenWidth: number, topInset: number, bottomInset: number) =>
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
    carouselContainer: {
      marginHorizontal: -16,
      backgroundColor: 'transparent',
    },
    carouselContent: {
      paddingHorizontal: 16,
    },
    statCard: {
      width: screenWidth,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 20,
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    pageIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    pageIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.border,
    },
    pageIndicatorActive: {
      backgroundColor: palette.accent,
      width: 24,
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    statIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statContent: {
      flex: 1,
      gap: 4,
    },
    statLabel: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: FontFamily.semiBold,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: palette.text,
      fontFamily: FontFamily.bold,
    },
    statCount: {
      fontSize: 12,
      color: palette.muted,
      fontFamily: FontFamily.regular,
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
      marginBottom: 20,
    },
    formHeaderLeft: {
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
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    typeChip: {
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
    typeChipActive: {
      backgroundColor: '#1e40af',
      borderColor: '#1e40af',
    },
    typeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    typeChipTextActive: {
      color: '#fff',
      fontFamily: FontFamily.semiBold,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    inputGroupHalf: {
      flex: 1,
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
    expensesList: {
      maxHeight: 400,
    },
    expenseItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    expenseItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    expenseTypeBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expenseInfo: {
      flex: 1,
    },
    expenseName: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 4,
      fontFamily: FontFamily.semiBold,
    },
    expenseDate: {
      fontSize: 12,
      color: palette.muted,
      fontFamily: FontFamily.regular,
    },
    expenseItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    expenseAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.danger,
      fontFamily: FontFamily.bold,
    },
    deleteButton: {
      padding: 8,
    },
  });
