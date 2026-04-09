export const TRACKING_STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Placed:            { bg: '#eff6ff', text: '#1d4ed8', icon: 'shopping-bag' },
  OnHold:            { bg: '#fffbeb', text: '#92400e', icon: 'pause-circle' },
  Processing:        { bg: '#eef2ff', text: '#3730a3', icon: 'settings' },
  ReadyForDispatch:  { bg: '#f0fdf4', text: '#166534', icon: 'package-check' },
  AgentAssigned:     { bg: '#f0f9ff', text: '#075985', icon: 'user-check' },
  PickedUp:          { bg: '#faf5ff', text: '#6b21a8', icon: 'package' },
  InTransit:         { bg: '#ecfeff', text: '#164e63', icon: 'truck' },
  OutForDelivery:    { bg: '#fff7ed', text: '#9a3412', icon: 'map-pin' },
  Delivered:         { bg: '#f0fdf4', text: '#14532d', icon: 'check-circle' },
  Cancelled:         { bg: '#fef2f2', text: '#991b1b', icon: 'x-circle' },
  ReturnRequested:   { bg: '#fff7ed', text: '#9a3412', icon: 'rotate-ccw' },
  Closed:            { bg: '#f8fafc', text: '#475569', icon: 'archive' },
};
