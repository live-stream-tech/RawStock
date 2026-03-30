// このスクリプトで全ファイルの薄い色を濃い色に一括置換します
const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /text-\[#6B7A8F\]/g, to: 'text-[#374151]' },
  { from: /text-\[#8B98A8\]/g, to: 'text-[#374151]' },
  { from: /text-\[#5A6878\]/g, to: 'text-[#374151]' },
  { from: /text-\[#4A5568\]/g, to: 'text-[#374151]' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      processFile(filePath);
    }
  });
}

walkDir('./vite-app/app');
console.log('✓ All colors updated!');
