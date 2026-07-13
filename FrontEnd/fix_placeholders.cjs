const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Login.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace placeholder=some text with placeholder="some text"
// We need to be careful not to replace placeholder="something" or placeholder={something}
content = content.replace(/placeholder=([^"'{>\n][^>\n]*)(?=\s*\n|\s*[a-zA-Z]+={|\s*\/>|\s*>)/g, 'placeholder="$1"');

// Fix specific known cases
content = content.replace(/placeholder=Eleanor Vance/g, 'placeholder="Eleanor Vance"');
content = content.replace(/placeholder=eleanor_vance/g, 'placeholder="eleanor_vance"');
content = content.replace(/placeholder=eleanor@vance\.com/g, 'placeholder="eleanor@vance.com"');

// Let's just do a simpler search and replace for all lines containing `placeholder=` without quotes
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('placeholder=') && !line.includes('placeholder="') && !line.includes('placeholder={')) {
    return line.replace(/placeholder=(.*)/, (match, p1) => {
      // p1 is the rest of the string, which might include trailing spaces or JSX tags
      // Let's just wrap everything up to the end of the value (usually the whole rest of the line before a newline)
      // Actually, since these are formatted line by line like:
      // placeholder=Eleanor Vance
      // Let's just capture the whole value.
      let val = p1.trim();
      return `placeholder="${val}"`;
    });
  }
  return line;
});

fs.writeFileSync(filePath, fixedLines.join('\n'));
console.log('Done fixing placeholders');
