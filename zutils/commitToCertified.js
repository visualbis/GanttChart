/* eslint-disable powerbi-visuals/non-literal-require */
/* eslint-disable max-lines-per-function */
/* eslint-disable no-inner-declarations */
/* eslint-disable powerbi-visuals/non-literal-fs-path */
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');

const merge = require('lodash.merge');
const gulp = require('gulp');
const preprocess = require('gulp-preprocess');
const DEPS_VERSION = require('../../../lerna.json').version;

let srcDestination = 'src';
//Default context
const context = {
    onlineLicence: false,
};
async function initVisualCodeCommit() {
    const CERTIFICATION_TARGET_BRANCH = 'C3';
    const component = { name: 'GanttChart' };
    const BUILD_REPO_PATH = path.join(__dirname, `./${component.name}`);
    const DEFAULT_FILES_PATH = path.join(__dirname, './defaultFiles');
    const ROOT_PATH = path.resolve(__dirname, '../');
    const CONFIG_FOLDERS = ['.github'];
    const FOLDERS_TO_COPY = ['src', 'assets', 'style', '.github'];
    const FILES_TO_COPY = [
        'package.json',
        'package-lock.json',
        'pbiviz.json',
        'capabilities.json',
        'README.MD',
        'licence.ts',
        'eslintrc.json',
        'tsconfigDev.json',
        'tslint.json',
        'tsconfig.json',
        '.gitignore',
        'BuildVariables.ts',
        '.npmrc',
        'webpack.config.js',
        'PowerBICustomVisualTest_public.pfx',
        `assets/icon.png`,
        '.eslintrc.js',
        'backup.json',
        '.eslintignore',
    ];

    const componentRootPath = path.join(__dirname, '../');
    const REPO_URL = `https://${process.env.GIT_TOKEN}@github.com/devpowerpro/${component.name}.git`;
    let git = null;
    async function iniGit() {
        if (fs.existsSync(BUILD_REPO_PATH)) {
            fs.rmdirSync(BUILD_REPO_PATH, { recursive: true });
        }
        fs.mkdirSync(BUILD_REPO_PATH);
        try {
            console.log(`Cloning Git repo ${component.name}`, 'info');
            await simpleGit(__dirname).clone(REPO_URL, BUILD_REPO_PATH, ['--depth=1',]);
        } catch (e) {
            console.log(e);
            console.log(`Failed to clone Git repo ${component.name}`, 'error');
            return;
        }
        const options = {
            baseDir: BUILD_REPO_PATH,
            binary: 'git',
            maxConcurrentProcesses: 6,
        };

        try {
            console.log(`Init Git repo ${component.name}`, 'info');
            git = simpleGit(options).addConfig('user.name', 'nsdevaraj').addConfig('user.email', 'nsdevaraj@gmail.com');
            console.log(`Deleting branch ${component.name}`, 'info');
            await git.push(['origin', '--delete', CERTIFICATION_TARGET_BRANCH]);
        } catch (e) {
            console.log(e);
        }
        console.log('Branch deleted', 'success');
    }

    async function commitFiles() {
        console.log(`Commiting files ${component.name}`, 'info');
        await git
            .add('./*')
            .commit(`Commit for Certification`)
            .push(['origin', `HEAD:${CERTIFICATION_TARGET_BRANCH}`, `--force`]);
        console.log(`Commit done`, 'success');
    }
    function removeFoldersAndFiles() {
        console.log(`Removing folders and files ${component.name}`, 'info');
        fs.readdirSync(BUILD_REPO_PATH).forEach((file) => {
            if (file.includes('git')) {
                return;
            }
            fs.removeSync(path.join(BUILD_REPO_PATH, file));
        });
    }
    function updatePackageJson() {
        const packageJson = require(path.join(BUILD_REPO_PATH, './package.json'));
        packageJson.scripts = {
            audit: 'npm audit --audit-level=moderate --omit=dev',
            eslint: 'npx eslint . --ext .js,.jsx,.ts,.tsx',
            lint: 'tslint -c tslint.json -p tsconfig.json',
            dist: 'NODE_OPTIONS="--max-old-space-size=8192" cross-env NODE_ENV=production webpack --env=production --progress',
            package: 'npm run dist',
            start: 'webpack-dev-server',
        };

        delete packageJson.devDependencies['gulp'];
        delete packageJson.devDependencies['gulp-preprocess'];
        packageJson.dependencies = {
            ...packageJson.dependencies
        };

        fs.writeFileSync(path.join(BUILD_REPO_PATH, './package.json'), JSON.stringify(packageJson, null, 2));
    }
    function copyCodeFolders() {
        console.log(`Copying code folders ${component.name}`, 'info');
        FILES_TO_COPY.forEach((file) => {
            console.log(`Copying file ${file}`, 'info');
            let srcPath = path.join(componentRootPath, file);
            if (!fs.existsSync(srcPath)) {
                srcPath = path.join(DEFAULT_FILES_PATH, file);
            }
            if (!fs.existsSync(srcPath)) {
                console.log(`File ${file} not found`, 'error');
                return;
            }
            let destPath = path.join(BUILD_REPO_PATH, file);
            fs.copySync(srcPath, destPath);
        });
        FOLDERS_TO_COPY.forEach((folder) => {
            console.log(`Copying folder ${folder}`, 'info');
            let srcPath = path.join(componentRootPath, folder);
            if (!fs.existsSync(srcPath)) {
                srcPath = path.join(DEFAULT_FILES_PATH, folder);
            }
            if (!fs.existsSync(srcPath)) {
                console.log(`Folder ${folder} not found`, 'error');
                return;
            }
            let destPath = path.join(BUILD_REPO_PATH, folder);
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath);
            }
            fs.copySync(srcPath, destPath);
        });
        console.log(`Code folders copied`, 'success');
    }

    function preProcessFiles() {
        Object.keys(context).forEach((key) => {
            if (!context[key]) delete context[key];
        });

        gulp.src(path.join(__dirname, '../src/**/*.ts'))
            .pipe(preprocess({ context }))
            .pipe(gulp.dest(path.join(__dirname, `../${srcDestination}`)));
    }

    // function updateCapabilitiesJson() {
    //     const capabilitiesJson = require(path.join(BUILD_REPO_PATH, './capabilities.json'));
    //     capabilitiesJson.privileges = [
    //         {
    //             name: 'ExportContent',
    //             essential: true,
    //         },
    //     ];

    //     fs.writeFileSync(path.join(BUILD_REPO_PATH, './capabilities.json'), JSON.stringify(capabilitiesJson, null, 2));

    //     console.log(`capabilities.json updated`, 'success');
    // }

    function updatePbivizJson() {
        const pbivizJson = require(path.join(BUILD_REPO_PATH, './pbiviz.json'));
        pbivizJson.visual.displayName = `${pbivizJson.visual.displayName} (${pbivizJson.visual.version.slice(0, 3)})`;

        fs.writeFileSync(path.join(BUILD_REPO_PATH, './pbiviz.json'), JSON.stringify(pbivizJson, null, 2));

        console.log(`pbiviz.json updated`, 'success');
    }

    function copyConfigFiles() {
        console.log(`Copying config files ${component.name}`, 'info');
        CONFIG_FOLDERS.forEach((folder) => {
            const srcPath = path.join(ROOT_PATH, folder);
            if (!fs.existsSync(srcPath)) {
                return;
            }
            const destPath = path.join(BUILD_REPO_PATH, folder);
            if (!fs.emptyDirSync(destPath)) {
                fs.mkdirSync(destPath);
            }
            fs.copySync(srcPath, destPath, { overwrite: true });
        });
        console.log(`Config files copied ${component.name}`, 'success');
    }

    function createReadMe() {
        const readme = `# Gantt Chart
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

    function createNPMRC() {
        const readme = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN || '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'
            }
    legacy-peer-deps=true`;
        fs.writeFileSync(path.join(BUILD_REPO_PATH, './.npmrc'), readme);
        console.log(`NPMRC created`, 'success');
    }

    await iniGit();
    if (!git) {
        console.log(`Init git failed ${component.name}`, 'error');
        return;
    }
    preProcessFiles();
    removeFoldersAndFiles();
    copyConfigFiles();
    copyCodeFolders();
    // updateCapabilitiesJson();
    updatePbivizJson();
    updatePackageJson();
    createReadMe();
    createNPMRC();
    await commitFiles();
}

initVisualCodeCommit();
