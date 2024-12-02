const path = require('path');
const fs = require('fs');

// werbpack plugin
const webpack = require('webpack');
const { PowerBICustomVisualsWebpackPlugin } = require('powerbi-visuals-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Visualizer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
// const { DuplicatesPlugin } = require('inspectpack/plugin');

// api configuration
const powerbiApi = require('powerbi-visuals-api');

// visual configuration json path
const pbivizPath = './pbiviz.json';
const pbivizFile = require(path.join(__dirname, pbivizPath));

// the visual capabilities content
const capabilitiesPath = './capabilities.json';
const capabilitiesFile = require(path.join(__dirname, capabilitiesPath));

const pluginLocation = './.tmp/precompile/visualPlugin.ts'; // path to visual plugin file, the file generates by the plugin

// string resources
const statsLocation = '../../webpack.statistics.html';

let babelOptions = {
    presets: [
        [
            require.resolve('@babel/preset-env'),
            {
                useBuiltIns: 'entry',
                corejs: 3,
                modules: false,
            },
        ],
    ],
    plugins: ['@babel/plugin-proposal-class-properties'],
    sourceType: 'unambiguous', // tell to babel that the project can contains different module types, not only es2015 modules
    cacheDirectory: path.join('.tmp', 'babelCache'), // path for cache files
};

const webpackConfiguration = (options) => {
    const isProduction = options && options.buildEnvironment === 'prod';
    const isQA = options && options.buildEnvironment === 'qa';
    const isDevelopment = !isProduction && !isQA;

    return {
        entry: {
            'GanttChart.js': pluginLocation,
        },
        optimization: {
            concatenateModules: false,
            minimize: !isDevelopment, // enable minimization for create *.pbiviz file less than 2 Mb, can be disabled for dev mode
        },
        devtool: !isDevelopment ? false : 'eval-cheap-module-source-map',
        mode: !isDevelopment ? 'production' : 'development',
        module: {
            rules: [
                {
                    parser: {
                        amd: false,
                    },
                },
                {
                    test: /(\.js)x|\.js|\.mjs$/,
                    resolve: {
                        fullySpecified: false, // handle issue with webpack 5
                    },
                    type: 'javascript/auto',
                    use: [],
                },
                {
                    test: /(\.ts)x|\.ts$/,
                    include: /powerbi-visuals-|src|precompile[/\\]visualPlugin.ts/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions,
                        },
                        {
                            loader: require.resolve('ts-loader'),
                            options: {
                                transpileOnly: false,
                                experimentalWatchApi: false,
                            },
                        },
                    ],
                },
                // {
                //   test: /(\.ts)x|\.ts$/,
                //   include: /powerbi-visuals-|src|precompile[/\\]visualPlugin.ts/,
                //   use: [
                //     {
                //       loader: require.resolve("swc-loader"),
                //     },
                //     {
                //       loader: require.resolve("ts-loader"),
                //       options: {
                //         transpileOnly: false,
                //         experimentalWatchApi: false,
                //       },
                //     },
                //   ],
                // },
                // {
                //   test: /(\.js)x|\.js$/,
                //   use: [
                //     {
                //       loader: require.resolve("swc-loader"),
                //       options: {
                //         "sourceMaps": !isProduction,
                //         "inlineSourcesContent": !isProduction
                //       }
                //     },
                //   ],
                // },
                {
                    test: /(\.js)x|\.js$/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions,
                        },
                    ],
                },
                {
                    test: /\.json$/,
                    loader: require.resolve('json-loader'),
                    type: 'javascript/auto',
                },
                {
                    test: /\.less$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: require.resolve('css-loader'),
                        },
                        {
                            loader: require.resolve('less-loader'),
                            options: {
                                lessOptions: {
                                    paths: [path.resolve(__dirname, '..', 'node_modules')],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: require.resolve('css-loader'),
                        },
                    ],
                },
                {
                    test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|svg|webp|eot)$/i,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: Math.Infinity,
                            },
                        },
                    ],
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.css'],
            alias: {},
            fallback: { path: require.resolve('path-browserify') },
        },
        output: {
            path: path.join(__dirname, '.tmp', 'drop'),
            publicPath: '/assets',
            filename: '[name]',
            // if API version of the visual is higer/equal than 3.2.0 add library and libraryTarget options into config
            // API version less that 3.2.0 doesn't require it
            library:
                +powerbiApi.version.replace(/\./g, '') >= 320
                    ? `${[pbivizFile.visual.guid, isDevelopment ? '_DEBUG' : ''].join('')}`
                    : undefined,
            libraryTarget: +powerbiApi.version.replace(/\./g, '') >= 320 ? 'var' : undefined,
        },
        devServer: isDevelopment
            ? {
                static: {
                    directory: path.join(__dirname, '.tmp', 'drop'),
                    publicPath: '/assets',
                },
                allowedHosts: 'all',
                compress: false,
                port: 8080, // dev server port
                hot: false,
                client: {
                    overlay: false,
                },
                server: {
                    type: 'https',
                },
                headers: {
                    'access-control-allow-origin': '*',
                    'cache-control': 'public, max-age=0',
                },
            }
            : undefined,
        externals:
            powerbiApi.version.replace(/\./g, '') >= 320
                ? {
                    'powerbi-visuals-api': 'null',
                    fakeDefine: 'false',
                }
                : {
                    'powerbi-visuals-api': 'null',
                    fakeDefine: 'false',
                    corePowerbiObject: "Function('return this.powerbi')()",
                    realWindow: "Function('return this')()",
                },
        plugins: [
            // ...(isProduction
            //   ? [
            //       new DuplicatesPlugin({
            //         // Emit compilation warning or error? (Default: `false`)
            //         emitErrors: false,
            //         // Handle all messages with handler function (`(report: string)`)
            //         // Overrides `emitErrors` output.
            //         emitHandler: undefined,
            //         // **Note**: Uses posix paths for all matching (e.g., on windows `/` not `\`).
            //         ignoredPackages: undefined,
            //         verbose: true,
            //       }),
            //     ]
            //   : []),
            new MiniCssExtractPlugin({
                filename: 'Visual.css',
                chunkFilename: '[id].css',
            }),
            new Visualizer({
                reportFilename: statsLocation,
                openAnalyzer: false,
                analyzerMode: `static`,
            }),
            // visual plugin regenerates with the visual source, but it does not require relaunching dev server
            new webpack.WatchIgnorePlugin({
                paths: [path.join(__dirname, pluginLocation), './.tmp/**/*.*'],
            }),
            // custom visuals plugin instance with options
            new PowerBICustomVisualsWebpackPlugin({
                ...pbivizFile,
                capabilities: capabilitiesFile,
                apiVersion: powerbiApi.version,
                capabilitiesSchema: powerbiApi.schemas.capabilities,
                pbivizSchema: powerbiApi.schemas.pbiviz,
                stringResourcesSchema: null,
                dependenciesSchema: powerbiApi.schemas.dependencies,
                devMode: isDevelopment,
                generatePbiviz: !isDevelopment,
                generateResources: false,
                modules: true,
                visualSourceLocation: '../../src/GanttChart',
                pluginLocation: pluginLocation,
                packageOutPath: path.join(__dirname, 'dist'),
            }),
            new ExtraWatchWebpackPlugin({
                files: [pbivizPath, capabilitiesPath],
            }),
            new ModuleFederationPlugin({
                name: 'ganttChart',
                filename: 'remoteEntry.js',
                exposes: {},
                remotes: {
                    // inforiver_matrix_remote: `inforiver_matrix_remote@//d1bzh40yu9adsm.cloudfront.net/inforiver_matrix_remote.js`,
                },
                shared: [],
            }),
            powerbiApi.version.replace(/\./g, '') >= 320
                ? new webpack.ProvidePlugin({
                    define: 'fakeDefine',
                    React: 'react',
                })
                : new webpack.ProvidePlugin({
                    window: 'realWindow',
                    define: 'fakeDefine',
                    powerbi: 'corePowerbiObject',
                    React: 'react',
                }),
            new webpack.DefinePlugin({
                VERSION: JSON.stringify(pbivizFile.visual.version),
                BUILD_DATE: JSON.stringify(new Date(Date.now()).toString()),
            }),
        ],
    };
};

module.exports = webpackConfiguration;
