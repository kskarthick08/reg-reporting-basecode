/**
 * useFormState Hook
 *
 * Generic form state management hook with validation and change handling.
 */

import { useState, useCallback } from 'react';

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched?: boolean;
}

export type FormState<T extends Record<string, any>> = {
  [K in keyof T]: FormField<T[K]>;
};

export const useFormState = <T extends Record<string, any>>(
  initialValues: T,
  validators?: Partial<Record<keyof T, (value: any) => string | undefined>>
) => {
  const [formState, setFormState] = useState<FormState<T>>(() =>
    Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = {
        value: initialValues[key as keyof T],
        error: undefined,
        touched: false
      };
      return acc;
    }, {} as FormState<T>)
  );

  const setValue = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        error: validators?.[field]?.(value),
        touched: true
      }
    }));
  }, [validators]);

  const setValues = useCallback((values: Partial<T>) => {
    setFormState(prev => {
      const updated = { ...prev };
      Object.keys(values).forEach(key => {
        const field = key as keyof T;
        updated[field] = {
          ...prev[field],
          value: values[field]!,
          error: validators?.[field]?.(values[field]),
          touched: true
        };
      });
      return updated;
    });
  }, [validators]);

  const setError = useCallback(<K extends keyof T>(
    field: K,
    error: string | undefined
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: { ...prev[field], error }
    }));
  }, []);

  const reset = useCallback((newValues?: Partial<T>) => {
    setFormState(
      Object.keys(initialValues).reduce((acc, key) => {
        const field = key as keyof T;
        acc[field] = {
          value: newValues?.[field] ?? initialValues[field],
          error: undefined,
          touched: false
        };
        return acc;
      }, {} as FormState<T>)
    );
  }, [initialValues]);

  const validate = useCallback((): boolean => {
    if (!validators) return true;

    let isValid = true;
    const updated = { ...formState };

    Object.keys(validators).forEach(key => {
      const field = key as keyof T;
      const validator = validators[field];
      if (validator) {
        const error = validator(formState[field].value);
        if (error) {
          isValid = false;
          updated[field] = { ...updated[field], error, touched: true };
        }
      }
    });

    if (!isValid) {
      setFormState(updated);
    }

    return isValid;
  }, [formState, validators]);

  const getValues = useCallback((): T => {
    return Object.keys(formState).reduce((acc, key) => {
      acc[key as keyof T] = formState[key as keyof T].value;
      return acc;
    }, {} as T);
  }, [formState]);

  const hasErrors = useCallback((): boolean => {
    return Object.values(formState).some((field: any) => field.error);
  }, [formState]);

  return {
    formState,
    setValue,
    setValues,
    setError,
    reset,
    validate,
    getValues,
    hasErrors
  };
};
