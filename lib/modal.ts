import { useModal } from '@/components/ui/modal';

// Helper function to show success modal
export const showSuccess = (title: string, message: string, onConfirm?: () => void) => {
  // This will be used in components that have access to useModal hook
  return { title, message, type: 'success' as const, onConfirm };
};

// Helper function to show error modal
export const showError = (title: string, message: string, onConfirm?: () => void) => {
  return { title, message, type: 'error' as const, onConfirm };
};

// Helper function to show info modal
export const showInfo = (title: string, message: string, onConfirm?: () => void) => {
  return { title, message, type: 'info' as const, onConfirm };
};

// Helper function to show warning modal
export const showWarning = (title: string, message: string, onConfirm?: () => void) => {
  return { title, message, type: 'warning' as const, onConfirm };
};

// Helper function to show confirm modal
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText?: string,
  cancelText?: string
) => {
  return {
    title,
    message,
    type: 'confirm' as const,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
  };
};

// Create a hook-based alert replacement
export function useAlert() {
  const { showModal } = useModal();

  const alert = (
    title: string,
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    if (buttons && buttons.length > 1) {
      // Multiple buttons - show confirm dialog
      const confirmButton = buttons.find((b) => b.style !== 'cancel');
      const cancelButton = buttons.find((b) => b.style === 'cancel');
      
      showModal({
        title,
        message,
        type: 'confirm',
        onConfirm: confirmButton?.onPress,
        onCancel: cancelButton?.onPress,
        confirmText: confirmButton?.text || 'OK',
        cancelText: cancelButton?.text || 'Cancel',
      });
    } else {
      // Single button - show info dialog
      const button = buttons?.[0];
      const isError = button?.style === 'destructive';
      
      showModal({
        title,
        message,
        type: isError ? 'error' : 'info',
        onConfirm: button?.onPress,
        confirmText: button?.text || 'OK',
      });
    }
  };

  return { alert };
}


