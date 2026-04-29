/**
 * StepInputForm Component
 *
 * Reusable form component for workflow step inputs.
 * Handles various input types dynamically based on configuration.
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

export interface InputFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'number' | 'slider' | 'radio' | 'date' | 'multi-select';
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  placeholder?: string;
  condition?: (values: any) => boolean;
  min?: number;
  max?: number;
  step?: number;
}

interface StepInputFormProps {
  fields: InputFieldConfig[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors?: Record<string, string>;
}

export const StepInputForm: React.FC<StepInputFormProps> = ({
  fields,
  values,
  onChange,
  errors = {}
}) => {
  const renderField = (field: InputFieldConfig) => {
    // Check condition
    if (field.condition && !field.condition(values)) {
      return null;
    }

    const value = values[field.name] ?? field.default;
    const error = errors[field.name];

    const baseClasses = error ? 'border-red-500' : '';

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={baseClasses}
              min={field.min}
              max={field.max}
              step={field.step}
            />
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={baseClasses}
              rows={4}
            />
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value || ''} onValueChange={(val) => onChange(field.name, val)}>
              <SelectTrigger className={baseClasses}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={value || false}
                onCheckedChange={(checked) => onChange(field.name, checked)}
              />
              <Label htmlFor={field.name} className="cursor-pointer">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            {field.description && (
              <p className="text-sm text-gray-500 ml-6">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500 ml-6">{error}</p>}
          </div>
        );

      case 'slider':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <span className="text-sm font-medium">{value ?? field.default}</span>
            </div>
            <Slider
              id={field.name}
              value={[value ?? field.default ?? field.min ?? 0]}
              onValueChange={(vals) => onChange(field.name, vals[0])}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              className="w-full"
            />
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.name}-${option.value}`}
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`${field.name}-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => renderField(field))}
    </div>
  );
};
