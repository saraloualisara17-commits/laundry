try {
  const i18next = require('i18next');
  const reactI18next = require('react-i18next');
  console.log('i18next version:', i18next.version);
  console.log('react-i18next version:', reactI18next.version);
  console.log('Both modules resolved successfully!');
} catch (e) {
  console.error('Resolution failed:', e.message);
}
