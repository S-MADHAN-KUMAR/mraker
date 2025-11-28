import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients, type ThemeColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const QUICK_PRESETS = ['150', '250', '500', '1000'];

export default function HomeScreen() {
  const [balance, setBalance] = useState(0);
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('balance')
        .select('amount')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setBalance(parseFloat(data.amount.toString()));
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('balance')
          .insert({ amount: 0 })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newData) setBalance(parseFloat(newData.amount.toString()));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async () => {
    const amount = parseFloat(newBalance);
    if (isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setUpdating(true);
      const { data, error } = await supabase
        .from('balance')
        .select('id')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const { error: updateError } = await supabase
          .from('balance')
          .update({ amount })
          .eq('id', data.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('balance')
          .insert({ amount });

        if (insertError) throw insertError;
      }

      setBalance(amount);
      setNewBalance('');
      Alert.alert('Success', 'Balance updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update balance');
    } finally {
      setUpdating(false);
    }
  };

  const monthlyProjection = balance * 1.08;
  const safeToSpend = Math.max(balance * 0.32, 50);
  const reserve = Math.max(balance * 0.18, 25);

  const metrics = [
    {
      label: 'Monthly projection',
      value: `₹${monthlyProjection.toFixed(2)}`,
      helper: 'Target +8% vs last month',
      helperColor: palette.accentSecondary,
    },
    {
      label: 'Safe to spend',
      value: `₹${safeToSpend.toFixed(2)}`,
      helper: 'Keeps 3 weeks runway',
      helperColor: palette.info,
    },
    {
      label: 'Emergency reserve',
      value: `₹${reserve.toFixed(2)}`,
      helper: 'Auto-top up enabled',
      helperColor: palette.warning,
    },
  ];

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <LinearGradient colors={Gradients.midnight} style={styles.heroHeader}>
          <View style={styles.heroGlow} />
          <View style={styles.heroHeaderContent}>
            <ThemedText style={styles.heroEyebrow}>Pulse dashboard</ThemedText>
            <ThemedText type="title" style={styles.heroTitle}>
              Welcome back, Ejaz
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Your unified command center for savings, expenses, work, and dua.
            </ThemedText>
          </View>
        </LinearGradient>
      }>
      <Animated.View entering={FadeInDown.duration(650)}>
        <LinearGradient colors={[palette.card, palette.cardElevated]} style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <ThemedText style={styles.balanceEyebrow}>Live balance</ThemedText>
              <View style={styles.balanceTitleRow}>
                <IconSymbol size={28} name="dollarsign.circle.fill" color={palette.accent} />
                <ThemedText type="subtitle" style={styles.balanceLabel}>
                  Home vault
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchBalance} disabled={loading}>
              <IconSymbol size={18} name="arrow.right.circle.fill" color={palette.text} />
              <ThemedText style={styles.refreshText}>Refresh</ThemedText>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={palette.accent} />
          ) : (
            <ThemedText type="title" style={styles.balanceAmount}>
              ₹{balance.toFixed(2)}
            </ThemedText>
          )}
          <View style={styles.balanceMetaRow}>
            <View>
              <ThemedText style={styles.metaLabel}>Updated in realtime</ThemedText>
              <ThemedText style={styles.metaValue}>Supabase sync</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.metaLabel}>Status</ThemedText>
              <ThemedText style={[styles.metaValue, { color: palette.success }]}>Healthy</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <ThemedView style={styles.metricsContainer}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
              <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
              <ThemedText style={[styles.metricHelper, { color: metric.helperColor }]}>{metric.helper}</ThemedText>
            </View>
          ))}
        </ThemedView>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).duration(600)}>
        <ThemedView style={styles.formContainer}>
          <View style={styles.formHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Set a new balance
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Keep your snapshot aligned with your bank movements.
              </ThemedText>
            </View>
            <IconSymbol size={28} name="pencil.circle.fill" color={palette.accentSecondary} />
          </View>

          <View style={styles.inputWrapper}>
            <IconSymbol size={22} name="dollarsign.circle.fill" color={palette.accentSecondary} />
            <TextInput
              style={styles.amountInput}
              value={newBalance}
              onChangeText={setNewBalance}
              keyboardType="decimal-pad"
              placeholder="Type an amount"
              placeholderTextColor={palette.muted}
            />
            {newBalance.length > 0 && (
              <TouchableOpacity onPress={() => setNewBalance('')}>
                <IconSymbol size={20} name="xmark.circle.fill" color={palette.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.quickActions}>
            {QUICK_PRESETS.map((preset) => (
              <TouchableOpacity key={preset} style={styles.quickChip} onPress={() => setNewBalance(preset)}>
                <ThemedText style={styles.quickChipText}>₹{preset}</ThemedText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickChipGhost} onPress={() => setNewBalance(balance.toFixed(2))}>
              <ThemedText style={styles.quickChipGhostText}>Use balance</ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={updating}
            style={[styles.gradientButton, updating && styles.buttonDisabled]}
            onPress={updateBalance}>
            <LinearGradient colors={[palette.accent, palette.accentSecondary]} style={styles.gradientInner}>
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={styles.buttonText}>Update balance</ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </Animated.View>
    </ParallaxScrollView>
  );
}

const createStyles = (palette: ThemeColorSet) =>
  StyleSheet.create({
    heroHeader: {
      height: '100%',
      width: '100%',
      padding: 32,
      justifyContent: 'flex-end',
    },
    heroGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 200,
      backgroundColor: palette.accent,
      opacity: 0.25,
      top: 40,
      right: -60,
    },
    heroHeaderContent: {
      gap: 8,
    },
    heroEyebrow: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: palette.muted,
    },
    heroTitle: {
      fontSize: 34,
    },
    heroSubtitle: {
      color: palette.muted,
      maxWidth: 260,
      lineHeight: 20,
    },
    balanceCard: {
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    balanceEyebrow: {
      color: palette.muted,
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 2,
    },
    balanceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    balanceLabel: {
      marginLeft: 8,
      fontSize: 18,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    refreshText: {
      marginLeft: 6,
      fontSize: 12,
      color: palette.text,
    },
    balanceAmount: {
      fontSize: 48,
      marginVertical: 8,
    },
    balanceMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    metaLabel: {
      fontSize: 12,
      color: palette.muted,
      marginBottom: 4,
    },
    metaValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    metricsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCard: {
      flex: 1,
      minWidth: 100,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
    },
    metricLabel: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '700',
      marginVertical: 8,
    },
    metricHelper: {
      fontSize: 12,
    },
    formContainer: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      backgroundColor: palette.card,
      gap: 18,
    },
    formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 22,
    },
    sectionSubtitle: {
      color: palette.muted,
      fontSize: 14,
      marginTop: 4,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 16,
      backgroundColor: palette.surface,
    },
    amountInput: {
      flex: 1,
      fontSize: 18,
      paddingVertical: 14,
      color: palette.text,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    quickChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    quickChipGhost: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.accent,
    },
    quickChipGhostText: {
      color: palette.accent,
      fontWeight: '600',
    },
    gradientButton: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    gradientInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
