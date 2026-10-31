// Quick diagnostic: simulates exactly how the main server loads emailService
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('--- ENV CHECK ---');
console.log('SMTP_HOST :', process.env.SMTP_HOST || '(MISSING)');
console.log('SMTP_PORT :', process.env.SMTP_PORT || '(MISSING)');
console.log('SMTP_USER :', process.env.SMTP_USER || '(MISSING)');
console.log('SMTP_PASS :', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : '(MISSING)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '(MISSING)');
console.log('');

// Now load the actual emailService the same way the server does
const emailService = require('../services/emailService');

console.log('--- SENDING TEST EMAIL via emailService ---');
emailService.sendVerificationEmail(
  process.env.SMTP_USER,
  'testuser',
  'fake-token-123'
).then(info => {
  console.log('Result:', JSON.stringify(info));
}).catch(err => {
  console.error('ERROR:', err.message);
  console.error('Code:', err.code);
  console.error('Response:', err.response);
});

