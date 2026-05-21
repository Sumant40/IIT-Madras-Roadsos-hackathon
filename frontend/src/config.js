export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const ACCIDENT_TYPES = ['hospital', 'ambulance', 'police', 'towing']

export const SERVICE_SECTIONS = [
  { type: 'hospital', label: 'Trauma / Hospital', color: '#ef4444' },
  { type: 'ambulance', label: 'Ambulance', color: '#ef4444' },
  { type: 'police', label: 'Police', color: '#2563eb' },
  { type: 'towing', label: 'Tow Truck', color: '#6b7280' },
]
