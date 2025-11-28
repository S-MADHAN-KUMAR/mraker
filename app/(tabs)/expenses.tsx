import { useState, useEffect } from 'react';
import { ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
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
        <LinearGradient colors={Gradients.pulse} style={{ flex: 1, padding: 32, justifyContent: 'flex-end' }}>
          <IconSymbol size={160} name="creditcard.fill" color="rgba(255,255,255,0.08)" />
          <View style={{ gap: 8, maxWidth: 280 }}>
            <ThemedText style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: palette.muted }}>Spending radar</ThemedText>
            <ThemedText type="title" style={{ fontSize: 32 }}>
              Control your outgoing flow
            </ThemedText>
            <ThemedText style={{ color: palette.muted, lineHeight: 20 }}>
              Daily vs monthly burn in one clean surface.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(600)} style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 0 }}>
          <LinearGradient colors={[palette.card, palette.cardElevated]} style={{ flex: 1, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: palette.border, gap: 12, minWidth: 0 }}>
            <IconSymbol size={24} name="sun.max.fill" color={palette.warning} />
            <ThemedText style={{ fontSize: 14, color: palette.muted }}>Daily burn</ThemedText>
            <ThemedText style={{ fontSize: 26, fontWeight: '700' }}>₹{dailyTotal.toFixed(2)}</ThemedText>
          </LinearGradient>
          <LinearGradient colors={[palette.card, palette.cardElevated]} style={{ flex: 1, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: palette.border, gap: 12, minWidth: 0 }}>
            <IconSymbol size={24} name="calendar" color={palette.info} />
            <ThemedText style={{ fontSize: 14, color: palette.muted }}>Monthly commitments</ThemedText>
            <ThemedText style={{ fontSize: 26, fontWeight: '700' }}>₹{monthlyTotal.toFixed(2)}</ThemedText>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(600)} style={{ marginBottom: 4 }}>
        <ThemedView style={{ borderRadius: 28, borderWidth: 1, borderColor: palette.border, padding: 20, gap: 16, backgroundColor: palette.card }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <ThemedText type="subtitle" style={{ fontSize: 22 }}>
                Log an expense
              </ThemedText>
              <ThemedText style={{ color: palette.muted, marginTop: 4 }}>Categorized by rhythm.</ThemedText>
            </View>
            <IconSymbol size={24} name="plus.circle.fill" color={palette.accent} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['daily', 'monthly'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: expenseType === type ? palette.accent : palette.border,
                  backgroundColor: expenseType === type ? palette.accent : palette.surface,
                }}
                onPress={() => setExpenseType(type)}>
                <IconSymbol
                  size={18}
                  name={type === 'daily' ? 'sun.max.fill' : 'calendar'}
                  color={expenseType === type ? '#fff' : palette.icon}
                />
                <ThemedText style={{ fontWeight: '600', color: expenseType === type ? '#fff' : palette.text }}>
                  {type === 'daily' ? 'Daily' : 'Monthly'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ width: '100%' }}>
            <ThemedText style={{ fontSize: 13, color: palette.muted, marginBottom: 6 }}>Name</ThemedText>
            <TextInput
              style={{ borderRadius: 18, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: palette.surface, color: palette.text, fontSize: 16 }}
              value={name}
              onChangeText={setName}
              placeholder="Groceries, Rent, Coffee..."
              placeholderTextColor={palette.muted}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 13, color: palette.muted, marginBottom: 6 }}>Amount</ThemedText>
              <TextInput
                style={{ borderRadius: 18, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: palette.surface, color: palette.text, fontSize: 16 }}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={palette.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 13, color: palette.muted, marginBottom: 6 }}>Date</ThemedText>
              <TextInput
                style={{ borderRadius: 18, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: palette.surface, color: palette.text, fontSize: 16 }}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={{ borderRadius: 20, overflow: 'hidden', opacity: adding ? 0.6 : 1 }}
            disabled={adding}
            onPress={handleAddExpense}>
            <LinearGradient colors={[palette.accent, palette.accentSecondary]} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 }}>
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Save expense</ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).duration(600)} style={{ marginBottom: 4 }}>
        <ThemedView style={{ borderRadius: 28, borderWidth: 1, borderColor: palette.border, padding: 20, gap: 16, backgroundColor: palette.card }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <ThemedText type="subtitle" style={{ fontSize: 22 }}>
                Latest activity
              </ThemedText>
              <ThemedText style={{ color: palette.muted, marginTop: 4 }}>
                {expenses.length} item{expenses.length === 1 ? '' : 's'} tracked
              </ThemedText>
            </View>
            <IconSymbol size={22} name="list.bullet" color={palette.accentSecondary} />
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <ActivityIndicator color={palette.accent} />
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Loading spend...</ThemedText>
            </View>
          ) : expenses.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <IconSymbol size={42} name="tray" color={palette.muted} />
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>No expenses yet</ThemedText>
              <ThemedText style={{ color: palette.muted }}>Capture your first one above.</ThemedText>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {expenses.map((expense) => (
                <View key={expense.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: palette.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: expense.type === 'daily' ? palette.warning : palette.info,
                      }}>
                      <IconSymbol
                        size={16}
                        name={expense.type === 'daily' ? 'sun.max.fill' : 'calendar'}
                        color="#fff"
                      />
                      <ThemedText style={{ color: '#fff', fontSize: 12, textTransform: 'uppercase' }}>{expense.type}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>{expense.name}</ThemedText>
                      <ThemedText style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>
                        {new Date(expense.date).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '700', color: palette.danger }}>
                      ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                    </ThemedText>
                    <TouchableOpacity onPress={() => handleDeleteExpense(expense.id)} style={{ padding: 6, borderRadius: 12, backgroundColor: palette.surface }}>
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

