const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const simpleGit = require('simple-git');
const logger = require('./logger');

let git = null;
const REPO_NAME = 'GanttStoreBuild';
const BUILD_REPO_PATH = path.join(__dirname, `./${REPO_NAME}`);

/**
 * It reads the `dist` folder, finds the file that matches the GUID of the visual, and renames it to
 * the name of the visual
 */
async function renameBuilds() {
    const buildDetails = require('../buildInfo/buildDetails.json');
    const dist = path.join(__dirname, '../dist/');
    // const guids = Object.keys(fileNameMap);

    if (!fs.existsSync(dist)) {
        return;
    }
    fs.readdirSync(dist).forEach(async (oldFileName) => {
        // const matchingGuid = guids.find((guid) => oldFileName.includes(guid));
        // if (!matchingGuid) {
        //     logger(`Invalid file: ${oldFileName}`, 'warn');
        //     return;
        // }
        const newFileName = `${buildDetails.VISUAL_NAME}.pbiviz`;
        const newFilePath = path.join(dist, newFileName);
        fs.renameSync(path.join(dist, oldFileName), newFilePath);
        logger(`File renamed from: ${oldFileName} to: ${newFileName} `, 'success');
    });
}

/**
 * It creates a tag with the version number in the pbiviz.json file and pushes it to the remote
 * repository
 */
async function createTag() {
    const pbiviz = require('../pbiviz.json');
    let tagName = `v${pbiviz.visual.version}`;

    await git.add('./*').commit(`Commit for version ${tagName}`);
    await git.tag(['-f', tagName, '-m', 'NewVersionCreation']);
    await git.push('origin', tagName, ['-f']);
    logger(`Tag Published ${tagName}`, 'success');
}

/**
 * It checks if the dist folder exists, if it does, it looks for a pbiviz file, if it finds one, it
 * unzips it to the buildFiles folder
 */
function publishBuild() {
    const dist = path.join(__dirname, '../dist/');
    if (!fs.existsSync(dist)) {
        return;
    }
    const file = fs.readdirSync(dist).find((fileName) => path.extname(fileName) === '.pbiviz');
    if (!file) {
        logger('No pbiviz file found', 'warn');
        return;
    }
    const filePath = path.join(dist, file);
    const toPath = path.join(BUILD_REPO_PATH, `./buildFiles`);
    if (fs.existsSync(toPath)) {
        fs.rmdirSync(toPath, { recursive: true });
    }
    fs.mkdirSync(toPath);
    logger(`Unzipping file ${filePath}`, 'info');
    return unzipper.Open.file(filePath).then((d) => d.extract({ path: toPath }));
}

/**
 * It initializes the git repository.
 */
async function iniGit() {
    if (fs.existsSync(BUILD_REPO_PATH)) {
        fs.rmdirSync(BUILD_REPO_PATH, { recursive: true });
    }

    process.env.GIT_TOKEN;
    await simpleGit(__dirname).clone(`https://${process.env.GIT_TOKEN}@github.com/visualbis/${REPO_NAME}.git`);

    const options = {
        baseDir: BUILD_REPO_PATH,
        binary: 'git',
        maxConcurrentProcesses: 6,
    };
    git = simpleGit(options).addConfig('user.name', 'nsdevaraj').addConfig('user.email', 'nsdevaraj@gmail.com');
    logger('Git Initialized', 'info');
}

async function init() {
    logger('PublishBuilds Process Started', 'info');
    // if (process.env.PUBLISH_BUILDS) {
    await iniGit();
    publishBuild().then(async () => {
        await createTag();
        renameBuilds();
    });
    // } else {
    //     logger('PublishBuilds Process Skipped', 'info');
    //     renameBuilds();
    // }
}

init();
