'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import styles from './ConfirmDialog.module.css';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ActiveDialog extends DialogOptions {
  mode: 'confirm' | 'alert' | 'password';
  resolve: (result: boolean | string | null) => void;
}

interface DialogContextValue {
  confirm: (optionsOrMessage: string | DialogOptions, extraOptions?: Partial<DialogOptions>) => Promise<boolean>;
  alert: (optionsOrMessage: string | DialogOptions, extraOptions?: Partial<DialogOptions>) => Promise<void>;
  promptPassword: (optionsOrMessage?: string | DialogOptions, extraOptions?: Partial<DialogOptions>) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const confirm = useCallback(
    (
      optionsOrMessage: string | DialogOptions,
      extraOptions?: Partial<DialogOptions>
    ): Promise<boolean> => {
      const opts: DialogOptions =
        typeof optionsOrMessage === 'string'
          ? { message: optionsOrMessage, ...(extraOptions || {}) }
          : { ...optionsOrMessage, ...(extraOptions || {}) };

      const isDestructive =
        opts.danger ??
        /\b(delete|remove|disconnect|warning|permanently|ban)\b/i.test(opts.message);

      return new Promise<boolean>((resolve) => {
        setDialog({
          mode: 'confirm',
          title: opts.title || (isDestructive ? 'Please Confirm' : 'Confirm Action'),
          message: opts.message,
          confirmText: opts.confirmText || (isDestructive ? 'Confirm' : 'Continue'),
          cancelText: opts.cancelText || 'Cancel',
          danger: isDestructive,
          resolve: (res) => resolve(Boolean(res)),
        });
      });
    },
    []
  );

  const alert = useCallback(
    (
      optionsOrMessage: string | DialogOptions,
      extraOptions?: Partial<DialogOptions>
    ): Promise<void> => {
      const opts: DialogOptions =
        typeof optionsOrMessage === 'string'
          ? { message: optionsOrMessage, ...(extraOptions || {}) }
          : { ...optionsOrMessage, ...(extraOptions || {}) };

      const isError =
        opts.danger ??
        /\b(fail|failed|error|expired|invalid|warning)\b/i.test(opts.message);

      return new Promise<void>((resolve) => {
        setDialog({
          mode: 'alert',
          title: opts.title || (isError ? 'Notice' : 'Notification'),
          message: opts.message,
          confirmText: opts.confirmText || 'OK',
          danger: isError,
          resolve: () => resolve(),
        });
      });
    },
    []
  );

  const promptPassword = useCallback(
    (
      optionsOrMessage?: string | DialogOptions,
      extraOptions?: Partial<DialogOptions>
    ): Promise<string | null> => {
      const defaultMsg = 'Please enter your current password to confirm this change.';
      const opts: DialogOptions = !optionsOrMessage
        ? { message: defaultMsg, ...(extraOptions || {}) }
        : typeof optionsOrMessage === 'string'
        ? { message: optionsOrMessage, ...(extraOptions || {}) }
        : { ...optionsOrMessage, ...(extraOptions || {}) };

      setPasswordValue('');
      setShowPassword(false);
      setPasswordError('');

      return new Promise<string | null>((resolve) => {
        setDialog({
          mode: 'password',
          title: opts.title || 'Password Confirmation Required',
          message: opts.message || defaultMsg,
          confirmText: opts.confirmText || 'Confirm & Save',
          cancelText: opts.cancelText || 'Cancel',
          danger: opts.danger ?? false,
          resolve: (res) => resolve(typeof res === 'string' ? res : null),
        });
      });
    },
    []
  );

  const handleClose = useCallback(
    (result: boolean | string | null) => {
      if (!dialog) return;
      if (dialog.mode === 'password' && result === true) {
        if (!passwordValue) {
          setPasswordError('Please enter your password to continue.');
          return;
        }
        const resolver = dialog.resolve;
        const val = passwordValue;
        setDialog(null);
        setPasswordValue('');
        setPasswordError('');
        resolver(val);
        return;
      }
      const resolver = dialog.resolve;
      setDialog(null);
      setPasswordValue('');
      setPasswordError('');
      resolver(dialog.mode === 'password' ? null : result);
    },
    [dialog, passwordValue]
  );

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, handleClose]);

  return (
    <DialogContext.Provider value={{ confirm, alert, promptPassword }}>
      {children}
      {dialog && (
        <div
          className={styles.overlay}
          onClick={() => handleClose(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="df-dialog-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.headerRow}>
              <div
                className={`${styles.iconBadge} ${
                  dialog.danger ? styles.iconDanger : styles.iconPrimary
                }`}
              >
                {dialog.mode === 'password' ? (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : dialog.danger ? (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>
              <div className={styles.textContent}>
                <h3 id="df-dialog-title" className={styles.title}>
                  {dialog.title}
                </h3>
                <p className={styles.message}>{dialog.message}</p>

                {dialog.mode === 'password' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleClose(true);
                    }}
                  >
                    <div className={styles.passwordFieldWrapper}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`${styles.passwordInput} ${
                          passwordError ? styles.passwordInputError : ''
                        }`}
                        value={passwordValue}
                        onChange={(e) => {
                          setPasswordValue(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder="Enter your current password..."
                        autoFocus
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggleBtn}
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordError && (
                      <div className={styles.passwordErrorHint}>{passwordError}</div>
                    )}
                  </form>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              {(dialog.mode === 'confirm' || dialog.mode === 'password') && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => handleClose(false)}
                >
                  {dialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                className={`${styles.confirmBtn} ${
                  dialog.danger ? styles.confirmDanger : styles.confirmPrimary
                }`}
                onClick={() => handleClose(true)}
                autoFocus={dialog.mode !== 'password'}
              >
                {dialog.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
}
