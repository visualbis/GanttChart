const gulp = require('gulp');
const preprocess = require('gulp-preprocess');
const {ENVIRONMENT} = require('./buildType');
const fs = require('fs');
const path = require('path');
const pbiviz = require(`../pbiviz.json`);
const moment = require('moment');

const BUILD_DATE = moment().utcOffset('+05:30').format('DD MMM kk:mm');

const fullBuildNumber = String(pbiviz.visual.version);
const BUILD_NUMBER = ` (${BUILD_DATE} v${fullBuildNumber.substring(0, fullBuildNumber.length)})`;

pbiviz.visual.displayName = `xViz GanttChart${context.localBuild ? BUILD_NUMBER : ''}`;
fs.writeFileSync(path.join(__dirname, '../pbiviz.json'), JSON.stringify(pbiviz, null, 2));
