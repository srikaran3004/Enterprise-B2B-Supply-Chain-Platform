export const environment = {
  production: false,
  gatewayUrl:         '',
  identityServiceUrl: 'http://localhost:5002',
  catalogServiceUrl:  'http://localhost:5004',
  orderServiceUrl:    'http://localhost:5006',
  logisticsServiceUrl:'http://localhost:5008',
  paymentServiceUrl:  'http://localhost:5010',
  notificationServiceUrl: 'http://localhost:5012',
  aiServiceUrl:           'http://localhost:5000',   // Ocelot gateway → Python AI on :8000
  useDirect: false
};
