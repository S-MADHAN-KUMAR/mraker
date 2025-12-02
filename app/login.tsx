import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Colors, Gradients, type ThemeColorSet } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const { login, loginWithFingerprint } = useAuth();
  const colorScheme = useAppSelector((state) => state.theme.colorScheme);
  const palette = Colors[colorScheme ?? 'dark'];
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    checkFingerprintAvailability();
  }, []);

  const checkFingerprintAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setFingerprintAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Error checking fingerprint availability:', error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Invalid username or password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setLoading(true);
    try {
      const success = await loginWithFingerprint();
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Fingerprint authentication failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Fingerprint login failed');
    } finally {
      setLoading(false);
    }
  };

  const gradientColors = colorScheme === 'light' 
    ? Gradients.lightPurple 
    : Gradients.midnight;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
          <View>
            <ThemedText style={styles.heroEyebrow}>Secure workspace</ThemedText>
            <ThemedText type="title" style={styles.heroTitle}>
              Sign in to Mraker
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>Authed by Supabase · Protected by biometrics</ThemedText>
          </View>
          <IconSymbol size={54} name="lock.shield.fill" color={palette.accent} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).duration(600)} style={styles.formCard}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <View style={styles.inputContainer}>
              <IconSymbol size={18} name="person.fill" color={palette.icon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={styles.inputContainer}>
              <IconSymbol size={18} name="lock.fill" color={palette.icon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={palette.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol size={20} name="arrow.right.circle.fill" color="#fff" />
                <ThemedText style={styles.loginButtonText}>Enter dashboard</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {fingerprintAvailable && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>or</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.fingerprintButton, loading && styles.fingerprintButtonDisabled]}
                onPress={handleFingerprintLogin}
                disabled={loading}>
                <IconSymbol size={32} name="touchid" color={palette.accentSecondary} />
                <ThemedText style={styles.fingerprintButtonText}>Use fingerprint</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ThemeColorSet) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
      padding: 32,
      justifyContent: 'center',
    },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
    },
    heroEyebrow: {
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: palette.muted,
    },
    heroTitle: {
      fontSize: 32,
      marginTop: 8,
    },
    heroSubtitle: {
      color: palette.muted,
      marginTop: 8,
    },
    formCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 24,
      backgroundColor: palette.card,
      gap: 20,
    },
    inputGroup: {
      gap: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.muted,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      backgroundColor: palette.surface,
      gap: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: palette.text,
    },
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.accent,
      padding: 16,
      borderRadius: 18,
      gap: 8,
      marginTop: 8,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: palette.border,
    },
    dividerText: {
      fontSize: 12,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    fingerprintButton: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.accentSecondary,
      backgroundColor: palette.surface,
      gap: 8,
    },
    fingerprintButtonDisabled: {
      opacity: 0.6,
    },
    fingerprintButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.accentSecondary,
    },
    info: {
      marginTop: 32,
      alignItems: 'center',
    },
    infoText: {
      fontSize: 12,
      color: palette.muted,
      fontStyle: 'italic',
    },
  });

