import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: '✓',
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        fontWeight: 600,
      },
    });
  },

  error: (message: string) => {
    toast.error(message, {
      icon: '✕',
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
        fontWeight: 600,
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        fontWeight: 600,
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        success: {
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            fontWeight: 600,
          },
          icon: '✓',
        },
        error: {
          style: {
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            fontWeight: 600,
          },
          icon: '✕',
        },
        loading: {
          style: {
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            fontWeight: 600,
          },
        },
      }
    );
  },

  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        fontWeight: 600,
      },
    });
  },

  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
        fontWeight: 600,
      },
    });
  },

  confirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    // This function is deprecated - use ConfirmDialog component instead
    console.warn('toast.confirm is deprecated. Use ConfirmDialog component for better UX.');
    // Fallback to browser confirm for now
    if (window.confirm(message)) {
      onConfirm();
    } else {
      onCancel?.();
    }
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};
