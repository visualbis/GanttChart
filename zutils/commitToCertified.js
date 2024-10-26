const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
let git = null;
const CERTIFICATION_TARGET_BRANCH = 'C3';
const REPO_URL = `https://${process.env.GIT_TOKEN}@github.com/devpowerpro/GanttChart.git`;
const BUILD_REPO_PATH = path.join(__dirname, './GanttChart');
const PACKAGE_ROOT = path.join(__dirname, './');
const REPO_ROOT = path.join(__dirname, `./`);
const DEPS_VERSION = require('./lerna.json').version;

const foldersToCopy = ['src', 'style', '.github', 'assets'];
const filesToCopy = [
    'package.json',
    'package-lock.json',
    'pbiviz.json',
    'capabilities.json',
    'README.MD',
    'licence.ts',
    'tsconfigDev.json',
    'tslint.json',
    'tsconfig.json',
    '.gitignore',
    'BuildVariables.ts',
    '.npmrc',
    'webpack.config.js',
    'PowerBICustomVisualTest_public.pfx',
    `assets/icon.png`,
    '.eslintrc.json',
    'backup.json',
    '.eslintignore',
];

async function iniGit() {
    console.log(`Init Git repo`, 'info');
    if (fs.existsSync(BUILD_REPO_PATH)) {
        fs.rmdirSync(BUILD_REPO_PATH, { recursive: true });
    }
    fs.mkdirSync(BUILD_REPO_PATH);
    console.log('Cloning repo ' + REPO_URL, 'info');
    await simpleGit(__dirname).clone(REPO_URL, `./GanttChart`, ['--depth=1']);
    console.log('Repo cloned', 'success');
    const options = {
        baseDir: BUILD_REPO_PATH,
        binary: 'git',
        maxConcurrentProcesses: 6,
    };
    git = simpleGit(options).addConfig('user.name', 'Devaraj').addConfig('user.email', 'nsdevaraj@gmail.com');
    try {
        console.log(`Deleting branch`, 'info');
        await git.push(['origin', '--delete', CERTIFICATION_TARGET_BRANCH]);
    } catch (e) {
        console.log(e);
    }
    console.log('Branch deleted', 'success');
}

function removeFoldersAndFiles() {
    console.log(`Removing folders and files`, 'info');
    fs.readdirSync(BUILD_REPO_PATH).forEach((file) => {
        if (file.includes('git')) {
            return;
        }
        fs.removeSync(path.join(BUILD_REPO_PATH, file));
    });
    console.log(`Folders and files removed`, 'success');
}

function copyCodeFoldersAndFiles() {
    fs.mkdirSync(path.join(BUILD_REPO_PATH, './assets'));

    foldersToCopy.forEach((folder) => {
        console.log(`Copying folder ${folder}`, 'info');
        fs.copySync(path.join(PACKAGE_ROOT, `./${folder}`), path.join(BUILD_REPO_PATH, `./${folder}`));
    });

    filesToCopy.forEach((file) => {
        console.log(`Copying file ${file}`, 'info');
        if (fs.existsSync(path.join(PACKAGE_ROOT, file))) {
            console.log(`Copying file from ${PACKAGE_ROOT}`, 'info');
            fs.copyFileSync(path.join(PACKAGE_ROOT, file), path.join(BUILD_REPO_PATH, file));
        } else if (fs.existsSync(path.join(REPO_ROOT, `./${file}`))) {
            console.log(`Copying file from ${REPO_ROOT}`, 'info');
            fs.copyFileSync(path.join(REPO_ROOT, `./${file}`), path.join(BUILD_REPO_PATH, file));
        }
    });
    // Copy package-lock.json
    const packageLockJson = require('../backup.json');
    fs.writeFileSync(path.join(BUILD_REPO_PATH, `package-lock.json`), JSON.stringify(packageLockJson, null, 2));

    console.log(`Config files copied`, 'success');
}

function createNPMRC() {
    const readme = `//registry.npmjs.org/:_authToken=${
        process.env.NPM_TOKEN || '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'
    }
legacy-peer-deps=true`;
    fs.writeFileSync(path.join(BUILD_REPO_PATH, './.npmrc'), readme);
    console.log(`NPMRC created`, 'success');
}

function createReadMe() {
    const readme = `# GanttChart
Run Dev:
\`\`\`bash
npm start
\`\`\`
Package:
\`\`\`bash
npm run build
\`\`\`
`;
    fs.writeFileSync(path.join(BUILD_REPO_PATH, './README.MD'), readme);
}

async function commitFiles() {
    console.log(`Commiting files`, 'info');
    await git
        .add('./*')
        .commit('Commit files to certification repo')
        .push(['origin', `HEAD:${CERTIFICATION_TARGET_BRANCH}`, `--force`]);
    console.log(`Commit done`, 'success');
}

function updatePackageJson() {
    const packageJson = require(path.join(BUILD_REPO_PATH, './package.json'));
    packageJson.scripts = {
        audit: 'npm audit --audit-level=moderate --omit=dev',
        eslint: 'npx eslint . --ext .js,.jsx,.ts,.tsx',
        lint: 'tslint -c tslint.json -p tsconfig.json',
        dist: 'cross-env NODE_ENV=production webpack --env=production --progress',
        build: 'npm run dist',
        package: 'npm run dist',
        start: 'webpack-dev-server',
    };
    delete packageJson.devDependencies['gulp'];
    delete packageJson.devDependencies['gulp-preprocess'];
    packageJson.dependencies = {
        ...packageJson.dependencies,
        '@visualbi/performance-flow-library': `${DEPS_VERSION}`,
    };

    fs.writeFileSync(path.join(BUILD_REPO_PATH, './package.json'), JSON.stringify(packageJson, null, 2));
}

async function init() {
    await iniGit();
    removeFoldersAndFiles();
    copyCodeFoldersAndFiles();
    updatePackageJson();
    updateCapabilities();
    createReadMe();
    createNPMRC();
    await commitFiles();
}

if (process.env.CIRCLE_BRANCH === 'main') {
    init();
} else {
    console.log(`Not running the certification script `, 'info');
}



/* eslint-disable powerbi-visuals/non-literal-require */
/* eslint-disable max-lines-per-function */
/* eslint-disable no-inner-declarations */
/* eslint-disable powerbi-visuals/non-literal-fs-path */
const fs = require('fs-extra')
const path = require('path');
const simpleGit = require('simple-git');
const logger = require('./logger');
const objectParser = require('json-templater/object');
const merge = require('lodash.merge');
const moment = require('moment');

async function initVisualCodeCommit(componentName = '', buildType = '') {
    const CERTIFICATION_TARGET_BRANCH = 'C3';
    const BUILD_REPOS_ROOT = path.join(__dirname, './TEMP');
    const DEFAULT_FILES_PATH = path.join(__dirname, './defaultFiles');
    const ROOT_PATH = path.resolve(__dirname, '../');
    const CONFIG_FOLDERS = ['.github'];
    const FILES_TO_COPY = ['package.json',
        'pbiviz.json',
        'capabilities.json',
        'README.MD',
        'licence.ts',
        'tsconfig.json',
        'tslint.json',
        '.eslintrc.js',
        '.eslintignore',
        '.gitignore',
        '.npmrc',
        'PowerBICustomVisualTest_public.pfx',
        'backup.json'
    ];
    const FOLDERS_TO_COPY = ['src', 'assets', 'style','externalLib'];
    if (fs.existsSync(BUILD_REPOS_ROOT)) {
        fs.rmdirSync(BUILD_REPOS_ROOT, { recursive: true })
    }
    fs.mkdirSync(BUILD_REPOS_ROOT);
    
   
        const componentName = "GanttChart";
        const BUILD_REPO_PATH = path.join(BUILD_REPOS_ROOT, `./${componentName}`);
        const componentRootPath = path.join(ROOT_PATH, `./${componentName}`);
        let git = null;
        async function iniGit() {
            fs.mkdirSync(BUILD_REPO_PATH);
            try {
                logger(`Cloning Git repo ${componentName}`, "info");
                await simpleGit(__dirname).clone(`https://${process.env.GIT_TOKEN}@github.com/devpowerpro/${componentName}.git`, BUILD_REPO_PATH, ['--depth=1']);
            } catch (e) {
                console.log(e);
                logger(`Failed to clone Git repo ${componentName}`, "error");
                return;
            }
            const options = {
                baseDir: BUILD_REPO_PATH,
                binary: 'git',
                maxConcurrentProcesses: 6,
            };

            try {
                logger(`Init Git repo ${componentName}`, "info");
                git = simpleGit(options)
                    .addConfig('user.name', 'nsdevaraj')
                    .addConfig('user.email', 'nsdevaraj@gmail.com')
                logger(`Deleting branch ${componentName}`, "info");
                await git.push(['origin', '--delete', CERTIFICATION_TARGET_BRANCH]);
            }
            catch (e) {
                console.log(e);
            }
            logger('Branch deleted', "success");
        }

        async function commitFiles() {
            logger(`Commiting files ${componentName}`, "info");
            await git.add('./*')
                .commit(`Commit for Certification`)
                .push(['origin', `HEAD:${CERTIFICATION_TARGET_BRANCH}`, `--force`]);
            logger(`Commit done`, "success");
        }
        function removeFoldersAndFiles() {
            logger(`Removing folders and files ${componentName}`, "info");
            fs.readdirSync(BUILD_REPO_PATH).forEach(file => {
                if (file === '.git') {
                    return;
                }
                fs.removeSync(path.join(BUILD_REPO_PATH, file));
            })
        }
        function editJsonFile(srcFilePath) {
            try {
                // Step 1: Read the copied JSON file's content
                const data = fs.readFileSync(srcFilePath, 'utf-8');
                const jsonData =  JSON.parse(data);
                const BUILD_DATE = moment().utcOffset('+05:30').format('DD MMM kk:mm');
                // Step 2: Edit the JSON data (example: add a new key-value pair)
                jsonData.visual.displayName = `${jsonData.visual.displayName}${`(${BUILD_DATE})`}`; // Modify the JSON data as needed
                logger('Display Name:',  jsonData.visual.displayName );
                // Step 3: Convert the edited data back to JSON format (stringify)
                const updatedJson = JSON.stringify(jsonData, null, 2); // Pretty print JSON with 2-space indentation
        
                // Step 4: Write the edited content back to the destination JSON file
                fs.writeFileSync(srcFilePath, updatedJson, 'utf-8');
                logger('Build date updated successfully.');
            } catch (error) {
                console.error('Error during file copy, edit, and save:', error);
            }
        }
        function copyCodeFolders() {
            logger(`Copying code folders ${componentName}`, "info");
            FILES_TO_COPY.forEach(file => {
                logger(`Copying file ${file}`, "info");
                let srcPath = path.join(componentRootPath, file);
                if (!fs.existsSync(srcPath)) {
                    srcPath = path.join(DEFAULT_FILES_PATH, file);
                }
                if (!fs.existsSync(srcPath)) {
                    logger(`File ${file} not found`, "error");
                    return;
                }
                if(file=='backup.json') file='package-lock.json'
                let destPath = path.join(BUILD_REPO_PATH, file);
               
                fs.copySync(srcPath, destPath);
                if(buildType === "internal" && file=='pbiviz.json')
                    editJsonFile(destPath);
                
            }); 
            FOLDERS_TO_COPY.forEach(folder => {
                logger(`Copying folder ${folder}`, "info");
                let srcPath = path.join(componentRootPath, folder);
                if (!fs.existsSync(srcPath)) {
                    srcPath = path.join(DEFAULT_FILES_PATH, folder);
                }
                if (!fs.existsSync(srcPath)) {
                    logger(`Folder ${folder} not found`, "error");
                    return;
                }
                let destPath = path.join(BUILD_REPO_PATH, folder);
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath);
                }
                fs.copySync(srcPath, destPath);
            });
            logger(`Code folders copied`, "success");
        }
        function copyConfigFiles() {
            logger(`Copying config files ${componentName}`, "info");
            CONFIG_FOLDERS.forEach(folder => {
                const srcPath = path.join(ROOT_PATH, folder);
                if (!fs.existsSync(srcPath)) {
                    return;
                }
                const destPath = path.join(BUILD_REPO_PATH, folder);
                if (!fs.emptyDirSync(destPath)) {
                    fs.mkdirSync(destPath);
                }
                fs.copySync(srcPath, destPath, { overwrite: true });
            })
            logger(`Config files copied ${componentName}`, "success");
        }
        await iniGit();
        if (!git) {
            logger(`Init git failed ${componentName}`, "error");
            return;
        }
        removeFoldersAndFiles();
        copyConfigFiles();
        copyCodeFolders();
        await commitFiles();
    
}
let commitMsg = process.env.COMMIT_MSG;
if (/^builds [a-zA-Z]+$/.test(commitMsg)) {
    initVisualCodeCommit(commitMsg.split(' ')[1], commitMsg.split(' ')[0]);
} else if (/^internal [a-zA-Z]+$/.test(commitMsg)) {
    initVisualCodeCommit(commitMsg.split(' ')[1], commitMsg.split(' ')[0]);
}else {
    logger(`Invalid commit message ${commitMsg}`, "warning");
} 