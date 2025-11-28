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
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

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
      Alert.alert('Error', error.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!name || !amount) {
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
        .from('expenses')
        .insert({
          name,
          amount: amountNum,
          type: expenseType,
          date: selectedDate,
        });

      if (error) throw error;

      Alert.alert('Success', 'Expense added successfully!');
      setName('');
      setAmount('');
      fetchExpenses();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchExpenses();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const dailyExpenses = expenses.filter(e => e.type === 'daily');
  const monthlyExpenses = expenses.filter(e => e.type === 'monthly');
  const dailyTotal = dailyExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <LinearGradient colors={Gradients.pulse} style={styles.headerGradient}>
          <IconSymbol size={160} name="creditcard.fill" color="rgba(255,255,255,0.08)" />
          <View style={styles.headerCopy}>
            <ThemedText style={styles.headerEyebrow}>Spending radar</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>
              Control your outgoing flow
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Daily vs monthly burn in one clean surface.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.summaryRow}>
          <LinearGradient colors={[palette.card, palette.cardElevated]} style={styles.summaryCard}>
            <IconSymbol size={24} name="sun.max.fill" color={palette.warning} />
            <ThemedText style={styles.summaryLabel}>Daily burn</ThemedText>
            <ThemedText style={styles.summaryValue}>₹{dailyTotal.toFixed(2)}</ThemedText>
          </LinearGradient>
          <LinearGradient colors={[palette.card, palette.cardElevated]} style={styles.summaryCard}>
            <IconSymbol size={24} name="calendar" color={palette.info} />
            <ThemedText style={styles.summaryLabel}>Monthly commitments</ThemedText>
            <ThemedText style={styles.summaryValue}>₹{monthlyTotal.toFixed(2)}</ThemedText>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(600)}>
        <ThemedView style={styles.formContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Log an expense
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>Categorized by rhythm.</ThemedText>
            </View>
            <IconSymbol size={24} name="plus.circle.fill" color={palette.accent} />
          </View>

          <View style={styles.typeSelector}>
            {(['daily', 'monthly'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, expenseType === type && styles.typeChipActive]}
                onPress={() => setExpenseType(type)}>
                <IconSymbol
                  size={18}
                  name={type === 'daily' ? 'sun.max.fill' : 'calendar'}
                  color={expenseType === type ? '#fff' : palette.icon}
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

          <View style={styles.inputBlock}>
            <ThemedText style={styles.inputLabel}>Name</ThemedText>
            <TextInput
              style={styles.inputControl}
              value={name}
              onChangeText={setName}
              placeholder="Groceries, Rent, Coffee..."
              placeholderTextColor={palette.muted}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Amount</ThemedText>
              <TextInput
                style={styles.inputControl}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={palette.muted}
              />
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Date</ThemedText>
              <TextInput
                style={styles.inputControl}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.gradientButton, adding && styles.buttonDisabled]}
            disabled={adding}
            onPress={handleAddExpense}>
            <LinearGradient colors={[palette.accent, palette.accentSecondary]} style={styles.gradientInner}>
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={styles.buttonText}>Save expense</ThemedText>
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
                Latest activity
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                {expenses.length} item{expenses.length === 1 ? '' : 's'} tracked
              </ThemedText>
            </View>
            <IconSymbol size={22} name="list.bullet" color={palette.accentSecondary} />
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={palette.accent} />
              <ThemedText style={styles.stateText}>Loading spend...</ThemedText>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.stateCard}>
              <IconSymbol size={42} name="tray" color={palette.muted} />
              <ThemedText style={styles.stateText}>No expenses yet</ThemedText>
              <ThemedText style={styles.stateSubtext}>Capture your first one above.</ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.expensesList}>
              {expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseLeft}>
                    <View
                      style={[
                        styles.expenseBadge,
                        expense.type === 'daily' ? styles.badgeDaily : styles.badgeMonthly,
                      ]}>
                      <IconSymbol
                        size={16}
                        name={expense.type === 'daily' ? 'sun.max.fill' : 'calendar'}
                        color="#fff"
                      />
                      <ThemedText style={styles.badgeText}>{expense.type}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={styles.expenseName}>{expense.name}</ThemedText>
                      <ThemedText style={styles.expenseDate}>
                        {new Date(expense.date).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <ThemedText style={styles.expenseAmount}>
                      ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                    </ThemedText>
                    <TouchableOpacity onPress={() => handleDeleteExpense(expense.id)} style={styles.deleteButton}>
                      <IconSymbol size={18} name="trash.fill" color={palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
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
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 12,
    },
    summaryLabel: {
      fontSize: 14,
      color: palette.muted,
    },
    summaryValue: {
      fontSize: 26,
      fontWeight: '700',
    },
    formContainer: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 16,
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
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
    },
    typeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    typeChipActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    typeChipText: {
      fontWeight: '600',
      color: palette.text,
    },
    typeChipTextActive: {
      color: '#fff',
    },
    inputBlock: {
      width: '100%',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputLabel: {
      fontSize: 13,
      color: palette.muted,
      marginBottom: 6,
    },
    inputControl: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: palette.surface,
      color: palette.text,
      fontSize: 16,
    },
    gradientButton: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    gradientInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
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
      paddingVertical: 20,
    },
    stateText: {
      fontSize: 16,
      fontWeight: '600',
    },
    stateSubtext: {
      color: palette.muted,
    },
    expensesList: {
      maxHeight: 420,
    },
    expenseItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: palette.border,
    },
    expenseLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    expenseBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    badgeDaily: {
      backgroundColor: palette.warning,
    },
    badgeMonthly: {
      backgroundColor: palette.info,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      textTransform: 'uppercase',
    },
    expenseName: {
      fontSize: 16,
      fontWeight: '600',
    },
    expenseDate: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 4,
    },
    expenseRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    expenseAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.danger,
    },
    deleteButton: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: palette.surface,
    },
  });
