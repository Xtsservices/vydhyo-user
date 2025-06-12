const fs = require('fs');
const path = require('path');

function convertImageToBase64(filePath) {
  const resolvedPath = path.resolve(filePath);
  const fileData = fs.readFileSync(resolvedPath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mimeType = `image/${ext}`;
  const base64 = fileData.toString('base64');
  return { mimeType, base64 };
}

module.exports = {
  convertImageToBase64,
};
