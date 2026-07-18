const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname));

files.forEach(file => {
  if (file.endsWith('storage.js') || file.endsWith('replace_script.js')) return; 
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('localStorage')) {
    const fileDir = path.dirname(file);
    let relativePath = path.relative(fileDir, path.join(__dirname, 'utils', 'storage.js'));
    relativePath = relativePath.replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    relativePath = relativePath.replace(/\.js$/, '');

    const importStatement = `import storage from '${relativePath}'`;
    
    if (!content.includes(`import storage from`)) {
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
      } else {
        lines.unshift(importStatement);
      }
      content = lines.join('\n');
    }
    
    content = content.replace(/\blocalStorage\./g, 'storage.');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Processed', file);
  }
});
