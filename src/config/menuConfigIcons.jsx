import React from 'react'

// Custom SVG: Admin Controllers (three horizontal bars with sliders/knobs)
export const AdminControllersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="16" y1="4" x2="16" y2="8" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <line x1="16" y1="16" x2="16" y2="20" />
  </svg>
)

// Custom SVG: Schema Checklist (three rows: checkmark + short line)
export const SchemaChecklistIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 9L5 6L8 9" />
    <line x1="12" y1="6" x2="20" y2="6" />
    <path d="M2 15L5 12L8 15" />
    <line x1="12" y1="12" x2="20" y2="12" />
    <path d="M2 21L5 18L8 21" />
    <line x1="12" y1="18" x2="20" y2="18" />
  </svg>
)
