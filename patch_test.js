const fs = require('fs');
let content = fs.readFileSync('app.test.js', 'utf8');

// The require('./app.js') triggers startApp() which relies on DOM.
// Let's set a global flag in jest before require
content = `window.appInitialized = true;
` + content;

fs.writeFileSync('app.test.js', content);
