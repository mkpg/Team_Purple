const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Login.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace {getOfflineText("text")} with just text (for JSX text content)
content = content.replace(/\{getOfflineText\("([^"]*)"\)\}/g, '$1');

// Replace getOfflineText("text") with "text" (for attribute values like placeholder={getOfflineText("...")})
content = content.replace(/getOfflineText\("([^"]*)"\)/g, '"$1"');

fs.writeFileSync(filePath, content);
console.log('Done - removed all getOfflineText wrappers');
