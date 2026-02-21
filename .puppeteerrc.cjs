const { join } = require('path');

module.exports = {
  // यह क्रोम को तुम्हारे प्रोजेक्ट के अंदर ही डाउनलोड और सेव करेगा
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};