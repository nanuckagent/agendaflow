/**
 * Color utilities for workspace branding
 */

interface WorkspaceColors {
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
}

export function validateHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join('')
    .toUpperCase()}`;
}

export function applyWorkspaceTheme(colors: WorkspaceColors): void {
  const root = document.documentElement;

  // Validate colors
  if (!validateHexColor(colors.primaryColor)) {
    console.warn('Invalid primary color:', colors.primaryColor);
    return;
  }

  if (!validateHexColor(colors.sidebarColor)) {
    console.warn('Invalid sidebar color:', colors.sidebarColor);
    return;
  }

  if (!validateHexColor(colors.accentColor)) {
    console.warn('Invalid accent color:', colors.accentColor);
    return;
  }

  // Convert hex to RGB and set CSS variables
  const primaryRgb = hexToRgb(colors.primaryColor);
  const sidebarRgb = hexToRgb(colors.sidebarColor);
  const accentRgb = hexToRgb(colors.accentColor);

  if (primaryRgb) {
    root.style.setProperty(
      '--workspace-primary',
      `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`
    );
  }

  if (sidebarRgb) {
    root.style.setProperty(
      '--workspace-sidebar',
      `${sidebarRgb.r}, ${sidebarRgb.g}, ${sidebarRgb.b}`
    );
  }

  if (accentRgb) {
    root.style.setProperty(
      '--workspace-accent',
      `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`
    );
  }
}

export function resetWorkspaceTheme(): void {
  const root = document.documentElement;
  root.style.removeProperty('--workspace-primary');
  root.style.removeProperty('--workspace-sidebar');
  root.style.removeProperty('--workspace-accent');
}
