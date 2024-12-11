/* eslint-disable powerbi-visuals/non-literal-fs-path -- This file is for build purpose only */
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import unzipper from 'unzipper';
import moment from 'moment';
import del from 'del';
import webpack from 'webpack';
import logger from './logger.mjs';
import license from './license.mjs';
import { Utils } from './Utils.mjs';
import preprocessor from './preprocessor.mjs';
import { CONFIG } from './config.mjs';
import 'dotenv/config';

const DEMO_REPO_NAME = 'valqdemos';
const BUILD_REPO_NAME = 'GanttStoreBuild';
const DEFAULT_NO_OF_OFFLINE_LICENSE_DAYS = 30;
const PREDISTINATION_PATH = 'pre-dist';
const DISTINATION_PATH = 'dist';
const COMMANDS = [
    'ADD_NEW_PASS_KEY',
    'BUILD',
    'TEMPLATE',
    'GENERATE_OFFLINE_KEY',
    'GENERATE_REPORT_OFFLINE_KEY',
    'GENERATE_SAMPLE_REPORT_OFFLINE_KEY',
    'SHOW_VERSION',
    'SHOW_LICENSE',
];
const DEFAULT_CONFIG = {
    BUILD_ENVIRONMENT: 'dev',
    NO_OF_DAYS: 0,
    BUILD_TYPE: 'gantt_chart',
    CREATE_TEMPLATE: null,
    MOCK_LICENSE: null,
    TENANT_ID: '{{tenant.id}}',
};

class Builder {
    constructor(args) {
        if (args.length < 1) {
            this.onInvalidArgument();
        }
        this.command = COMMANDS[0];
        if (args.length > 0) {
            this.command = args[0];
        }
        if (!COMMANDS.includes(this.command)) {
            this.onInvalidArgument();
        }
        this.linkPath = null;
        this.licenseKey = null;
        if (this.command === 'SHOW_LICENSE') {
            this.licenseKey = args[1];
            if (Utils.isEmpty(this.licenseKey)) {
                logger(
                    'Builder.invalid.command.line.argument.license.key.missing ' + this.licenseKey,
                    'error'
                );
                process.exit(1);
            }
        }
        this.pbiviz = null;
        this.capabilities = null;
        this.tsconfig = null;
    }

    onInvalidArgument() {
        logger('Builder.invalid.command.line.argument', 'error');
        process.exit(1);
    }

    initJson() {
        try {
            const pbivizPath = path.join(process.cwd(), 'pbiviz.json');
            const pbivizResponse = fs.readFileSync(pbivizPath, { encoding: 'utf8' });
            this.pbiviz = JSON.parse(pbivizResponse);
            const capabilitiesPath = path.join(process.cwd(), 'capabilities.json');
            const capabilitiesResponse = fs.readFileSync(capabilitiesPath, { encoding: 'utf8' });
            this.capabilities = JSON.parse(capabilitiesResponse);
            const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
            const tsconfigResponse = fs.readFileSync(tsconfigPath, { encoding: 'utf8' });
            this.tsconfig = JSON.parse(tsconfigResponse);
        } catch (err) {
            logger('Json file load error ' + err ? err : '', 'error');
            process.exit(1);
        }
    }

    getVersion() {
        const version = this.pbiviz?.visual?.version;
        return version;
    }

    getDisplayName() {
        const { BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT } = process.env;
        const version = this.getVersion();
        const buildDate = moment().utcOffset('+05:30').format('DD MMM kk:mm');
        const bracketName = BUILD_ENVIRONMENT === 'prod' ? `${version}` : `${buildDate} v${version}`;
        const buildDisplayName = `Gantt Chart (${bracketName})`;
        return buildDisplayName;
    }

    getBuildStore() {
        const {
            CREATE_TEMPLATE = DEFAULT_CONFIG.CREATE_TEMPLATE,
            BUILD_TYPE = DEFAULT_CONFIG.BUILD_TYPE,
        } = process.env;
        let BUILD_STORE = 'appsource';
        const isCreateTemplateEnabled =
            CREATE_TEMPLATE !== null &&
            typeof CREATE_TEMPLATE === 'string' &&
            CREATE_TEMPLATE.toLowerCase() === 'true';
        const isEnterpriseBuildType = BUILD_TYPE === 'enterprise'; // #CHECKWITHTEAM
        if (isCreateTemplateEnabled || isEnterpriseBuildType) {
            BUILD_STORE = 'webstore';
        }
        logger(`BUILD STORE: ${BUILD_STORE}`, 'info');
        return BUILD_STORE;
    }

    getEnvironmentConfig(BUILD_ENVIRONMENT) {
        // eg: BUILD_ENVIRONMENT can be dev, qa, appsource, webstore
        const { BUILD_TYPE = DEFAULT_CONFIG.BUILD_TYPE, PUBLIC_KEY, SECRET_KEY } = process.env;
        const BUILD_STORE = this.getBuildStore();
        if (
            BUILD_TYPE &&
            BUILD_ENVIRONMENT &&
            CONFIG &&
            CONFIG[BUILD_TYPE] &&
            CONFIG[BUILD_TYPE][BUILD_ENVIRONMENT] &&
            CONFIG[BUILD_TYPE][BUILD_ENVIRONMENT][BUILD_STORE]
        ) {
            return Object.assign(
                { BUILD_ENVIRONMENT },
                CONFIG[BUILD_TYPE][BUILD_ENVIRONMENT][BUILD_STORE]
            );
        } else if (
            BUILD_TYPE &&
            BUILD_ENVIRONMENT &&
            CONFIG &&
            CONFIG[BUILD_TYPE] &&
            CONFIG[BUILD_TYPE][BUILD_ENVIRONMENT]
        ) {
            // eg: {dev: { guid, public-key, secret_key, product_pricing_url, license_url, content_access }
            const envConfig = Object.assign({ BUILD_ENVIRONMENT }, CONFIG[BUILD_TYPE][BUILD_ENVIRONMENT]);
            logger(JSON.stringify(envConfig), 'info')
            return Object.assign(envConfig, { PUBLIC_KEY, SECRET_KEY });
        }
        return null;
    }

    getGUID() {
        const { BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT } = process.env;
        const environmentConfig = this.getEnvironmentConfig(BUILD_ENVIRONMENT);
        if (environmentConfig) {
            return environmentConfig.guid;
        } else {
            logger('GUID not defined', 'error');
            process.exit(1);
        }
    }

    showLicenseDetails() {
        return new Promise((resolve, reject) => {
            const envs = ['prod', 'qa', 'dev'];
            const showDetails = () => {
                if (envs.length > 0) {
                    const env = envs.pop();
                    const environmentConfig = this.getEnvironmentConfig(env);
                    license
                        .init(environmentConfig)
                        .then(() => {
                            try {
                                const licenseObj = license.parse(this.licenseKey);
                                logger(`GIVEN LICENSE: ${JSON.stringify(licenseObj)}`, 'info');
                                logger(`LICENSE EXPIRY: ${new Date(licenseObj.expiry).toString()}`, 'info');
                                logger(`GIVEN LICENSE KEY: ${this.licenseKey}`, 'info');
                                logger(`LICENSE ENVIRONMENT: ${env}`, 'info');
                                resolve();
                            } catch (e) {
                                showDetails();
                            }
                        })
                        .catch(reject);
                } else {
                    reject(new Error('license.key.invalid'));
                }
            };
            showDetails();
        });
    }

    updateEncryptionPassKey() {
        return new Promise((resolve, reject) => {
            const passKeys = license.generateNewPassKey(); // encrypting the key
            const configPath = path.join(process.cwd(), 'src', 'Config.ts');
            if (fs.existsSync(configPath)) {
                Utils.replaceContent(configPath, [
                    {
                        find: /(\s*?)PUBLIC_KEY:(.*)/,
                        replace: `$1PUBLIC_KEY: \`${passKeys.PUBLIC_KEY}\`,`,
                        regex: true,
                    },
                    {
                        find: /(\s*?)SECRET_KEY:(.*)/,
                        replace: `$1SECRET_KEY: \`${passKeys.SECRET_KEY}\`,`,
                        regex: true,
                    },
                ])
                    .then(() => {
                        logger(`File Updated: ${configPath}`, 'info');
                        resolve();
                    })
                    .catch(reject);
            } else {
                logger(`File not found !!! ${configPath}`, 'error');
                process.exit(1);
            }
        });
    }

    generateOfflineLicenseKey(btype = 100) {
        const {
            BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT,
            NO_OF_DAYS = DEFAULT_CONFIG.NO_OF_DAYS,
        } = process.env;
        logger(`Using Keys [BUILD_ENVIRONMENT, NO_OF_DAYS] From .env File`, 'info');
        let licenseKey = license.generate(DEFAULT_NO_OF_OFFLINE_LICENSE_DAYS, btype);
        if (NO_OF_DAYS) {
            licenseKey = license.generate(Number(NO_OF_DAYS), btype);
        }
        const licenseObj = license.parse(licenseKey);
        logger(`CURRENT LICENSE: ${JSON.stringify(licenseObj)}`, 'info');
        logger(`LICENSE EXPIRY: ${new Date(licenseObj.expiry).toString()}`, 'info');
        logger(`OFFLINE LICENSE KEY: ${licenseKey}`, 'info');
        logger(`BUILD ENVIRONMENT: ${BUILD_ENVIRONMENT}`, 'info');
    }

    cleanup(deleteAll) {
        const predistPath = path.join(process.cwd(), PREDISTINATION_PATH);
        const distPath = path.join(process.cwd(), DISTINATION_PATH);
        const tmpPath = path.join(process.cwd(), '.tmp');
        const buildRepoPath = path.join(process.cwd(), `${BUILD_REPO_NAME}`);
        const demoRepoPath = path.join(process.cwd(), `${DEMO_REPO_NAME}`);
        del.sync([predistPath]);
        del.sync([tmpPath]);
        del.sync([buildRepoPath]);
        del.sync([demoRepoPath]);
        if (deleteAll === true) {
            del.sync([distPath]);
        }
        logger(`Cleanup process completed`, 'success');
    }

    initBuild() {
        const {
            BUILD_TYPE = DEFAULT_CONFIG.BUILD_TYPE,
            BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT,
        } = process.env;
        const predistPath = path.join(process.cwd(), PREDISTINATION_PATH, 'src');
        fs.mkdirSync(predistPath, { recursive: true });
        if (!BUILD_TYPE) {
            logger(`BUILD_TYPE not properly defined in dotenv file`, 'error');
            process.exit(1);
        }
        logger(`BUILD_TYPE: ${BUILD_TYPE}`, 'info');
        logger(`BUILD_ENVIRONMENT: ${BUILD_ENVIRONMENT}`, 'info');
        logger(`Initialization process completed`, 'success');
    }

    updatePbiviz() {
        const version = this.getVersion();
        const displayName = this.getDisplayName();
        const guid = this.getGUID();
        this.pbiviz.visual.displayName = displayName;
        this.pbiviz.visual.version = version;
        this.pbiviz.visual.guid = guid;
        logger(`BUILD_VERSION: ${this.pbiviz.visual.version}`, 'info');
        logger(`BUILD_DISPLAY_NAME: ${this.pbiviz.visual.displayName}`, 'info');
        logger(`GUID: ${this.pbiviz.visual.guid}`, 'info');
        const pbivizJsonPath = path.join(process.cwd(), PREDISTINATION_PATH, 'pbiviz.json');
        const jsonContent = JSON.stringify(this.pbiviz, null, 2);
        fs.writeFileSync(pbivizJsonPath, jsonContent, { encoding: 'utf8' });
        logger(`Configuration file pbiviz.json updated`, 'success');
    }

    updateCapabilitiesJson() {
        const { BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT } = process.env;
        const environmentConfig = this.getEnvironmentConfig(BUILD_ENVIRONMENT);
        const capabilitiesPath = path.join(process.cwd(), PREDISTINATION_PATH, 'capabilities.json');
        if (
            environmentConfig &&
            Array.isArray(environmentConfig.CONTENT_ACCESS) &&
            environmentConfig.CONTENT_ACCESS.length > 0
        ) {
            this.capabilities.privileges.push({
                name: `WebAccess`,
                essential: true,
                parameters: environmentConfig.CONTENT_ACCESS,
            });
        }
        const jsonContent = JSON.stringify(this.capabilities, null, 2);
        fs.writeFileSync(capabilitiesPath, jsonContent, { encoding: 'utf8' });
        logger(`Configuration file capabilities.json updated`, 'success');
    }

    copyStyles() {
        const stylePath = path.join(process.cwd(), 'style');
        const styleDestPath = path.join(process.cwd(), PREDISTINATION_PATH, 'style');
        fs.copySync(stylePath, styleDestPath);
        logger(`Style files copied`, 'success');
    }

    updateConfiguration() {
        return new Promise((resolve, reject) => {
            const {
                CREATE_TEMPLATE = DEFAULT_CONFIG.CREATE_TEMPLATE,
                TENANT_ID = DEFAULT_CONFIG.TENANT_ID,
                BUILD_TYPE = DEFAULT_CONFIG.BUILD_TYPE,
                BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT,
            } = process.env;
            if (!BUILD_TYPE) {
                logger(`BUILD_TYPE not properly defined in dotenv file`, 'error');
                process.exit(1);
            }
            const configPath = path.join(process.cwd(), 'src', 'Config.ts');
            const configDistPath = path.join(process.cwd(), PREDISTINATION_PATH, 'src', 'Config.js');
            const configDistTsPath = path.join(process.cwd(), PREDISTINATION_PATH, 'src', 'Config.ts');
            fs.copyFileSync(configPath, configDistPath);
            if (fs.existsSync(configDistTsPath)) {
                del.sync([configDistTsPath]);
            }
            const version = this.getVersion();
            const environmentConfig = this.getEnvironmentConfig(BUILD_ENVIRONMENT);
            environmentConfig.BUILD_TYPE = BUILD_TYPE;
            environmentConfig.BUILD_DATE = new Date(Date.now()).toString();
            environmentConfig.VERSION = version;
            const isCreateTemplateEnabled =
                CREATE_TEMPLATE !== null &&
                typeof CREATE_TEMPLATE === 'string' &&
                CREATE_TEMPLATE.toLowerCase() === 'true';
            if (isCreateTemplateEnabled) {
                environmentConfig.TENANT_ID = TENANT_ID;
            }
            Utils.replace(configDistPath, environmentConfig)
                .then(() => {
                    logger(`Configuration file Config.ts updated`, 'success');
                    resolve();
                })
                .catch(reject);
        });
    }

    updateTsConfig() {
        const tsConfigPath = path.join(process.cwd(), PREDISTINATION_PATH, 'tsconfig.json');
        const srcPath = path.join(process.cwd(), 'src', 'GanttChart.ts');
        this.tsconfig.files = [srcPath];
        delete this.tsconfig.compilerOptions.outDir;
        const jsonContent = JSON.stringify(this.tsconfig, null, 2);
        fs.writeFileSync(tsConfigPath, jsonContent, { encoding: 'utf8' });
        logger(`Configuration file tsconfig.json updated ${this.tsconfig}`, 'success');
    }

    updateWebpackConfig() {
        return new Promise((resolve, reject) => {
            logger(process.cwd(), 'info')
            const webpackConfigPath = path.join(process.cwd(), 'webpack.config.js');
            const webpackConfigDistPath = path.join(
                process.cwd(),
                PREDISTINATION_PATH,
                'webpack.config.js'
            );
            fs.copyFileSync(webpackConfigPath, webpackConfigDistPath);
            Utils.replaceContent(webpackConfigDistPath, [
                {
                    find: /pbiviz\.json/,
                    replace: `${PREDISTINATION_PATH}/pbiviz.json`,
                    regex: true,
                },
                {
                    find: /capabilities\.json/,
                    replace: `${PREDISTINATION_PATH}/capabilities.json`,
                    regex: true,
                },
                {
                    find: /src\|/,
                    replace: `${PREDISTINATION_PATH}[/\\\\]src|`,
                    regex: true,
                },
                {
                    find: /src\//,
                    replace: `${PREDISTINATION_PATH}/src/`,
                    regex: true,
                },
                {
                    find: /__dirname/,
                    replace: `'${process.cwd().replace(/\\/g, '\\\\')}'`,
                    regex: true,
                },
            ])
                .then(() => {
                    logger(`Configuration file webpack.config.js updated`, 'success');
                    resolve();
                })
                .catch(reject);
        });
    }

    runPreprocessor() {
        return new Promise((resolve) => {
            const srcPath = path.join(process.cwd(), 'src');
            const srcDistPath = path.join(process.cwd(), PREDISTINATION_PATH, 'src');
            const context = {
                isMockLicense: false,
                isOnlineTrialLicense: false,
            };
            const {
                MOCK_LICENSE = DEFAULT_CONFIG.MOCK_LICENSE,
                CREATE_TEMPLATE = DEFAULT_CONFIG.CREATE_TEMPLATE,
            } = process.env;
            const isMockEnabled =
                MOCK_LICENSE !== null &&
                typeof MOCK_LICENSE === 'string' &&
                MOCK_LICENSE.toLowerCase() === 'true';
            if (isMockEnabled) {
                context.isMockLicense = true;
            }
            const isCreateTemplateEnabled =
                CREATE_TEMPLATE !== null &&
                typeof CREATE_TEMPLATE === 'string' &&
                CREATE_TEMPLATE.toLowerCase() === 'true';
            if (isCreateTemplateEnabled) {
                context.isOnlineTrialLicense = true;
            }
            logger(`MOCK_LICENSE: ${isMockEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
            logger(`CREATE_TEMPLATE: ${isCreateTemplateEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
            logger(`Code preprocessor parameter ` + JSON.stringify(context), 'info');
            try {
                fs.copySync(srcPath, srcDistPath, { overwrite: false });
                preprocessor
                    .apply(srcDistPath, context)
                    .then(() => {
                        logger(`Code preprocessor executed`, 'success');
                        resolve();
                    })
                    .catch((er) => {
                        throw er;
                    });
            } catch (err) {
                logger(`Code preprocessor execution failed ` + err, 'error');
                process.exit(1);
            }
        });
    }

    runBuild() {
        return new Promise((resolve, reject) => {
            const { BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT } = process.env;
            const onError = (err) => {
                logger(`Webpack build error ${err} `, 'error');
                reject(err);
            };
            const webConfigPath = Utils.getURL(
                path.join(process.cwd(), PREDISTINATION_PATH, 'webpack.config.js')
            );
            import(webConfigPath)
                .then((webpackConfiguration) => {
                    webpack(
                        webpackConfiguration.default({ buildEnvironment: BUILD_ENVIRONMENT }),
                        (err, stats) => {
                            const statusInfo = stats.toJson();
                            // logger(`🚀 ~ .then ~ ${stats}:`, 'info')
                            if (err || stats.hasErrors()) {
                                if (err) {
                                    onError(err);
                                } else if (statusInfo && statusInfo.errors) {
                                    const errorInfos = statusInfo.errors.map((error) =>
                                        JSON.stringify(error, null, 2)
                                    );
                                    onError(errorInfos.join(','));
                                } else {
                                    onError(null);
                                }
                            } else {
                                logger(`Webpack build process completed`, 'success');
                                resolve();
                            }
                        }
                    );
                })
                .catch(onError);
        });
    }

    initGit(REPO_NAME) {
        return new Promise((resolve, reject) => {
            logger(`Init Git repo for ${REPO_NAME}`, 'info');
            const repoPath = path.join(process.cwd(), `${REPO_NAME}`);
            fs.mkdirSync(repoPath, { recursive: true });
            const options = {
                baseDir: repoPath,
                binary: 'git',
                maxConcurrentProcesses: 6,
            };
            const git = simpleGit(options);
            git
                .addConfig('user.name', 'Sathish kumar')
                .addConfig('user.email', 'sathishkumarm@lumel.com')
                .then(() => {
                    logger('Init Git repo done', 'success');
                    resolve(git);
                })
                .catch(reject);
        });
    }

    async cloneGit(REPO_NAME, GIT_TOKEN) {
        logger(`Git clone started for ${REPO_NAME}`, 'info');
        await simpleGit(process.cwd()).clone(
            `https://${GIT_TOKEN}@github.com/visualbis/${REPO_NAME}.git`,
            path.join(process.cwd(), `${REPO_NAME}`),
            ['--depth=1']
        );
        logger('Git clone done', 'success');
    }

    async validateBuildRepoTagAlreadyExist() {
        return new Promise((resolve, reject) => {
            simpleGit(path.join(process.cwd(), `${BUILD_REPO_NAME}`))
                .listRemote(['--tags'], (err, tags) => {
                    if (!err) {
                        const output = [];
                        tags.split('\n').forEach((para) => {
                            const currentPara = para.split('\t')[1];
                            const tagRegex = /^refs\/tags\//;
                            if (para && currentPara.match(tagRegex)) {
                                output.push(currentPara.replace(tagRegex, ''));
                            }
                        });
                        const version = this.getVersion(); // NOTE: Tag created in git and version present in pbiviz should be same 
                        const tagName = `v${version}`;
                        if (output.includes(tagName)) {
                            reject(new Error(`Git tag "${tagName}" already exist in repo "${BUILD_REPO_NAME}"`));
                        } else {
                            resolve();
                        }
                    } else {
                        reject(err);
                    }
                })
                .catch(reject);
        });
    }

    async prepareBuildRepoFiles() {
        return new Promise((resolve, reject) => {
            logger('Local build repo file preparation started', 'info');
            const distPath = path.join(process.cwd(), DISTINATION_PATH);
            if (!fs.existsSync(distPath)) {
                reject(new Error('Dist path not found ' + distPath));
            } else {
                const distFiles = fs.readdirSync(distPath);
                const pbivizFileName = distFiles.find((fileName) => path.extname(fileName) === '.pbiviz');
                if (!pbivizFileName) {
                    reject(new Error('Pbiviz file not found in dist path ' + distPath));
                } else {
                    const pbivizFile = path.join(distPath, pbivizFileName);
                    const buildRepoPath = path.join(process.cwd(), `${BUILD_REPO_NAME}`);
                    const unzipPath = path.join(buildRepoPath, 'buildFiles');
                    del.sync([unzipPath]);
                    fs.mkdirSync(unzipPath, { recursive: true });
                    unzipper.Open.file(pbivizFile)
                        .then((directory) => {
                            directory
                                .extract({ path: unzipPath })
                                .then(() => {
                                    logger('Local build repo file preparation done', 'success');
                                    resolve();
                                })
                                .catch(reject);
                        })
                        .catch(reject);
                }
            }
        });
    }

    async commitNewBuildRepoTag(git) {
        logger(`Commit started for build repo`, 'info');
        const version = this.getVersion();
        const tagName = `v${version}`;
        await git.add('./*').commit(`Commit version ${tagName}`); // Staging and committing
        await git.tag([`--force`, tagName, '-m', 'NewVersionCreation']); //  creating a separate tag
        await git.push(['origin', tagName, `--force`]); // pushing the commits
        await git.push(['origin', 'main', `--force`]);
        logger(`Commit done`, 'success');
    }

    async prepareDemoRepoFiles() {
        return new Promise((resolve, reject) => {
            logger('Local demo repo file preparation started', 'info');
            const distPath = path.join(process.cwd(), DISTINATION_PATH);
            if (!fs.existsSync(distPath)) {
                reject(new Error('Dist path not found ' + distPath));
            } else {
                const distFiles = fs.readdirSync(distPath);
                const pbivizFileName = distFiles.find((fileName) => path.extname(fileName) === '.pbiviz');
                if (!pbivizFileName) {
                    reject(new Error('Pbiviz file not found in dist path ' + distPath));
                } else {
                    const pbivizFile = path.join(distPath, pbivizFileName);
                    const demoRepoPath = path.join(process.cwd(), `${DEMO_REPO_NAME}`);
                    const unzipPath = path.join(demoRepoPath, 'visual');
                    del.sync([unzipPath]);
                    fs.mkdirSync(unzipPath, { recursive: true });
                    unzipper.Open.file(pbivizFile)
                        .then((directory) => {
                            directory
                                .extract({ path: unzipPath })
                                .then(() => {
                                    logger('Local demo repo file preparation done', 'success');
                                    resolve();
                                })
                                .catch(reject);
                        })
                        .catch(reject);
                }
            }
        });
    }

    async commitDemoRepo(git) {
        logger(`Commit started for demo repo`, 'info');
        const version = this.getVersion();
        const versionName = `v${version}`;
        await git.add('./*').commit(`Commit version ${versionName}`);
        await git.push(['origin', 'main', `--force`]);
        logger(`Commit done`, 'success');
    }

    start() {
        logger(`CFall`, 'info');
        const { BUILD_ENVIRONMENT = DEFAULT_CONFIG.BUILD_ENVIRONMENT, GIT_TOKEN } = process.env; // #NEEDTOCHECK From where, they are setting the GIT_TOKEN ?
        const environmentConfig = this.getEnvironmentConfig(BUILD_ENVIRONMENT);
        const onError = (err) => {
            logger('Error!!! ' + err ? err : '', 'error');
            process.exit(1);
        };
        license
            .init(environmentConfig)
            .then(async () => {
                this.initJson();
                switch (this.command) {
                    case 'ADD_NEW_PASS_KEY': {
                        logger('Encryption New Pass Key Generation Started', 'info');
                        await this.updateEncryptionPassKey().catch(onError);
                        logger('Encryption New Pass Key Generation Ended', 'success');
                        break;
                    }
                    case 'BUILD': {
                        logger('Build process started', 'info');
                        this.cleanup(true);
                        this.initBuild();
                        this.updatePbiviz();
                        this.updateCapabilitiesJson();
                        this.copyStyles();
                        this.updateTsConfig();
                        await this.updateWebpackConfig().catch(onError);
                        await this.runPreprocessor().catch(onError);
                        await this.updateConfiguration().catch(onError);
                        await this.runBuild().catch(onError);
                        this.cleanup(false);
                        logger(`Build process ended`, 'success');
                        break;
                    }
                    case 'TEMPLATE': {
                        logger('Create build repo templating process started', 'info');
                        this.cleanup(false);
                        let git = await this.initGit(BUILD_REPO_NAME);
                        await this.cloneGit(BUILD_REPO_NAME, GIT_TOKEN).catch(onError);
                        await this.validateBuildRepoTagAlreadyExist().catch(onError);
                        await this.prepareBuildRepoFiles().catch(onError);
                        await this.commitNewBuildRepoTag(git).catch(onError);
                        logger(`Create build repo templating process ended`, 'success');
                        logger('Create demo repo templating process started', 'info');
                        this.cleanup(false);
                        git = await this.initGit(DEMO_REPO_NAME);
                        await this.cloneGit(DEMO_REPO_NAME, GIT_TOKEN).catch(onError);
                        await this.prepareDemoRepoFiles().catch(onError);
                        await this.commitDemoRepo(git).catch(onError);
                        this.cleanup(false);
                        logger(`Create demo repo templating process ended`, 'success');
                        break;
                    }
                    case 'GENERATE_OFFLINE_KEY': {
                        logger('Offline License New Key Generation Started', 'info');
                        this.generateOfflineLicenseKey(100);
                        logger('Offline License New Key Generation Ended', 'success');
                        break;
                    }
                    case 'GENERATE_REPORT_OFFLINE_KEY': {
                        logger('Offline License New Key For Report Model Generation Started', 'info');
                        this.generateOfflineLicenseKey(300);
                        logger('Offline License New Key For Report Model Generation Ended', 'success');
                        break;
                    }
                    case 'GENERATE_SAMPLE_REPORT_OFFLINE_KEY': {
                        logger('Offline License New Key For Sample Report Model Generation Started', 'info');
                        this.generateOfflineLicenseKey(200);
                        logger('Offline License New Key For Sample Report Model Generation Ended', 'success');
                        break;
                    }
                    case 'SHOW_VERSION': {
                        const version = this.getVersion();
                        logger(`CURRENT BUILD VERSION: ${version}`, 'info');
                        break;
                    }
                    case 'SHOW_LICENSE': {
                        await this.showLicenseDetails().catch(onError);
                        break;
                    }
                }
            })
            .catch((err) => {
                logger('License initialization error ' + err ? err : '', 'error');
                process.exit(1);
            });
    }
}

new Builder(process.argv.slice(2)).start();
