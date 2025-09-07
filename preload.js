const fs = require('fs');
const path = require('path');

const featuresFilePath = path.join(__dirname, 'features.cjs');
const featuresCode = fs.readFileSync(featuresFilePath, 'utf8');

window.featuresCode = featuresCode;
