/* eslint-disable powerbi-visuals/non-literal-require */
/* eslint-disable max-lines-per-function */
/* eslint-disable no-inner-declarations */
/* eslint-disable powerbi-visuals/non-literal-fs-path */
const fs = require('fs-extra')
const path = require('path');
const simpleGit = require('simple-git');
const objectParser = require('json-templater/object');
const merge = require('lodash.merge');
const moment = require('moment');
const pbivizTemplate = require("./pbivizTemplate.json");
const chalk = require('chalk');
let componentList = require("./components_meta.json");

const logger = (msg, type) => {
    let tag;

    switch (type) {
        case 'error':
            tag = chalk.bold.bgRed(' error  ');
            break;

        case 'warn':
            tag = chalk.bold.bgYellow(' warn  ');
            break;

        case 'success':
            tag = chalk.bold.bgGreen(' success  ');
            break;

        case 'info':
            tag = chalk.bold.bgCyan(' info  ');
            break;

        default:
            msg = chalk.bold.yellow(msg);
            break;
    }

    const sysout = console;
    !type && sysout.log('');
    sysout.log(`${tag || ''
        } ${msg
        }`);
    !type && sysout.log('');
};

async function initVisualCodeCommit(componentName = '', buildType = '') {
    const CERTIFICATION_TARGET_BRANCH = 'C3';
    const BUILD_REPOS_ROOT = path.join(__dirname, './TEMP');
    const DEFAULT_FILES_PATH = path.join(__dirname, './defaultFiles');
    const ROOT_PATH = path.resolve(__dirname, '../');
    const CONFIG_FOLDERS = ['.github'
    ];
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
    const FOLDERS_TO_COPY = ['src', 'assets', 'style', 'externalLib'
    ];
    if (fs.existsSync(BUILD_REPOS_ROOT)) {
        fs.rmdirSync(BUILD_REPOS_ROOT,
            {
                recursive: true
            })
    }
    fs.mkdirSync(BUILD_REPOS_ROOT);
    if (componentName) {
        componentList = [componentList.find(c => c.name === componentName)
        ];
        if (componentList.length === 0 || !componentList[
            0
        ]) {
            logger(`Component ${componentName} not found`, 'error');
            return;
        }
    }
    for (let i = 0; i < componentList.length; i++) {
        const component = componentList[i];
        const BUILD_REPO_PATH = path.join(BUILD_REPOS_ROOT, `./${component.name}`);
        const componentRootPath = ROOT_PATH;
        let git = null;
        async function iniGit() {
            fs.mkdirSync(BUILD_REPO_PATH);
            try {
                logger(`Cloning Git repo ${component.name
                    }`,
                    "info");
                await simpleGit(__dirname).clone(`https://${process.env.GIT_TOKEN}@github.com/devpowerpro/${component.name}.git`, BUILD_REPO_PATH, ['--depth=1']);
            } catch (e) {
                console.log(e);
                logger(`Failed to clone Git repo ${component.name
                    }`,
                    "error");
                return;
            }
            const options = {
                baseDir: BUILD_REPO_PATH,
                binary: 'git',
                maxConcurrentProcesses: 6,
            };

            try {
                logger(`Init Git repo ${component.name
                    }`,
                    "info");
                git = simpleGit(options)
                    .addConfig('user.name', 'sathish kumar')
                    .addConfig('user.email', 'sathishkumarm@lumel.com')
                logger(`Deleting branch ${component.name
                    }`,
                    "info");
                await git.push(['origin', '--delete', CERTIFICATION_TARGET_BRANCH
                ]);
            }
            catch (e) {
                console.log(e);
            }
            logger('Branch deleted',
                "success");
        }

        async function commitFiles() {
            logger(`Commiting files ${component.name
                }`,
                "info");
            await git.add('./*')
                .commit(`Commit for Certification`)
                .push(['origin', `HEAD:${CERTIFICATION_TARGET_BRANCH}`, `--force`]);
            logger(`Commit done`, "success");
        }
        function removeFoldersAndFiles() {
            logger(`Removing folders and files ${component.name}`, "info");
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
                const jsonData = JSON.parse(data);
                const BUILD_DATE = moment().utcOffset('+05:30').format('DD MMM kk:mm');
                // Step 2: Edit the JSON data (example: add a new key-value pair)
                jsonData.visual.displayName = `${jsonData.visual.displayName}${`(${BUILD_DATE})`}`; // Modify the JSON data as needed
                logger('Display Name:', jsonData.visual.displayName);
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
            logger(`Copying code folders ${component.name}`, "info");
            logger(`PATH: ${componentRootPath}`, "info");
            FILES_TO_COPY.forEach(file => {
                logger(`Copying file ${file}`, "info");
                let srcPath = path.join(componentRootPath, file);
                logger(`srcPath: ${srcPath}`, "info");
                if (!fs.existsSync(srcPath)) {
                    srcPath = path.join(DEFAULT_FILES_PATH, file);
                }
                if (!fs.existsSync(srcPath)) {
                    logger(`File ${file} not found`, "error");
                    return;
                }
                if (file == 'backup.json') file = 'package-lock.json'
                let destPath = path.join(BUILD_REPO_PATH, file);

                fs.copySync(srcPath, destPath);
                if (buildType === "internal" && file == 'pbiviz.json')
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
            logger(`Copying config files ${component.name}`, "info");
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
            logger(`Config files copied ${component.name}`, "success");
        }
        await iniGit();
        if (!git) {
            logger(`Init git failed ${component.name}`, "error");
            return;
        }
        // removeFoldersAndFiles();
        // copyConfigFiles();
        // copyCodeFolders();
        await commitFiles();
    }
}

async function initPackagesCommit() {
    const CERTIFICATION_TARGET_BRANCH = 'C3';
    const PACKAGE_ROOT = path.join(__dirname, './TEMP_LIB');
    const ROOT_PATH = path.resolve(__dirname, '../../packages');
    const DEFAULT_FILES_PATH = path.join(__dirname, './defaultPackageFiles');
    const FILES_TO_COPY = ['package.json',
        'README.MD',
        'tsconfig.json',
        'tslint.json',
        '.eslintrc.js',
        '.eslintignore',
        '.gitignore',
        'gulpfile.js',
        'App.js',
        'App.css',
        '.babelrc',
        '.npmrc',
        '.npmignore'
    ];
    const FOLDERS_TO_COPY = ['src', 'css', 'fonts'];
    if (fs.existsSync(PACKAGE_ROOT)) {
        fs.rmdirSync(PACKAGE_ROOT, { recursive: true })
    }
    fs.mkdirSync(PACKAGE_ROOT);

    async function iniGit() {
        try {
            logger(`Cloning Git repo xvizlibrary`, "info");
            await simpleGit(__dirname).clone(`https://${process.env.GIT_TOKEN}@github.com/devpowerpro/xvizlibrary.git`, PACKAGE_ROOT, ['--depth=1']);
        } catch (e) {
            console.log(e);
            logger(`Failed to clone Git repo xvizlibrary`, "error");
            return;
        }
        logger(`Cloned xvizlibrary`, "success");
        const options = {
            baseDir: PACKAGE_ROOT,
            binary: 'git',
            maxConcurrentProcesses: 6,
        };
        try {
            logger(`Init Git repo xvizlibrary`, "info");
            git = simpleGit(options)
                .addConfig('user.name', 'sathish kumar')
                .addConfig('user.email', 'sathishkumarm@lumel.com')
            logger(`Deleting branch xvizlibrary`, "info");
            await git.push(['origin', '--delete', CERTIFICATION_TARGET_BRANCH]);
        }
        catch (e) {
            console.log(e);
        }
        logger('Branch deleted', "success");
    }



    function removeFoldersAndFiles() {
        logger(`Removing folders and files`, "info");
        fs.readdirSync(PACKAGE_ROOT).forEach(file => {
            if (file === '.git') {
                return;
            }
            fs.removeSync(path.join(PACKAGE_ROOT, file));
        })
    }

    await iniGit();
    if (!git) {
        logger(`Init git failed ${component.name}`, "error");
        return;
    }
    removeFoldersAndFiles();

    // Copying package files
    const packages = ['bifrost-editor', 'bifrost-powerbi', 'bifrost-rx', 'powerbivizcommon', 'powerbivizeditor', 'xviz-annotate']
    for (let i = 0; i < packages.length; i++) {
        const packageUsed = packages[i];
        const BUILD_REPO_PATH = path.join(PACKAGE_ROOT, `./${packageUsed}`);
        const componentRootPath = path.join(ROOT_PATH, `./${packageUsed}`);
        function copyCodeFolders() {
            logger(`Copying code folders ${packageUsed}`, "info");
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
                let destPath = path.join(BUILD_REPO_PATH, file);
                fs.copySync(srcPath, destPath);
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
        copyCodeFolders();
    }

    async function commitFiles() {
        logger(`Commiting files xvizlibrary`, "info");
        await git.add('./*')
            .commit(`Commit for Certification`)
            .push(['origin', `HEAD:${CERTIFICATION_TARGET_BRANCH}`, `--force`]);
        logger(`Commit done`, "success");
    }

    await commitFiles();
}

let commitMsg = process.env.COMMIT_MSG || 'commitid chore certify GanttChart';
commitMsg = commitMsg.split(' ');
if (commitMsg.length < 3) {
    logger(`Invalid commit message ${process.env.COMMIT_MSG}`, "warning");
} else {
    commitMsg = commitMsg.slice(2).join(' ')
}

if (commitMsg === 'certify packages') {
    initPackagesCommit();
} else if (commitMsg === 'certify visuals') {
    initVisualCodeCommit();
} else if (/^certify [a-zA-Z]+$/.test(commitMsg)) {
    initVisualCodeCommit(commitMsg.split(' ')[1], commitMsg.split(' ')[0]);
} else if (/^internal [a-zA-Z]+$/.test(commitMsg)) {
    initVisualCodeCommit(commitMsg.split(' ')[1], commitMsg.split(' ')[0]);
} else {
    logger(`Invalid commit message ${commitMsg}`, "warning");
}
const lernaVersion = '../../lerna.json';
const updatePackageVersions = (componentList) => {
    const lernaFile = require(lernaVersion);
    const sourceVersion = lernaFile.version.split('-')[0];
    componentList.forEach(component => {
        component.nameWithNoSpace = component.name.replace(/ /g, "");
        component.nameWithNoSpace = component.name.replace(/ /g, "");
        component.originalGUID = component.guid;
        component.version = sourceVersion
        let pbivizPath = path.join(__dirname, '/../', `${component.path}/pbiviz.json`);
        let sourcePbiviz = require(pbivizPath);
        let targetPbiviz = objectParser(pbivizTemplate, component);
        let mergedPbiviz = merge(sourcePbiviz, targetPbiviz);
        fs.writeJsonSync(pbivizPath, mergedPbiviz, { spaces: 2 });
    });
};
// for changing version
//updatePackageVersions(packageJsonsToUpdate);
