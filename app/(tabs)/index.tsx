import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients, FontFamily, type ThemeColorSet } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { useModal } from '@/components/ui/modal';

const QUICK_PRESETS = ['150', '250', '500', '1000'];

export default function HomeScreen() {
  const [balance, setBalance] = useState(0);
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { showModal } = useModal();
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
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
      showModal({
        title: 'Error',
        message: error.message || 'Failed to fetch balance',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async () => {
    const amount = parseFloat(newBalance);
    if (isNaN(amount) || amount <= 0) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid amount',
        type: 'error',
      });
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
      showModal({
        title: 'Success',
        message: 'Balance updated successfully!',
        type: 'success',
      });
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to update balance',
        type: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  const isValidAmount = newBalance.length > 0 && !isNaN(parseFloat(newBalance)) && parseFloat(newBalance) > 0;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.headerTitle}>
              السلام عليكم
            </ThemedText>
          </View>
        </View>
      }>
      
      {/* Balance Card */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: palette.accent + '15' }]}>
                <IconSymbol size={20} name="dollarsign.circle.fill" color={palette.accent} />
              </View>
            <View>
                <ThemedText style={styles.cardLabel}>Current Balance</ThemedText>
                <ThemedText style={styles.cardTitle}>Home Vault</ThemedText>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.refreshBtn}
              onPress={fetchBalance} 
              disabled={loading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol size={16} name="arrow.right.circle.fill" color={palette.muted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <Image
                source={require('@/assets/yapapa.gif')}
                style={styles.loaderGif}
                contentFit="contain"
              />
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
          ) : (
            <ThemedText type="title" style={styles.balanceValue}>
              ₹{balance.toFixed(2)}
            </ThemedText>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <ThemedText style={styles.footerLabel}>Status</ThemedText>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
                <ThemedText style={[styles.footerValue, { color: palette.success }]}>
                  Active
                </ThemedText>
              </View>
            </View>
            <View style={styles.footerItem}>
              <ThemedText style={styles.footerLabel}>Sync</ThemedText>
              <ThemedText style={styles.footerValue}>Real-time</ThemedText>
            </View>
          </View>
        </ThemedView>
      </Animated.View>

      {/* Update Balance Form */}
      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.cardContainer}>
        <ThemedView style={styles.card}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#1e40af15' }]}>
                <IconSymbol size={20} name="pencil.circle.fill" color="#1e40af" />
              </View>
            <View>
                <ThemedText style={styles.formTitle}>Update Balance</ThemedText>
                <ThemedText style={styles.formSubtitle}>Set a new balance amount</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Amount (₹)</ThemedText>
            <View style={styles.inputContainer}>
            <TextInput
                style={styles.input}
              value={newBalance}
              onChangeText={setNewBalance}
              keyboardType="decimal-pad"
                placeholder="0.00"
              placeholderTextColor={palette.muted}
                autoFocus={false}
            />
            {newBalance.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setNewBalance('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <IconSymbol size={18} name="xmark.circle.fill" color={palette.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.quickPresetsGroup}>
            <ThemedText style={styles.presetsLabel}>Quick Select</ThemedText>
            <View style={styles.presetsRow}>
              {QUICK_PRESETS.map((preset) => {
                const isActive = newBalance === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      isActive && styles.presetChipActive,
                    ]}
                    onPress={() => setNewBalance(preset)}>
                    <ThemedText
                      style={[
                        styles.presetChipText,
                        isActive && styles.presetChipTextActive,
                      ]}>
                      ₹{preset}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {balance > 0 && (
              <TouchableOpacity
                style={styles.useCurrentBtn}
                onPress={() => setNewBalance(balance.toFixed(2))}>
                <IconSymbol size={14} name="arrow.right.circle.fill" color="#1e40af" />
                <ThemedText style={styles.useCurrentText}>Use current balance</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            disabled={!isValidAmount || updating}
            style={[
              styles.submitButton,
              (!isValidAmount || updating) && styles.submitButtonDisabled,
            ]}
            onPress={updateBalance}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#1e40af', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}>
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <IconSymbol size={16} name="checkmark.circle.fill" color="#fff" />
                  <ThemedText style={styles.submitButtonText}>Update Balance</ThemedText>
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
    headerContainer: {
      width: '100%',
      height: '100%',
      padding: 24,
      paddingBottom: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    headerTitle: {
      fontSize: 42,
      fontWeight: '700',
      color: '#D4AF37', // Gold color
      textAlign: 'center',
      fontFamily: FontFamily.bold,
      writingDirection: 'rtl', // Right-to-left for Arabic
    },
    cardContainer: {
      marginBottom: 16,
    },
    card: {
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
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
      fontFamily: FontFamily.semiBold,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    refreshBtn: {
      padding: 8,
    },
    loadingState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      minHeight: 120,
    },
    loaderGif: {
      width: 80,
      height: 80,
    },
    loadingText: {
      fontSize: 14,
      color: palette.muted,
      marginTop: 12,
      fontFamily: FontFamily.regular,
    },
    balanceValue: {
      fontSize: 42,
      fontWeight: '700',
      letterSpacing: -1,
      marginBottom: 20,
      color: palette.text,
      fontFamily: FontFamily.bold,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    footerItem: {
      gap: 4,
    },
    footerLabel: {
      fontSize: 11,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: FontFamily.medium,
    },
    footerValue: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    formHeader: {
      marginBottom: 20,
    },
    formHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    input: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: palette.text,
      paddingVertical: 16,
      fontFamily: FontFamily.semiBold,
    },
    clearBtn: {
      paddingLeft: 8,
      paddingRight: 4,
    },
    quickPresetsGroup: {
      marginBottom: 20,
    },
    presetsLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
      fontFamily: FontFamily.semiBold,
    },
    presetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    presetChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    presetChipActive: {
      borderColor: '#1e40af',
      backgroundColor: '#1e40af15',
    },
    presetChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.text,
      fontFamily: FontFamily.semiBold,
    },
    presetChipTextActive: {
      color: '#1e40af',
      fontFamily: FontFamily.semiBold,
    },
    useCurrentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    useCurrentText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1e40af',
      fontFamily: FontFamily.semiBold,
    },
    submitButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
      fontFamily: FontFamily.semiBold,
    },
  });
