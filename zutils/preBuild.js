const gulp = require('gulp');
const preprocess = require('gulp-preprocess');
const { BUILD_TYPE, ENVIRONMENT } = require('./buildType');
const fs = require('fs');
const path = require('path');
const pbiviz = require(`../pbiviz.json`);
const moment = require('moment');
let srcDestination = 'src';

const context = {
    isMockLicense: isMockLicence,
    isNotMockLicense: !isMockLicence,
    isDevEnv: false,
    onlineLicence: false,
    localBuild: ENVIRONMENT === 'local'
};

const BUILD_DATE = moment().utcOffset('+05:30').format('DD MMM kk:mm');
const BUILD_NUMBER = `${BUILD_DATE} v${pbiviz.visual.version}`;
const devDefaults = require('./dev-defaults.json');
const serviceUrls = require('./serviceUrls');

const branchName = process.env.CIRCLE_BRANCH || '';

const COMMIT_MSG = process.env.COMMIT_MSG || '';
const isMockLicence = COMMIT_MSG.includes('mock') || process.env.MOCK_LICENCE;
console.log(COMMIT_MSG, ' , ', isMockLicence);
//Default context

// Build variables
let SUBSCRIPTION_ID = '';
let BUILD_ENV = '';
let PUBLIC_KEY = devDefaults.PUBLIC_KEY;
let SECRET_KEY = devDefaults.SECRET_KEY;
let LICENSE_URL = serviceUrls.PRODUCTION.LICENCE;
let SHOP_URL = serviceUrls.PRODUCTION.SHOP;
if (branchName === 'main') {
    // App source build
    BUILD_ENV = 'AppSource';
    LICENSE_URL = '';
    pbiviz.visual.displayName = `xViz GanttChart (${BUILD_NUMBER})`;
} else if (/^v[0-9]+(\.[0-9]+){2,3}$/.test(branchName) && !isMockLicence) {
    // Branch name like v1.0.0 for web store build
    BUILD_ENV = 'WebStore';
    PUBLIC_KEY = PUBLIC_KEY;
    SECRET_KEY = SECRET_KEY;
    pbiviz.visual.guid = `Web${pbiviz.visual.guid}`;
    // Below place holders will be replaced on build trigger from web store
    SUBSCRIPTION_ID = 'X__SUBSCRIPTION_ID__PLACEHOLDER__X';
    LICENSE_URL = 'X__SERVICE__URL__PLACEHOLDER__X';
    pbiviz.visual.displayName = `xViz GanttChart (${BUILD_NUMBER})`;
    pbiviz.assets.icon = `assets/web-store-icon.png`;
    context.onlineLicence = true;
} else {
    BUILD_ENV = isMockLicence ? 'MOCK' : 'QA';
    SUBSCRIPTION_ID = '';
    LICENSE_URL = '';
    pbiviz.visual.displayName = `xViz GanttChart ${isMockLicence ? 'MOCK' : 'QA'} (${BUILD_NUMBER})`;
    if (isMockLicence) pbiviz.visual.guid = `MOCK_${pbiviz.visual.guid}`;
}

// updating the pbiviz file
fs.writeFileSync(path.join(__dirname, '../pbiviz.json'), JSON.stringify(pbiviz, null, 2));
console.log(pbiviz.visual.guid, 'guid');
function updateBuildVariables() {
    const buildVariable = `
        // Auto-generated file, don't make any changes here, check preBuild.js file 
        export const BuildVariables = {
            BUILD_ENV: '${BUILD_ENV}',
            BUILD_DATE:'${BUILD_DATE}',
            VERSION: '${pbiviz.visual.version}',
            SUBSCRIPTION_ID: '${SUBSCRIPTION_ID}',
            PUBLIC_KEY: \`${PUBLIC_KEY}\`,
            SECRET_KEY: \`${SECRET_KEY}\`,
            LICENSE_URL: \`${LICENSE_URL}\`,
            SHOP_URL: \`${SHOP_URL}\`,
        }`;
    fs.writeFileSync(path.join(__dirname, '../BuildVariables.ts'), buildVariable);
}

/**
 * It creates a buildInfo.json file in the buildInfo folder with the following information:
 *
 * - VERSION: The version of the visual
 * - BUILD_NUMBER: The build number of the visual
 * - GUID: The GUID of the visual
 * - SUBSCRIPTION_ID: The subscription ID of the visual
 * - VISUAL_NAME: The name of the visual
 *
 * The buildInfo.json file is used by the Power BI Visuals Build Tools to create the visual's pbiviz
 * file
 */
function createBuildInfoJSON() {
    const visualName = pbiviz.visual.displayName.replace(':', '_');
    const buildInfo = {
        VERSION: pbiviz.visual.version,
        BUILD_NUMBER,
        GUID: pbiviz.visual.guid,
        SUBSCRIPTION_ID,
        VISUAL_NAME: visualName,
    };
    const dir = path.join(__dirname, '../buildInfo/');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    console.log(`buildInfo.json created`, 'success');
    // If buildDetails.json is not found, we are creating it and writing necessary details into it
    fs.writeFileSync(path.join(__dirname, `../buildInfo/buildDetails.json`), JSON.stringify(buildInfo, null, 4));
}

function preProcessFiles() {
    Object.keys(context).forEach((key) => {
        if (!context[key]) delete context[key];
    });

    gulp.src(path.join(__dirname, '../src/**/*.ts'))
        .pipe(preprocess({ context }))
        .pipe(gulp.dest(path.join(__dirname, `../src`)));
}

console.log('PreBuild Process Started', 'info');
preProcessFiles();
updateBuildVariables();
createBuildInfoJSON();

console.log(`PreBuild Process end`, 'success');
