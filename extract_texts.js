const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      filelist.push(dirFile);
    }
  }
  return filelist;
};

const files = walkSync('./laundry_front_V2/src').filter(f => f.endsWith('.jsx'));
let allTexts = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  // Match text content outside of tags and brackets
  // Simplified logic to find hardcoded text
  const tagMatches = content.match(/>([^<{]+)</g);
  if (tagMatches) {
    tagMatches.forEach(m => {
      let text = m.substring(1, m.length - 1).trim();
      if (
        text.length > 2 && 
        /[A-Za-zÀ-ÿ]/.test(text) && 
        !text.includes('t(') &&
        !text.startsWith('//') &&
        !text.startsWith('/*')
      ) {
        allTexts.add(text);
      }
    });
  }
  
  // also catch placeholder="Hardcoded text"
  const placeholderMatches = content.match(/placeholder=["']([^"'{]+)["']/g);
  if (placeholderMatches) {
      placeholderMatches.forEach(m => {
          let text = m.replace(/placeholder=["']/, '').slice(0, -1).trim();
          if (/[A-Za-zÀ-ÿ]/.test(text)) {
              allTexts.add(text);
          }
      });
  }
});

fs.writeFileSync('extracted_texts.json', JSON.stringify(Array.from(allTexts), null, 2));
console.log("Extracted " + allTexts.size + " unique strings.");
