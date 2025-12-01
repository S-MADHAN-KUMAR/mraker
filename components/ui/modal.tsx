import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, FontFamily, type ThemeColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ModalContextType {
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
}

interface ModalConfig {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [scaleAnim] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'dark'];

  const showModal = (modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setConfig(null);
    });
  };

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    hideModal();
  };

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    hideModal();
  };

  const getIconName = () => {
    switch (config?.type) {
      case 'success':
        return 'checkmark.circle.fill';
      case 'error':
        return 'xmark.circle.fill';
      case 'warning':
        return 'exclamationmark.triangle.fill';
      case 'confirm':
        return 'questionmark.circle.fill';
      default:
        return 'info.circle.fill';
    }
  };

  const getIconColor = () => {
    switch (config?.type) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#F87171';
      case 'warning':
        return '#FACC15';
      case 'confirm':
        return '#3B82F6';
      default:
        return '#38BDF8';
    }
  };

  const getButtonColors = () => {
    switch (config?.type) {
      case 'success':
        return ['#22C55E', '#16A34A'];
      case 'error':
        return ['#F87171', '#EF4444'];
      case 'warning':
        return ['#FACC15', '#EAB308'];
      case 'confirm':
        return ['#3B82F6', '#2563EB'];
      default:
        return ['#38BDF8', '#0EA5E9'];
    }
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hideModal}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hideModal}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: getIconColor() + '15' }]}>
                    <IconSymbol size={32} name={getIconName()} color={getIconColor()} />
                  </View>
                </View>

                <ThemedText style={[styles.title, { color: palette.text }]}>
                  {config?.title}
                </ThemedText>

                <ThemedText style={[styles.message, { color: palette.muted }]}>
                  {config?.message}
                </ThemedText>

                <View style={styles.buttonContainer}>
                  {config?.type === 'confirm' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.cancelButton, { borderColor: palette.border }]}
                        onPress={handleCancel}
                        activeOpacity={0.8}>
                        <ThemedText style={[styles.cancelButtonText, { color: palette.text }]}>
                          {config?.cancelText || 'Cancel'}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirm}
                        activeOpacity={0.8}>
                        <LinearGradient
                          colors={getButtonColors()}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.gradientButton}>
                          <ThemedText style={styles.confirmButtonText}>
                            {config?.confirmText || 'Confirm'}
                          </ThemedText>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.singleButton}
                      onPress={handleConfirm}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={getButtonColors()}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}>
                        <ThemedText style={styles.confirmButtonText}>
                          {config?.confirmText || 'OK'}
                        </ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: FontFamily.bold,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: FontFamily.regular,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  singleButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
  },
});

