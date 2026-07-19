'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
          '--width': '320px',
          // Reemplaza los verdes/rojos default de Sonner por la identidad del sistema (dorado 3SF).
          '--success-bg': 'var(--card)',
          '--success-border': 'var(--primary)',
          '--success-text': 'var(--primary)',
          '--error-bg': 'var(--card)',
          '--error-border': 'var(--destructive)',
          '--error-text': 'var(--destructive-foreground)',
          '--warning-bg': 'var(--card)',
          '--warning-border': 'var(--chart-4)',
          '--warning-text': 'var(--chart-4)',
          '--info-bg': 'var(--card)',
          '--info-border': 'var(--border)',
          '--info-text': 'var(--foreground)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
