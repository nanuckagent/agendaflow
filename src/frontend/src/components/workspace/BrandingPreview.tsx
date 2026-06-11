/**
 * Workspace branding color picker and preview component
 */

import { useState } from 'react';
import { validateHexColor } from '@/lib/colors.js';

interface BrandingPreviewProps {
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoUrl?: string;
  onPrimaryChange: (color: string) => void;
  onSidebarChange: (color: string) => void;
  onAccentChange: (color: string) => void;
  onLogoChange?: (url: string) => void;
}

export function BrandingPreview({
  primaryColor,
  sidebarColor,
  accentColor,
  logoUrl,
  onPrimaryChange,
  onSidebarChange,
  onAccentChange,
  onLogoChange,
}: BrandingPreviewProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleColorChange = (
    color: string,
    onChange: (color: string) => void,
    field: string
  ) => {
    if (!validateHexColor(color)) {
      setErrors((prev) => ({ ...prev, [field]: 'Invalid hex color' }));
      return;
    }
    setErrors((prev) => ({ ...prev, [field]: '' }));
    onChange(color);
  };

  const ColorPicker = ({
    label,
    value,
    onChange,
    field,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    field: string;
  }) => (
    <div>
      <label className="label-base">{label}</label>
      <div className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorChange(e.target.value, onChange, field)}
          className="w-20 h-10 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleColorChange(e.target.value, onChange, field)}
          placeholder="#000000"
          maxLength={7}
          className="input-base flex-1"
        />
      </div>
      {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Color pickers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Colors</h3>

          <ColorPicker
            label="Primary Color"
            value={primaryColor}
            onChange={onPrimaryChange}
            field="primary"
          />

          <ColorPicker
            label="Sidebar Color"
            value={sidebarColor}
            onChange={onSidebarChange}
            field="sidebar"
          />

          <ColorPicker
            label="Accent Color"
            value={accentColor}
            onChange={onAccentChange}
            field="accent"
          />

          {/* Logo upload */}
          <div>
            <label className="label-base">Logo</label>
            {logoUrl && (
              <div className="mb-3">
                <img
                  src={logoUrl}
                  alt="Workspace logo"
                  className="h-12 object-contain"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    onLogoChange?.(event.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>

          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-4 text-white"
            >
              <h4 className="font-semibold">Preview Header</h4>
            </div>

            {/* Sidebar preview */}
            <div className="flex h-40 bg-gray-50">
              <div
                style={{ backgroundColor: sidebarColor }}
                className="w-20 p-2 space-y-2"
              >
                <div className="h-2 bg-gray-600 rounded opacity-50" />
                <div className="h-2 bg-gray-600 rounded opacity-50" />
              </div>
              <div className="flex-1 p-4 space-y-3">
                <div className="h-8 rounded" style={{ backgroundColor: primaryColor }} />
                <div className="h-6 rounded" style={{ backgroundColor: accentColor }} />
              </div>
            </div>

            {/* Button preview */}
            <div className="p-4 space-y-2">
              <button
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white py-2 rounded-lg font-medium"
              >
                Primary Button
              </button>
              <button
                style={{ borderColor: accentColor, color: accentColor }}
                className="w-full border-2 py-2 rounded-lg font-medium"
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
