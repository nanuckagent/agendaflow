/**
 * Workspace branding color picker and preview component
 */

import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
    setError(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleTextChange = (raw: string) => {
    const v = raw.startsWith('#') || raw === '' ? raw : `#${raw}`;
    setText(v);
    if (validateHexColor(v)) {
      setError(false);
      onChange(v);
    } else {
      setError(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="label-base">{label}</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ backgroundColor: value }}
          className="w-20 h-10 rounded-lg cursor-pointer border border-gray-300 shadow-sm"
          aria-label={label}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="input-base flex-1 font-mono"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-2 p-3 bg-white rounded-xl shadow-lg border border-gray-200">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{t('settings.invalidColor')}</p>}
    </div>
  );
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
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Color pickers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.colorsTitle')}</h3>

          <ColorField
            label={t('settings.primaryColor')}
            value={primaryColor}
            onChange={onPrimaryChange}
          />

          <ColorField
            label={t('settings.sidebarColor')}
            value={sidebarColor}
            onChange={onSidebarChange}
          />

          <ColorField
            label={t('settings.accentColor')}
            value={accentColor}
            onChange={onAccentChange}
          />

          {/* Logo upload */}
          <div>
            <label className="label-base">{t('settings.logoLabel')}</label>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.previewTitle')}</h3>

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
                <div className="h-2 bg-white rounded opacity-30" />
                <div className="h-2 bg-white rounded opacity-30" />
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
