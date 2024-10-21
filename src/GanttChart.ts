import 'regenerator-runtime/runtime.js';
import 'core-js/stable';
import './../style/visual.less';
import powerbiVisualsApi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import ISelectionId = powerbiVisualsApi.visuals.ISelectionId;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import * as BifrostVisual from '@visualbi/bifrost-powerbi/dist/BifrostVisual';

import { Data } from '@visualbi/bifrost-powerbi/dist/types/DataTypeDef';
import { IUtilityOptions } from '@visualbi/bifrost-powerbi/dist/types/UtilityMenu';
import { UIIndicators } from '@visualbi/bifrost-powerbi/dist/UIIndicators';
import { RenderOptions, HighContrastColors, IDataConfig } from '@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef';
import { SelectionIdBuilder } from '@visualbi/bifrost-powerbi/dist/SelectionIdBuilder';
import { loadEditor, removeEditor } from '@visualbi/powerbi-editor/dist/gantt/editor';
import * as SettingsSchemaTypeDef from '@visualbi/bifrost-powerbi/dist/types/SettingsSchemaTypeDef';

import { VisualSettings, ValidValues } from './settings';
import { AnychartSelectionManager } from './AnychartSelectionManager';
import { Util } from './Util';
import { Helper, settingsHelper } from './Helper';
import { Configuration } from './configuration';
import { ProProperties } from './ProProperties';
import { GanttConditionalFormatting, IMAGE_URL } from './GanttConditionalFormatting';
import { MilestoneConfig, JSONArrayDef, DynamicSummaryTableField } from './interfaces';
import { UtilityMenu } from './UtilityMenu';

import { VISUAL_VERSION, COMPONENT_NAME, LICENSE_KEY, CUSTOMER_NAME, COMPONENT_URL } from '../licence';
//import write Back
/*
import { WriteBack } from './WriteBack';
*/

const anychartCustomBuildMinJs = require('@visualbi/powerbi-editor/dist/gantt/externalLib/anychart-custom-build.min.js');
const moment = require('moment');
const escape = require('lodash.escape');
moment.suppressDeprecationWarnings = true;

import {
    DisplayData,
    DisplayDataSettings,
    DisplayDataOptions,
    DisplayDataIconSettings,
} from '@visualbi/powerbi-common/dist/Utils/DisplayData';
import '@visualbi/powerbi-common/dist/styles/display_data.css';
import FabricIconsLists from "@visualbi/bifrost-editor-rx/dist/components/iconpicker/MilestoneIcons.json";
import FabricIconsList from "@visualbi/bifrost-editor-rx/src/components/iconpicker/icons.json";
import MigrationHandlers from './Migration/MigrationHandlers';
import MigrationSettings from './Migration/MigrationSettings';

//locales import
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/de-de.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/es-es.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/fr-fr.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/ja-jp.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/pt-pt.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/ru-ru.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/tr-tr.js');
require('@visualbi/powerbi-editor/dist/gantt/externalLib/Localization/zh-cn.js');



export class GanttChart extends BifrostVisual.BifrostVisual {
    private chartContainer: HTMLElement;
    private chartRefContainer: HTMLElement;
    public chart: any;
    private _selectionIdBuilder: SelectionIdBuilder;
    public settings: VisualSettings;
    public defaultSettings: any;
    private anychartSelectionManager: AnychartSelectionManager;
    public _highContrast: HighContrastColors;
    public _isPBIMobile: boolean;
    public _isPBIDesktop: boolean;
    public _isPBIApplication: boolean;
    public _isMSBrowser: boolean;
    public JSONArray: JSONArrayDef;
    private Editor: any;
    private displayDataOptions: DisplayDataOptions;
    private displayDataSettings: DisplayDataSettings;
    private displayDataIconSettings: DisplayDataIconSettings;
    private displayData: DisplayData;
    private showDisplayIcon: boolean;
    private gridOptions: any;
    private selectionIDArrays: any;
    public isMilestonePresentInData: boolean;
    public isMilestonePresentInField: boolean;
    private idNameMapping: any;
    private editorRules: any;
    private connectorIDMapping: any;
    private formatArray: any;
    private measureMinMax: any;
    private measuresAggregationType: any;
    private dimensionsAggregationType: any;
    private ivalueFormatters: any;
    private measuresArray: any[];
    public cfAppliedMeasures: any;
    public statusFlagPresentMeasures: any;
    private isDataLabeMeasure: boolean;
    private expandLevelsKey: string[];
    public milestoneConfig: MilestoneConfig;
    public divGanttControls: HTMLElement;
    public zoomButtonDiv: HTMLElement;
    public modifiedData: any;
    private dynamicSummaryTableFiled: DynamicSummaryTableField;
    public isGanttEnterprise: boolean = true;
    public settingsHelperInstance: settingsHelper;
    private dateDimensionArray: any[];
    public dimensionsMeasuresObj: any;
    public minMaxDate: any;
    private milestoneType: any;
    public dateTimeDeviation: number;
    public guid: string;
    public forceRender: boolean;
    public isDataForUpdatePresent: boolean;
    public isErrorInWritingData: boolean;
    private isInFocus: boolean;
    public displayDataPoints: any;
    public displayDataSelectionIDs: any;
    public disableTooltip: boolean;
    public prevSelectionIds: any[];
    public count: number = 0;
    public currentArray: any[] = [];
    public option: any;
    public markerItems: any[] = [];

    constructor(options: VisualConstructorOptions) {
        super(options, VisualSettings, ValidValues);
        this.Editor = {
            loadEditor,
            removeEditor,
        };
        this.showDisplayIcon = false;
        this.forceRender = false;
        this.isDataForUpdatePresent = false;
        this.initComponent(this.render, {
            editor: true,
            // useFetchMore: true,
            // getDatareductionConfig: this.getDatareductionConfig,
            getSettingsUIConfiguration: this.getEnumerationConfiguration,
            isMeasureComponent: true,
            conditionalFormattingProperty: {
                sectionId: 'editor',
                propertyId: 'conditionalformatting',
                skipRoles: ['tmeasure', 'dataLabel', 'timelineDate'],
            },
            getEditorInstance: () => this.Editor,
            getEditorAdditionalProps: () => {
                return {
                    isMilestonePresentInData: this.isMilestonePresentInData,
                    isMilestonePresentInField: this.isMilestonePresentInField,
                    isGanttEnterprise: this.isGanttEnterprise,
                    milestoneConfig: this.milestoneConfig,
                    minMaxDate: this.minMaxDate
                };
            },
            processConditionalFormatting: false,
            resizeHandler: {
                callBack: (options: VisualUpdateOptions) => {
                    this.isInFocus = options && options.isInFocus;
                    if (this.gridOptions && this.gridOptions.api && this.displayDataOptions && this.displayDataSettings) {
                        if (this.isInFocus) {
                            this.displayData.toggleTableIcon(
                                this.displayDataOptions.element,
                                this.displayDataOptions.chartContainer,
                                this.displayDataOptions.settings,
                                this.gridOptions,
                                this.displayDataOptions.chartReflowCallBack,
                                this.displayDataOptions.onSelectionCallback);
                        }
                        this.gridOptions.api.sizeColumnsToFit();
                    }
                },
                timeOut: 100,
            },
            license: {
                VISUAL_VERSION,
                COMPONENT_NAME,
                LICENSE_KEY,
                CUSTOMER_NAME,
            },
            propProperties: ProProperties(),
            landingPageConfig: {
                title: COMPONENT_NAME,
                url: COMPONENT_URL,
            },
            fullScreenEditor: true,
            //passing migration config to the bifrost
            migration: {
                handlers: <Record<string, any>>MigrationHandlers.GET_HANDLERS(),
                settings: MigrationSettings
            },
        });
    }

    initPrintLayout = () => {
        window.onbeforeprint = () => {
            document.getElementById('top-nav-bar').style.opacity = '0';
        };
        window.onafterprint = () => {
            document.getElementById('top-nav-bar').style.opacity = '1';
        };
    };

    private getEnumerationConfiguration = (): SettingsSchemaTypeDef.Section[] => {
        const configuration = new Configuration();
        return configuration.getEnumerationConfiguration(this);
    };

    private getDatareductionConfig = (dataview: any, settings: VisualSettings) => {
        return <IDataConfig>{
            enable: true,
            dataviewType: 'CATEGORICAL',
            rows: settings.miscellaneous.noOfRowsAllowed,
            values: -1,
            tooltipName: 'tmeasure',
        };
    };

    private getDefaultValue() {
        return {
            chartOptions: {
                ganttChartType: 'gantt',
                weekStartDay: '0',
                fiscalYearStartMonth: '1',
                ganttCustomDate: ' ',
                filterBlank: false,
                enableZoomButton: false,
                zoomOptions: 'none',
            },
            dataGrid: {
                collapseAllNodes: false,
            },
            numberFormatting: {
                isEnableSemantingFormatting: false,
            },
            interaction: {
                show: false,
            },
        };
    }

    private migrateMilestonesName(milestoneNameFieldConfig: any, milestoneType: any, milestoneTypeObject: any) {
        if (!milestoneTypeObject.memberObjects) return;
        const mileStoneTypeMemberObject = milestoneTypeObject.memberObjects;
        const milestoneTypeValues = milestoneType.values;
        mileStoneTypeMemberObject.forEach((memberObject, index) => {
            if (memberObject && memberObject.milestone) {
                const memberObjectMilestone = memberObject.milestone;
                const milestoneTypeValue = milestoneTypeValues[index];
                const shape = memberObjectMilestone.milestoneShape || 'diamond';
                const fillColorObject = memberObjectMilestone.milestoneFillColor;
                const fillColor =
                    (fillColorObject && fillColorObject.solid && fillColorObject.solid.color) || '#7ed321';
                const borderColorObject = memberObjectMilestone.milestoneBorderColor;
                const borderColor =
                    (borderColorObject && borderColorObject.solid && borderColorObject.solid.color) || '#383838';
                if (!milestoneNameFieldConfig[milestoneType.name][milestoneTypeValue]) {
                    milestoneNameFieldConfig[milestoneType.name][milestoneTypeValue] = {
                        milestoneBorderColor: borderColor,
                        milestoneFillColor: fillColor,
                        milestoneShape: shape,
                    };
                }
            }
        });
    }

    private migrateMilestoneField(
        milestoneFieldConfig: any,
        milestoneField: any,
        milestoneAps: VisualSettings['milestone'],
    ) {
        if (!milestoneFieldConfig['dataConfigMilestone']) {
            milestoneFieldConfig['dataConfigMilestone'] = {
                milestoneBorderColor: milestoneAps.milestoneBorderColorData,
                milestoneFillColor: milestoneAps.milestoneFillColorData,
                milestoneShape: milestoneAps.milestoneShapeData,
            };
        }
        milestoneField.forEach((milestone) => {
            if (!milestoneFieldConfig[milestone.name]) {
                if (milestone.object && milestone.object.milestone) {
                    const milestoneObject = milestone.object.milestone;
                    const shape = milestoneObject.milestoneShape || 'diamond';
                    const fillColorObject = milestoneObject.milestoneFillColor;
                    const fillColor =
                        (fillColorObject && fillColorObject.solid && fillColorObject.solid.color) || '#7ed321';
                    const borderColorObject = milestoneObject.milestoneBorderColor;
                    const borderColor =
                        (borderColorObject && borderColorObject.solid && borderColorObject.solid.color) || '#383838';

                    milestoneFieldConfig[milestone.name] = {
                        milestoneBorderColor: borderColor,
                        milestoneFillColor: fillColor,
                        milestoneShape: shape,
                    };
                }
            }
        });
    }

    private stopRender(options: RenderOptions) {
        const settings: VisualSettings = options.changedProperties;
        if (
            !this.forceRender &&
            (settings.interaction?.modifiedData ||
                settings.writeBack?.fetchUpdateDataType ||
                settings.writeBack?.sendOnlyModifiedItem)
        ) {
            return true;
        }
    }

    public render = async (options: RenderOptions) => {
        this.option = options;
        this.guid = options.GUID;
        this._isPBIApplication = options.isPBIDesktop || options.isPBIMobile;
        this._isMSBrowser = options.isMSBrowser;
        this._isPBIDesktop = options.isPBIDesktop;
        this._isPBIMobile = options.isPBIMobile;
        this.settings = options.settings;
        this.prevSelectionIds = null;
        this.modifiedData = JSON.parse(this.settings.interaction.modifiedData);
        if (this.stopRender(options)) {
            this.attachDisplayData(options.data);
            this.chart && Helper.TIMELINE(this.chart, this.settings, this, options.highContrast, this.JSONArray, options.data);
            return;
        }
        this.forceRender = false;
        this.chartContainer = options.element;
        this.chartContainer.oncontextmenu =  (ev) => {
            this._selectionIdBuilder.showContextMenu([], ev.clientX, ev.clientY);
            ev.preventDefault();
            return false;
        };
        document.addEventListener('contextmenu', event => event.preventDefault());

        this.chartContainer.onclick = (e) => {
            const urlString = e.target && e.target['nextElementSibling'] && e.target['nextElementSibling'].textContent;
            try {
                const url = new URL(urlString);
                (<any>this).host.launchUrl(url.href);
            } catch (err) {
                // console.log(err);
            }
        };

        this.defaultSettings = this.getDefaultValue();
        this.settingsHelperInstance = new settingsHelper(this.settings, this.defaultSettings, this.isGanttEnterprise);
        this.selectionIDArrays = [];
        this.displayData = new DisplayData();
        if (options.highContrast && options.highContrast.isHighContrast) {
            options.element.style.color = options.highContrast.foreground;
        }
        if (options.sampleVisual) {
            Util.RENDERLANDINGPAGE(this.chartContainer, anychartCustomBuildMinJs);
            return;
        }
        const { status, msg } = Helper.VALI_DATE_FIELDS(options.data);

        //writeBack FETCH_DATA method call
        /*
        if (this.settings.writeBack.show && this.settings.interaction.show && this.settings.writeBack.fetchEndPoint != '') {
          try {
            this.modifiedData = await WriteBack.FETCH_DATA(this.settings.writeBack.fetchEndPoint, this.settings);
          } catch (err) {
            console.log('err', err);
          }
        }
        if (!this.modifiedData) this.modifiedData = JSON.parse(this.settings.interaction.modifiedData);
    */
        this.editorRules = this.settings.editor.conditionalformatting ? JSON.parse(this.settings.editor.conditionalformatting) : undefined;
        this.milestoneConfig = this.settings.editor.milestones ? JSON.parse(this.settings.editor.milestones): undefined;
        if (status) {
            Util.EMPTYNODE(this.chartContainer);
            // if (options.isFetchingData) return;
            this.renderChart(options);
            this.visualChange(true);
        } else {
            Util.EMPTYNODE(this.chartContainer);
            UIIndicators.showErrorMessage(this.chartContainer, msg);
            this.isEditorOpen = false;
            return;
        }
        this.initPrintLayout();
    };

    public renderDisplayData(data, displayDataPoints?: any, displayDataSelectionIDs?: any) {
        this.showDisplayIcon = true;
        this.displayData.destroyDisplayDataTable(this.chartContainer);
        this.attachDisplayData(data, displayDataPoints, displayDataSelectionIDs);
    }

    getUtilityConfiguration(): IUtilityOptions[] {
        return UtilityMenu.GET_UTILITY_MENU_CONFIG(this, this.settings);
    }

    private intializeArray(displayDataPoints, taskName, uniqueDimMeasure, isMeasure) {
        const array = [];
        if (uniqueDimMeasure.indexOf(taskName.label) != -1) return;
        uniqueDimMeasure.push(taskName.label);
        array.push(taskName.label);
        displayDataPoints.push(array);
        let values;
        if (isMeasure) values = taskName.values;
        else values = taskName.formattedValues;
        for (let index = 0; index < values.length; index++) {
            const array = [];
            array.push(values[index]);
            displayDataPoints.push(array);
        }
    }

    private addToArray(displayDataPoints, dimMeasure, uniqueDimMeasure, isMeasure, labelName = undefined) {
        if (uniqueDimMeasure.indexOf(dimMeasure.label) != -1) return;
        uniqueDimMeasure.push(dimMeasure.label);
        displayDataPoints[0].push(labelName || dimMeasure.label);
        this.formatArray.push(dimMeasure.format);
        let values;
        if (isMeasure) values = dimMeasure.values;
        else values = dimMeasure.formattedValues;
        for (let index = 0; index < values.length; index++) {
            displayDataPoints[index + 1].push(values[index]);
        }
    }

    private addToArrayDynamicDate(displayDataPoints: any, dimMeasure: any, type: string, labelName: string) {
        const dateFormat = Helper.GANTT_DATE_FORMAT_WRAPPER(
            this.settings.chartOptions.ganttdateformat,
            this.settings.chartOptions.ganttCustomDate,
        );
        this.formatArray.push(dimMeasure.format);
        displayDataPoints[0].push(labelName);
        const values = this.dynamicSummaryTableFiled[type];
        for (let index = 0; index < values.length; index++) {
            let value, formatedValue;
            formatedValue = value = values[index];
            if (value) formatedValue = moment(value - this.dateTimeDeviation).format(dateFormat);
            if (formatedValue == 'Invalid date') formatedValue = value;
            displayDataPoints[index + 1].push(formatedValue);
        }
    }

    private percentFormatter(param) {
        if (param.value) {
            return param.value.toFixed(2) + '%';
        }
    }

    private addToArrayDynamicProgress(displayDataPoints) {
        displayDataPoints[0].push('Progress %');
        this.formatArray.push(this.percentFormatter);
        const values = this.dynamicSummaryTableFiled.progressValue;
        for (let index = 0; index < values.length; index++) {
            if (typeof values[index] == 'number') {
                displayDataPoints[index + 1].push(values[index] * 100);
            } else {
                displayDataPoints[index + 1].push(values[index]);
            }
        }
    }

    private addToArrayIntern(dimMeasure, displayDataPoints, uniqueDimMeasure, isMeasure) {
        dimMeasure.forEach((dimension) => {
            this.addToArray(displayDataPoints, dimension, uniqueDimMeasure, isMeasure);
        });
    }

    private getDisplayDataPoints() {
        const JSONArray = this.JSONArray;
        const displayDataPoints = [];
        const uniqueDimMeasure = [];
        this.intializeArray(displayDataPoints, JSONArray.taskName[0], uniqueDimMeasure, false);
        JSONArray.taskName.forEach((dimension, index) => {
            if (
                index == 0 ||
                (index == JSONArray.taskName.length - 1 && this.settings.chartOptions.ganttChartType !== 'gantt')
            )
                return;
            this.addToArray(displayDataPoints, dimension, uniqueDimMeasure, false);
        });
        const {
            actualStartDate,
            actualEndDate,
            duration,
            plannedStartDate,
            plannedEndDate,
            progressValue,
            progressBase,
            displayColumn,
            displayMeasures,
            dataLabel,
            taskID,
        } = JSONArray;
        if (actualStartDate[0])
            this.addToArrayDynamicDate(displayDataPoints, actualStartDate[0], 'actualStart', 'Start Date');
        if (actualEndDate[0] || duration[0])
            this.addToArrayDynamicDate(displayDataPoints, actualEndDate[0] || duration[0], 'actualEnd', 'End Date');
        if (this.settings.chartOptions.ganttChartType == 'gantt') {
            if (plannedStartDate[0] && plannedEndDate[0])
                this.addToArrayDynamicDate(
                    displayDataPoints,
                    plannedStartDate[0],
                    'baselineStart',
                    'Planned Start Date',
                );
            if (plannedStartDate[0] && plannedEndDate[0])
                this.addToArrayDynamicDate(displayDataPoints, plannedEndDate[0], 'baselineEnd', 'Planned End Date');
            if (progressValue[0]) this.addToArrayDynamicProgress(displayDataPoints);
            if (progressBase[0])
                this.addToArray(displayDataPoints, progressBase[0], uniqueDimMeasure, true, 'Progress Base');
        }
        this.addToArrayIntern(displayColumn, displayDataPoints, uniqueDimMeasure, false);
        this.addToArrayIntern(displayMeasures, displayDataPoints, uniqueDimMeasure, true);
        if (dataLabel[0]) this.addToArray(displayDataPoints, dataLabel[0], uniqueDimMeasure, true, 'Data Label');
        if (taskID[0]) this.addToArray(displayDataPoints, taskID[0], uniqueDimMeasure, false, 'Task ID');
        return {
            displayDataPoints: displayDataPoints,
            displayDataSelectionIDs: this.selectionIDArrays,
        };
    }

    public getParsedString(data) {
        if (data) {
            return JSON.parse(data);
        }
        return null;
    }

    public summaryTableOnClick(data, isChartAndTableVisible = false, displayDataPoints?: any, displayDataSelectionIDs?: any){
        // Custom Summary Table Integration
        let customGridOptions: any = {};
        if (this.settings.editor.enableCustomSummaryTable && this.settings.editor.customSummaryTableConfig) {
            customGridOptions = this.getParsedString(this.settings.editor.customSummaryTableConfig);
        }
        let [updatedDisplayDataPoints, updatedDisplayDataSelectionIDs] = [
            displayDataPoints,
            displayDataSelectionIDs,
        ];
        if (!updatedDisplayDataPoints) {
            const displayDataPoint = this.getDisplayDataPoints();
            updatedDisplayDataPoints = displayDataPoint.displayDataPoints;
            updatedDisplayDataSelectionIDs = displayDataPoint.displayDataSelectionIDs;
            this.displayDataPoints = updatedDisplayDataPoints;
            this.displayDataSelectionIDs = updatedDisplayDataSelectionIDs;
        }
        if (this.formatArray.length < this.displayDataPoints[0].length) {
            this.formatArray.unshift(undefined);
        }
        this.displayDataSettings = {
            fontfamily: this.settings.chartOptions.fontfamily,
            theme: this.settings.summaryTable.stTheme,
            toggleVisual: this.isInFocus,
            tablePosition: 'bottom',
            autoSizeColumn: true,
        };
        this.displayDataOptions = {
            element: this.chartContainer,
            chartContainer: this.chartRefContainer,
            metadata: data.metadata,
            settings: this.displayDataSettings,
            isPBIDesktop: this._isPBIDesktop,
            isPBIMobile: this._isPBIMobile,
            dataRows: updatedDisplayDataPoints,
            dataFormat: this.formatArray,
            selectionIDs: updatedDisplayDataSelectionIDs,
            selectionIdBuilder: this._selectionIdBuilder,
            customGridOptions: customGridOptions && customGridOptions.json ? customGridOptions.json : {},
            chartReflowCallBack: () => {
                // console.log('chart reflow');
            },
            onSelectionCallback: () => {
                // console.log('chart selection');
            },
            closeCallBack: () => {
                if (!this.isEditMode()) {
                    this.setSwitchFocusModeState(false);
                }
                this.renderDisplayData(data, this.displayDataPoints, this.displayDataSelectionIDs);
            },
        };
        this.gridOptions = this.displayData.render(this.displayDataOptions,isChartAndTableVisible);
    }

    private attachDisplayData(data, displayDataPoints?: any, displayDataSelectionIDs?: any) {
        if (this._highContrast && this._highContrast.isHighContrast) {
            this.displayDataIconSettings = {
                color: this._highContrast.foreground,
                backgroundColor: 'transparent',
            };
        } else {
            this.displayDataIconSettings = {
                color: this.settings.summaryTable.summaryTableIconColor,
                backgroundColor: 'transparent',
            };
        }
        this.displayData.attachDisplayTableIcon(
            this.chartContainer,
            () => {
                this.summaryTableOnClick(data, false,displayDataPoints,displayDataSelectionIDs)
            },
            !this.showDisplayIcon,
            this.displayDataIconSettings,
        );
    }

    private liveEditing(chart) {
        chart.dataGrid().edit(false);
        chart.getTimeline().edit(true);
        chart.getTimeline().milestones().edit(true);
        chart.getTimeline().periods().edit(true);
    }

    private localization() {
        const localeString = window.navigator.language;
        const localeSupportedArray = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'zh'];
        const localeFormatArray = ['de-de', 'es-es', 'fr-fr', 'ja-jp', 'pt-pt', 'ru-ru', 'tr-tr', 'zh-cn'];
        const languageArray = localeString.split('-');
        const languageCode = languageArray && languageArray[0];
        const languageCodeIndex = localeSupportedArray.indexOf(languageCode);
        if (languageCodeIndex > -1) {
            anychartCustomBuildMinJs.format.outputLocale(localeFormatArray[languageCodeIndex]);
        }
        anychartCustomBuildMinJs.format.locales.default.dateTimeLocale.firstDayOfWeek = parseInt(this.settings.chartOptions.weekStartDay);
    }

    private renderChart(options: RenderOptions) {
        try {
            this.localization();
            this._selectionIdBuilder = options.selectionIdBuilder;
            this.isInFocus = options.isInFocus;
            this.anychartSelectionManager = new AnychartSelectionManager(this._selectionIdBuilder);
            this._highContrast = options.highContrast;
            this.idNameMapping = {};
            this.connectorIDMapping = {};
            this.formatArray = [];
            this.measuresAggregationType = {};
            this.dimensionsAggregationType = {};
            this.ivalueFormatters = {};
            this.measureMinMax = {};
            this.measuresArray = [];
            this.dateDimensionArray = [];
            this.cfAppliedMeasures = {};
            this.statusFlagPresentMeasures = {};
            this.expandLevelsKey = [];
            this.minMaxDate = { min: Infinity, max: -Infinity };
            this.dateTimeDeviation = null;
            this.dynamicSummaryTableFiled = { actualStart: [], actualEnd: [], baselineStart: [], baselineEnd: [], progressValue: [] };
            this.dimensionsMeasuresObj = {};
            this.milestoneType = undefined;
            let chart: any, treeData: any;
            const JSONArray = this.convertJSONToArray(options.data);
            this.JSONArray = JSONArray; this.isMilestonePresentInData = false;
            this.isMilestonePresentInField = false;
            const generatedTasks = this.generateTask(JSONArray, options.highContrast);
            const { individualTasks, nodeLevels } = generatedTasks;
            let { tasks } = generatedTasks;
            let ganttData, ganttConditionalFormatting;
            if (this.settings.chartOptions.ganttChartType === 'gantt') {
                this.mergeCalculatedValues(JSONArray, nodeLevels, individualTasks);
                if (this.settings.chartOptions.hideBlankGantt != 'none') tasks = this.filterBlankTask(tasks);
                if (this.editorRules) {
                    ganttConditionalFormatting = new GanttConditionalFormatting(this.editorRules, options.data, this.measureMinMax, this.settings.chartOptions.ganttChartType, this.JSONArray, this.isGanttEnterprise, options.highContrast);
                    tasks.forEach((task) => {
                        if (task.isMilestone && individualTasks[task.rowBindingKey]) {
                            task.cf = { ...task.cf, ...individualTasks[task.rowBindingKey].cf };
                            task.cfFormattedValues = {
                                ...task.cfFormattedValues,
                                ...individualTasks[task.rowBindingKey].cfFormattedValues,
                            };
                        } else {
                            task.cf['progessMeasureCalculated'] = typeof task.progressValue == 'number' ? task.progressValue * 100 : null;
                        }
                        if (task.isChildren && task.markers) {
                            task.markers.forEach((marker) => {
                                marker.cf = { ...task.cf, ...marker.cf };
                                marker.cfFormattedValues = { ...task.cfFormattedValues, ...marker.cfFormattedValues };
                                ganttConditionalFormatting.applyConditionalFormatting(marker);
                            });
                        } ganttConditionalFormatting.applyConditionalFormatting(task);
                    });
                    this.cfAppliedMeasures = ganttConditionalFormatting.getCfAppliedMeasures();
                    this.statusFlagPresentMeasures = ganttConditionalFormatting.getStatusFlagPresentMeasures();
                }
                if(!this.settings.chartOptions.showPlannedTaskInParent){ this.updateBaselineColor(tasks);}
                treeData = anychartCustomBuildMinJs.data.tree(tasks, 'as-table', null, { id: 'actualKey', baseline: false });
                chart = anychartCustomBuildMinJs.ganttProject();
                chart.data(treeData, 'as-tree');
            } else {
                ganttData = this.flatToHierarchyResource([...tasks], JSONArray);
                if (this.settings.chartOptions.hideBlankGantt != 'none') ganttData = this.filterBlankTask(ganttData);
                if (this.editorRules) {
                    ganttConditionalFormatting = new GanttConditionalFormatting(this.editorRules, options.data, this.measureMinMax, this.settings.chartOptions.ganttChartType, this.JSONArray, this.isGanttEnterprise, options.highContrast);
                    ganttData.forEach((task) => {
                        if (task.level < this.settings.dataGrid.expandTillLevel){ this.expandLevelsKey.push(task.actualKey); }
                        if (task.periods) {
                            task.periods.forEach((_task) => {
                                if (_task.markers){
                                    _task.markers.forEach((marker) => {
                                        marker.cf = { ..._task.cf, ...marker.cf };
                                        marker.cfFormattedValues = { ..._task.cfFormattedValues, ...marker.cfFormattedValues };
                                        ganttConditionalFormatting.applyConditionalFormatting(marker);
                                    });
                                } ganttConditionalFormatting.applyConditionalFormatting(_task);
                            });
                        }
                    });
                    this.cfAppliedMeasures = ganttConditionalFormatting.getCfAppliedMeasures();
                    this.statusFlagPresentMeasures = ganttConditionalFormatting.getStatusFlagPresentMeasures();
                }
                treeData = anychartCustomBuildMinJs.data.tree(ganttData, 'as-table', null, { id: 'actualKey' });
                chart = anychartCustomBuildMinJs.ganttResource();
                chart.data(treeData, 'as-tree');
            }
            this.chart = chart;
            if(this.chart && !this.settings.timeline.ganttzoomrangeenabled && !this.settings.timeline.ganttscrollenable){
                this.chart.fitAll();           
            }
            this.afterDataGenerationEvents(options, JSONArray, chart, ganttData, treeData);
        } catch (e) {
            // console.log('Error in renderChart', e);
        }
    }

    private updateBaselineColor(tasks){
        // PBX-15369 From anychart version 8.11.0, even though if don't pass baseLineStart and baseLineEnd, anychart will calculate it automatically.
        // Thus, if we turn off showPlannedTaskInParent toggle, it won't hide the parent planned bar.
        // Hence changing fill and stroke to none for the parent nodes manually.

        tasks.forEach((task) => {
            if(task['childNodes'] ){ // only for parent nodes
                task['baseline'] = {fill:  'none' , stroke: 'none' , selected: { fill: 'none', stroke: 'none' } };
            }
        });
    }

    private filterBlankTask(tasks) {
        return tasks.filter((task) => {
            if (task.newParent) {
                task.parent = task.newParent;
            }
            return !task.isBlank;
        });
    }

    private aggregateAvgUpLevel(node: any, individualTasks: any) {
        if (node.parent != null) {
            const parentNode = individualTasks[node.parent];
            parentNode.nodeTrackCount = parentNode.nodeTrackCount + 1;
            if (parentNode.measureDetailsValue && node.measureDetailsValue) {
                const measureDetailsAvg = parentNode.measureDetailsValue.average;
                const measureDetailsFormattedValueAvg = parentNode.measureDetailsFormattedValue.average;
                const nodeMeasureDetailsValueAvg = node.measureDetailsValue.average;
                const nodeMeasureDetailsFormattedValueAvg = node.measureDetailsFormattedValue.average;
                const nodePercentageHelper = node.percentageHelper;
                const measureDetailsFormattedValuePercenage = parentNode.measureDetailsFormattedValue.percentage;
                const measureDetailsValuePercentage = parentNode.measureDetailsValue.percentage;
                if (parentNode.percentageHelper == undefined) {
                    parentNode.percentageHelper = {};
                }
                const parentPercentageHelper = parentNode.percentageHelper;
                const dateDiff = parentNode.actualEnd - parentNode.actualStart;
                Object.keys(nodeMeasureDetailsValueAvg).forEach((key) => {
                    if (nodeMeasureDetailsValueAvg[key] !== null) {
                        measureDetailsAvg[key] =
                            (measureDetailsAvg[key] == undefined ? 0 : measureDetailsAvg[key]) +
                            nodeMeasureDetailsValueAvg[key];
                        measureDetailsFormattedValueAvg[key] =
                            (measureDetailsFormattedValueAvg[key] == undefined
                                ? 0
                                : measureDetailsFormattedValueAvg[key]) + nodeMeasureDetailsFormattedValueAvg[key];
                    }
                    if (parentPercentageHelper[key] == undefined) {
                        parentPercentageHelper[key] = {
                            base: nodePercentageHelper[key].base,
                            finished: nodePercentageHelper[key].finished,
                            finishedFormatted: nodePercentageHelper[key].finishedFormatted,
                        };
                    } else {
                        parentPercentageHelper[key] = {
                            base: nodePercentageHelper[key].base + parentPercentageHelper[key].base,
                            finished: nodePercentageHelper[key].finished + parentPercentageHelper[key].finished,
                            finishedFormatted:
                                nodePercentageHelper[key].finishedFormatted +
                                parentPercentageHelper[key].finishedFormatted,
                        };
                    }
                    if (parentNode.nodeTrackCount == parentNode.immeditateNodeCount) {
                        if (measureDetailsAvg[key] != null) {
                            measureDetailsAvg[key] = measureDetailsAvg[key] / parentNode.immeditateNodeCount;
                            measureDetailsFormattedValueAvg[key] =
                                measureDetailsFormattedValueAvg[key] / parentNode.immeditateNodeCount;
                        }
                        if (parentPercentageHelper[key] != null) {
                            measureDetailsFormattedValuePercenage[key] =
                                parentPercentageHelper[key].base == 0
                                    ? 0
                                    : parentPercentageHelper[key].finishedFormatted / parentPercentageHelper[key].base;
                            measureDetailsValuePercentage[key] =
                                parentPercentageHelper[key].base == 0
                                    ? 0
                                    : parentPercentageHelper[key].finished / parentPercentageHelper[key].base;
                            parentPercentageHelper[key].base = dateDiff;
                            parentPercentageHelper[key].finished = dateDiff * measureDetailsValuePercentage[key];
                            parentPercentageHelper[key].finishedFormatted =
                                dateDiff * measureDetailsFormattedValuePercenage[key];
                        }
                    }
                });
                if (nodePercentageHelper && nodePercentageHelper['progressValue']) {
                    if (parentPercentageHelper['progressValue'] == undefined) {
                        parentPercentageHelper['progressValue'] = {
                            base: nodePercentageHelper['progressValue'].base,
                            finished: nodePercentageHelper['progressValue'].finished,
                            finishedFormatted: nodePercentageHelper['progressValue'].finishedFormatted,
                        };
                    } else {
                        parentPercentageHelper['progressValue'] = {
                            base:
                                nodePercentageHelper['progressValue'].base +
                                parentPercentageHelper['progressValue'].base,
                            finished:
                                nodePercentageHelper['progressValue'].finished +
                                parentPercentageHelper['progressValue'].finished,
                            finishedFormatted:
                                nodePercentageHelper['progressValue'].finishedFormatted +
                                parentPercentageHelper['progressValue'].finishedFormatted,
                        };
                    }
                    if (parentNode.nodeTrackCount == parentNode.immeditateNodeCount) {
                        parentNode.progressValue =
                            parentPercentageHelper['progressValue'].base == 0
                                ? 0
                                : parentPercentageHelper['progressValue'].finished /
                                  parentPercentageHelper['progressValue'].base;
                        parentPercentageHelper['progressValue'] = {
                            base: dateDiff,
                            finished: dateDiff * parentNode.progressValue,
                            finishedFormatted: dateDiff * parentNode.progressValue,
                        };
                    }
                }
            }
        }
    }

    private moveDataLabelLevelUp(parentNode, childNode) {
        if (childNode.dataLabel) {
            const dataLabel = childNode.dataLabel;
            parentNode.dataLabel = dataLabel;
    
            parentNode.cf[dataLabel.id] = childNode.cf[dataLabel.id];
            parentNode.cfFormattedValues[dataLabel.id] = childNode.cfFormattedValues[dataLabel.id];
        }
    }

    private handleUnbalancedHierarchy(task, individualTasks) {
        //for levelup displaycolumn and others
        const connectors = [];
        const isPlannedTaskPresent =
            this.JSONArray.plannedStartDate.length > 0 && this.JSONArray.plannedEndDate.length > 0;
        let plannedTaskMinStart = Infinity,
            plannedTaskMaxEnd = -Infinity,
            plannedMinIndex = 0;
        const isAllChildBlank = task.childNodes
            .map((childName, index) => {
                const childNode = individualTasks[childName];
                if (childNode) {
                    if (isPlannedTaskPresent) {
                        if (childNode.baselineStart < plannedTaskMinStart) {
                            plannedTaskMinStart = childNode.baselineStart;
                            plannedMinIndex = index;
                        }
                        if (childNode.baselineEnd > plannedTaskMaxEnd) {
                            plannedTaskMaxEnd = childNode.baselineEnd;
                        }
                    }
                    childNode.connector && connectors.push(...childNode.connector);
                    return childNode.isBlank;
                }
            })
            .every((value) => value);
        if (isAllChildBlank) {
            task.isConsideredAsChild = true;
            task.displayColumns = individualTasks[task.childNodes[0]].displayColumns;
            task.tooltips = individualTasks[task.childNodes[0]].tooltips;
            connectors.map((connector) => {
                if (individualTasks[connector.connectTo]) {
                    const parentNodeConnetTo = individualTasks[individualTasks[connector.connectTo].parent];
                    //for levelup connectors connecto
                    const isAllChildBlank = parentNodeConnetTo.childNodes
                        .map((childName) => {
                            const childNode = individualTasks[childName];
                            if (individualTasks[childName]) {
                                return childNode.isBlank;
                            }
                        })
                        .every((value) => value);
                    if (isAllChildBlank)
                        connector.connectTo = individualTasks[individualTasks[connector.connectTo].parent].actualKey;
                }
            });
            if (task.connector) {
                task.connector.push(...connectors);
            } else {
                task.connector = connectors;
            }
            this.aggCfLevelUp(task, individualTasks[task.childNodes[0]]);
            const datalabel = this.JSONArray.dataLabel[0];
            if (datalabel && datalabel.type.text) this.moveDataLabelLevelUp(task, individualTasks[task.childNodes[0]]);
            if (isPlannedTaskPresent) {
                task.baselineStart = plannedTaskMinStart;
                task.baselineEnd = plannedTaskMaxEnd;
                task['cf'][this.JSONArray.plannedStartDate[0].name] =
                    individualTasks[task.childNodes[plannedMinIndex]].cf[this.JSONArray.plannedStartDate[0].name];
                task['cfFormattedValues'][this.JSONArray.plannedStartDate[0].name] =
                    individualTasks[task.childNodes[plannedMinIndex]].cfFormattedValues[
                        this.JSONArray.plannedStartDate[0].name
                    ];
                task['cf'][this.JSONArray.plannedEndDate[0].name] =
                    individualTasks[task.childNodes[plannedMinIndex]].cf[this.JSONArray.plannedEndDate[0].name];
                task['cfFormattedValues'][this.JSONArray.plannedEndDate[0].name] =
                    individualTasks[task.childNodes[plannedMinIndex]].cfFormattedValues[
                        this.JSONArray.plannedEndDate[0].name
                    ];
            }
        }
    }

    private mergeCalculatedValues(JSONArray: JSONArrayDef, nodeLevels: any[], individualTasks: any) {
        if (individualTasks['grand_total'] !== undefined) {
            individualTasks['grand_total']['immeditateNodeCount'] = nodeLevels[1].length;
        }
        nodeLevels.reverse();
        for (let depth = 0; depth < nodeLevels.length; depth++) {
            nodeLevels[depth].forEach((task, index) => {
                if (depth == 0) {
                    this.aggregateAvgUpLevel(task, individualTasks);
                    this.getMeasureMinMax(task);
                    task['connector'] = this.connectors(JSONArray, index);
                    return;
                } else {
                    this.aggregateAvgUpLevel(task, individualTasks);
                    if (task.measureDetailsValue) {
                        task.displayColumnsMeasure &&
                            this.measureAggregation(
                                task.displayColumnsMeasure,
                                task.measureDetailsValue,
                                task.measureDetailsFormattedValue,
                            );
                        task.displayColumns &&
                            this.dimensionAggregation(
                                task.displayColumns,
                                task.dimensionDetailsValue,
                                task.dimensionDetailsFormattedValue,
                            );
                        this.cfAggregation(task.measureDetailsValue, task.cf);
                        this.cfAggregationDimension(
                            task.dimensionDetailsValue,
                            task.dimensionDetailsFormattedValue,
                            task.cf,
                            task.cfFormattedValues,
                        );
                        task.tooltips &&
                            this.measureAggregation(
                                task.tooltips,
                                task.measureDetailsValue,
                                task.measureDetailsFormattedValue,
                            );
                        if (task.dataLabel)
                            this.measureAggregationHelper(
                                task.dataLabel,
                                task.measureDetailsValue,
                                task.measureDetailsFormattedValue,
                            );
                        if (
                            this.settings.chartOptions.hideBlankGantt != 'none' &&
                            task.childNodes &&
                            task.childNodes.length > 0
                        ) {
                            this.handleUnbalancedHierarchy(task, individualTasks);
                        }
                    }
                }
                this.getMeasureMinMax(task);
            });
        }
    }

    private aggCfLevelUp(parentNode: any, childNode: any) {
        childNode.displayColumns.forEach((column) => {
            parentNode.cf[column.id] = childNode.cf[column.id];
            parentNode.cfFormattedValues[column.id] = childNode.cfFormattedValues[column.id];
        });
        childNode.tooltips &&
            childNode.tooltips.forEach((column) => {
                parentNode.cf[column.id] = childNode.cf[column.id];
                parentNode.cfFormattedValues[column.id] = childNode.cfFormattedValues[column.id];
            });
    }

    private hideParentBarOnCollapse(chart: any) {
        chart.listen('rowCollapseExpand', (e) => {
            if (e.collapsed) {
                const minTime = chart.xScale().getTotalRange().min;
                const maxTime = chart.xScale().getTotalRange().max;
                chart.getTimeline().scale().minimum(minTime);
                chart.getTimeline().scale().maximum(maxTime);

                e.item['set']('actualStartBk', e.item['get']('actualStart'));
                e.item['set']('actualEndBk', e.item['get']('actualEnd'));
                e.item['set']('actualStart', 0);
                e.item['set']('actualEnd', 0);
                e.item['set']('isCollapses', true);
            } else {
                e.item['set']('actualStart', e.item['get']('actualStartBk'));
                e.item['set']('actualEnd', e.item['get']('actualEndBk'));
                e.item['set']('isCollapses', false);
            }
        });
    }

    private hideParentBarOnExpand(chart: any) {
        chart.listen('rowCollapseExpand', (e) => {
            if (e.collapsed) {
                e.item['set']('actualStart', e.item['get']('actualStartBk'));
                e.item['set']('actualEnd', e.item['get']('actualEndBk'));
                e.item['set']('isCollapses', false);
            }
            else {
                const minTime = chart.xScale().getTotalRange().min;
                const maxTime = chart.xScale().getTotalRange().max;
                chart.getTimeline().scale().minimum(minTime);
                chart.getTimeline().scale().maximum(maxTime);

                e.item['set']('actualStartBk', e.item['get']('actualStart'));
                e.item['set']('actualEndBk', e.item['get']('actualEnd'));
                e.item['set']('actualStart', 0);
                e.item['set']('actualEnd', 0);
                e.item['set']('isCollapses', true);
            }
        });
    }
    
    private hideBorderColor() {
        this.settings.dataColors.actualParentBorderColor = '#11ffee00';
        this.settings.dataColors.actualChildBorderColor = '#11ffee00';
    }

    private getIsLegendPresent(JSONArray: JSONArrayDef) {
        let isShowCFInLegend = false;
        const { conditionalformatting } = this.settings.editor; 
        if(conditionalformatting != ""){
            const conditionalFormat = JSON.parse(conditionalformatting);
            isShowCFInLegend = conditionalFormat.some((cf) => cf.enabled && cf['showInLegend']);
        }
        return isShowCFInLegend || (this.milestoneConfig.generalConfig.milestoneLegend && (JSONArray.milestoneType.length > 0 || JSONArray.milestones.length > 0));
    }

    private afterDataGenerationEvents(
        options: RenderOptions,
        JSONArray: JSONArrayDef,
        chart: any,
        ganttData: any,
        treeData: any,
    ) {
        if (this.settings.chartOptions.ganttChartType === 'gantt') {
            treeData.listen('treeItemUpdate', (e) => this.treeItemGantt(e, this));
            treeData.listen('treeItemMove', (e) => this.treeItemGantt(e, this));

            //hide parent bar
            if (this.settings.chartOptions.hideParentOnCollapse) this.hideParentBarOnCollapse(chart);
            if (this.settings.chartOptions.hideParentOnExpand) this.hideParentBarOnExpand(chart);
        } else {
            treeData.listen('treeItemUpdate', (e) => this.treeItemGanttResource(e, this));
            treeData.listen('treeItemMove', (e) => this.treeItemGanttResource(e, this));
        }

        if (this.settings.dataColors.hideParentBorder) {
            this.hideBorderColor();
        }

        //license and removing logo
        anychartCustomBuildMinJs.licenseKey('visualbi-c452c63-54b6c31f');
        chart.credits().logoSrc(null);
        chart.credits(false);
        Helper.APPLY_SETTINGS(chart, this.settings, this, options.data, JSONArray, options.highContrast, this.anychartSelectionManager);
        Helper.APPLY_HIGHCONTRAST(options.highContrast, chart, this.settings);
        Helper.APPLYLISTENERS(chart, this._selectionIdBuilder, this.anychartSelectionManager, options.settings, this, options.highContrast);
        this.appendTooltipStyleToBody(this.settings, this.chartContainer);
        this.applyCustomTimelineShape(chart, this.settings);

        const chartContainer: HTMLElement = document.createElement('div');
        chartContainer.id = 'chartContainer';
        const isLegendPresent = this.getIsLegendPresent(JSONArray);
        if (isLegendPresent){
            const mainChartContainer: HTMLElement = document.createElement('div');
            mainChartContainer.id = 'mainChartContainer';
            chartContainer.appendChild(mainChartContainer);
            chartContainer.style.height = options.viewPort.height > 240 ? ((this.settings.legend.vpositionGantt == 'bottom') ? '98%': '90%') : '85%';
            mainChartContainer.style.height = `calc(100% - ${this.calculateLegendHeight(this.settings.legend)}px)`;
        } 
        else chartContainer.style.height = '100%';
        const containerID = isLegendPresent ? 'mainChartContainer' : 'chartContainer';
        this.chartContainer.appendChild(chartContainer);
        this.chartRefContainer = chartContainer;
        chart.container(containerID).draw(); // set container and initiate drawing
        const scale = chart.xScale();
        const getTotalRange = scale.getTotalRange();
        if (new Date(getTotalRange.min).getFullYear() <= 1970 && !(new Date(getTotalRange.min).getFullYear() == 1899)) {
            Util.EMPTYNODE(this.chartContainer);
            UIIndicators.showErrorMessage(this.chartContainer, 'Please provide valid date');
            this.isEditorOpen = false;
            return;
        }
        this.afterDrawEvents(chart);
        //Enable live Editing
        if (this.count > 0) {
            if (this.expandLevelsKey.length > 0) {
                if (this.expandLevelsKey.length !== this.currentArray.length) {
                    this.currentArray = this.expandLevelsKey;
                }
            }
        }
        if (this.settings.interaction.show && this.isGanttEnterprise) this.liveEditing(chart);
        if (this.settings.summaryTable.show){
            this.renderDisplayData(options.data);
        }
        const parsedCF = this.settings.editor.conditionalformatting != '' ? JSON.parse(this.settings.editor.conditionalformatting): ''
        const isMeasurePresent = JSONArray.duration.length > 0 || JSONArray.progressBase.length > 0 || JSONArray.progressValue.length > 0 || JSONArray.displayMeasures.length > 0;
        if ((this.milestoneConfig.generalConfig.milestoneLegend &&
            (JSONArray.milestoneType.length > 0 || JSONArray.milestones.length > 0)) ||  (isMeasurePresent && parsedCF != '' && parsedCF.some((cf) => cf.enabled && cf.showInLegend))
        )
            this.standAloneLegend(JSONArray, options);
        if (this.settings.miscellaneous.enableFooter) this.footer(chart, JSONArray);
        this.chartContainer.appendChild(this['divGanttControls']);
        this.chartContainer.appendChild(this['zoomButtonDiv']);
        this.chartContainer.appendChild(this.getErrorMessagePopUp());
        if (
            this.settings.legend.vpositionGantt == 'top' &&
            this.milestoneConfig.generalConfig.milestoneLegend &&
            (JSONArray.milestoneType.length > 0 || JSONArray.milestones.length > 0)
        ) {
            const displayIcon: any = document.getElementsByClassName('vbi-display-data-icon');
            if (displayIcon && displayIcon[0] && displayIcon[0].style) {
                displayIcon[0].style.cssText = `top:${
                    this.settings.legend.legendFontSize + 15
                }px !important;right:50px !important`;
            }
        }
        // Bookmarking
        // this._selectionIdBuilder.registerOnSelectCallback((selectionIds) => {
        //   if (selectionIds.length > 0) {
        //     this.anychartSelectionManager.select(selectionIds,false);
        //   }
        // });
    }

    private getErrorMessagePopUp() {
        const popContainer = document.createElement('div');
        popContainer.id = 'info-popup-container';
        popContainer.className = 'info-popup-container hideElement';
        const infoPopup = document.createElement('div');
        infoPopup.className = 'info-popup';
        popContainer.appendChild(infoPopup);
        const solidIcon = document.createElement('span');
        solidIcon.className = 'icon icon--Info';
        infoPopup.appendChild(solidIcon);
        const messageBody = document.createElement('div');
        messageBody.className = 'body';
        messageBody.textContent = 'Error in writing data';
        infoPopup.appendChild(messageBody);
        const closeIcon = document.createElement('span');
        closeIcon.className = 'icon icon--ChromeClose';
        infoPopup.appendChild(closeIcon);
        closeIcon.onclick = () => {
            popContainer.classList.add('hideElement');
        };
        return popContainer;
    }

    private appendTooltipStyleToBody(settings: VisualSettings, chartContainer: HTMLElement) {
        const style = document.createElement('style');
        style.id = 'anychart-tooltip-style';
        style.textContent = `.anychart-tooltip{
        background-color: ${settings.customTooltip.customTooltipBackgroundColor} !important;
    }`;
        chartContainer.appendChild(style);
    }

    private measureAggregation(measureAggregation, measureDetailsValue, measureDetailsFormattedValue) {
        measureAggregation.forEach((measureAgg) =>
            this.measureAggregationHelper(measureAgg, measureDetailsValue, measureDetailsFormattedValue),
        );
    }

    private dimensionAggregation(dimensionAggregation, dimensionDetailsValue, dimensionDetailsFormattedValue) {
        dimensionAggregation.forEach((dimensionAgg) => {
            dimensionAgg.value = dimensionDetailsFormattedValue[dimensionAgg.id];
        });
    }

    private measureAggregationHelper(measureAgg, measureDetailsValue, measureDetailsFormattedValue) {
        if (measureDetailsValue[this.measuresAggregationType[measureAgg.id]][measureAgg.id] == null) {
            return;
        }
        measureAgg.value = measureDetailsValue[this.measuresAggregationType[measureAgg.id]][measureAgg.id];
        measureAgg.modifiedValues =
            measureDetailsFormattedValue[this.measuresAggregationType[measureAgg.id]][measureAgg.id];
        if (this.measuresAggregationType[measureAgg.id] == 'percentage') {
            measureAgg.value = measureAgg.value * 100;
            measureAgg.modifiedValues = measureAgg.modifiedValues * 100;
        }
    }

    private cfAggregation(measureDetailsValue, cfMeasureAgg) {
        Object.keys(this.measuresAggregationType).forEach((key) => {
            cfMeasureAgg[key] = measureDetailsValue[this.measuresAggregationType[key]][key];
        });
    }

    private cfAggregationDimension(dimensionDetailsValue, dimensionDetailsFormattedValue, cf, cfFormatted) {
        Object.keys(dimensionDetailsValue).forEach((key) => {
            cf[key] = dimensionDetailsValue[key];
            cfFormatted[key] = dimensionDetailsFormattedValue[key];
        });
    }

    private getMeasureMinMax(data) {
        Object.keys(data.cf).forEach((key) => {
            if (typeof data.cf[key] == 'number') {
                if (this.measureMinMax[key]) {
                    const obj = this.measureMinMax[key];
                    if (data.cf[key] < obj.min) {
                        obj.min = data.cf[key];
                    }
                    if (data.cf[key] > obj.max) {
                        obj.max = data.cf[key];
                    }
                } else {
                    const obj = {};
                    obj['min'] = data.cf[key];
                    obj['max'] = data.cf[key];
                    this.measureMinMax[key] = obj;
                }
            }
        });
    }

    private footer(chart, JSONArray: JSONArrayDef) {
        const credits = chart.credits();
        const url = this.getFooterURL(this.settings.miscellaneous.footerUrl);
        credits.enabled(true);
        credits.text(this.settings.miscellaneous.footerText);
        credits.url(url);
        const creditDiv = document.getElementsByClassName('anychart-credits');
        if (creditDiv && creditDiv[0] && creditDiv[0].childNodes && creditDiv[0].childNodes[0]) {
            if(this.getIsLegendPresent(JSONArray)){
                const parentContainer = document.getElementById('chartContainer');
                parentContainer.appendChild(creditDiv[0]);
            }
            const aTag: any = creditDiv[0].childNodes[0];
            aTag.setAttribute('title', url);
            aTag.onclick = (e) => {
                (<any>this).host.launchUrl(escape(url));
                e.preventDefault();
            };
        }
    }

    private getURLMatcher() {
        return /^(?:\w+:)?\/\/([^\s.]+\.\S{2}|localhost[:?\d]*)\S*$/;
    }

    private getFooterURL(url) {
        return this.getURLMatcher().test(url) ? url : 'https://' + url;
    }

    private isValidURL(url: string): { isValiedURL: boolean; url: string } {
        const validURL = (str) => {
            const pattern = new RegExp(
                /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i,
            );
            return pattern.test(str);
        };
        if (validURL(url)) {
            try {
                new URL(url);
            } catch (err) {
                url = 'https://' + url;
            }
            return {
                isValiedURL: true,
                url: url,
            };
        } else {
            return {
                isValiedURL: false,
                url: url,
            };
        }
    }

    private treeItemGantt(e: any, instance: GanttChart) {
        // if (!this.allowPropertyUpdate) return;
        const liveEditingKey = e.item['get']('liveEditingKey');
        const actualStart = e.item['get']('actualStart');
        const actualEnd = e.item['get']('actualEnd');
        const baselineStart = e.item['get']('baselineStart');
        const baselineEnd = e.item['get']('baselineEnd');
        const progressValue = e.item['get']('progressValue');
        const hierarchy = e.item['get']('nonUniqueKey')?.split('~!~');
        const isChildren = e.item['get']('isChildren');
        const isMilestone = e.item['get']('isMilestone');
        const tooltips = e.item['get']('tooltips');
        const taskId = e.item['get']('connectorID');

        if (!(isChildren || isMilestone)) return;
        this.modifiedData[liveEditingKey] = {
            hierarchy,
            actualStart,
            actualEnd,
            baselineStart,
            baselineEnd,
            progressValue,
            liveEditingKey,
            tooltips,
            taskId,
            isRecentlyModified: this.settings.writeBack.sendOnlyModifiedItem,
        };
        instance.modifiedDataUpdateProperty();
    }

    public pushToEndPoint = async () => {
        //writeBack UPDATE_DATA method call
        /*
        try {
          await WriteBack.UPDATE_DATA(this.modifiedData, this.settings.writeBack.updateEndPoint, this.settings);
          this.isDataForUpdatePresent = false;
        } catch (err) {
          this.isErrorInWritingData = true;
          console.log(err);
        }
    */
    };

    public modifiedDataUpdateProperty = async () => {
        this.isDataForUpdatePresent = true;
        if (
            this.settings.writeBack.show &&
            this.settings.interaction.show &&
            this.settings.writeBack.updateEndPoint != '' &&
            !this.settings.writeBack.sendOnlyModifiedItem
        ) {
            await this.pushToEndPoint();
        }
        const updateProperties = [];
        updateProperties.push({
            objectName: 'interaction',
            properties: {
                modifiedData: JSON.stringify(this.modifiedData),
            },
        });
        const peristObj = {
            merge: updateProperties,
        };
        (<any>this).host.persistProperties(peristObj);
    };

    private treeItemGanttResource(e: any, instance: GanttChart) {
        // if (!this.allowPropertyUpdate) return;
        const index = e.item['get']('index');
        const periods = e.item['get']('periods');
        if (periods && index !== undefined) {
            periods.forEach((period) => {
                const hierarchy = period.nonUniqueKey.split('~!~');
                hierarchy.pop();
                const { liveEditingKey, start, end } = period;
                if (this.modifiedData[liveEditingKey]) {
                    this.modifiedData[liveEditingKey]['actualStart'] = start;
                    this.modifiedData[liveEditingKey]['actualEnd'] = end;
                } else {
                    this.modifiedData[liveEditingKey] = {
                        hierarchy,
                        actualStart: start,
                        actualEnd: end,
                        isRecentlyModified: this.settings.writeBack.sendOnlyModifiedItem,
                    };
                }
            });
        }
        instance.modifiedDataUpdateProperty();
    }

    private calculateLegendHeight(legend) {
        const {legendFontSize, titleText, vpositionGantt} = legend
        const minSize = 8;
        const sizeDiff = legendFontSize - minSize;
        let coefficient = vpositionGantt === 'top' ? 2.5 : 3;
       
        if (titleText != '') {
            // Calculate the minimum coefficient with a threshold
            const minCoefficient = Math.min(0.05 * (sizeDiff <= 0 ? -3.75 : sizeDiff), 2);

            // Use the minimum coefficient to determine the final coefficient
            coefficient = 5 - minCoefficient;
        }
        // Calculate and return the div height
        
        return legendFontSize * coefficient;
    }

    private standAloneLegend(JSONArray: JSONArrayDef, options: RenderOptions) {
        // create and setup legend
        const { highContrast , data } = options;
        const { titleText, vpositionGantt } = this.settings.legend;

        const legendDiv: HTMLElement = document.createElement('div');
        legendDiv.id = 'legendContainer';
        legendDiv.style.height = this.calculateLegendHeight(this.settings.legend) + 'px';
        legendDiv.style.marginTop = '28px';
        if (vpositionGantt === 'bottom' && titleText)
            legendDiv.style.marginBottom = '15px';

        //legend item construction
        const legendItems = [];
        const eachIndex = 0;
        const milestoneIconTypes = [];
        if(this.milestoneConfig.generalConfig.milestoneLegend){
            const milestoneLegendItems = this.createMilestoneLegendItems(eachIndex, JSONArray, highContrast);
            if(milestoneLegendItems.length){
                legendItems.push(...milestoneLegendItems);
                milestoneLegendItems.forEach((item) => {
                    if (typeof item.iconType !== 'function') {
                        const iconStyle = `${item.iconType}_${item.iconStroke}`;
                        if (item?.iconType && !milestoneIconTypes.includes(iconStyle)) milestoneIconTypes.push(iconStyle);
                    }
                })
            }
        }
        const cfLegendData = this.createCFLegendData(eachIndex, data, highContrast, milestoneIconTypes, JSONArray);
        if(cfLegendData.length){
            legendItems.push(...cfLegendData);
        }
        if(legendItems.length){
            if (vpositionGantt == 'top') {
                const parentContainer = document.getElementById('chartContainer');
                parentContainer.insertAdjacentElement('afterbegin', legendDiv);
            } else {
                legendDiv.classList.add('bottomLegend');
                this.chartContainer.appendChild(legendDiv);
            }
            const legend = anychartCustomBuildMinJs.standalones.legend();
            this.drawCFLegendContainer(legend, legendItems, highContrast);
        }
    }

    private createMilestoneLegendItems(eachIndex: number, JSONArray: JSONArrayDef, highContrast: HighContrastColors) {
        const milestoneNames = [], legendItems = [];
        const { generalConfig, singleConfig, milestoneFieldConfig } = this.milestoneConfig;
        const { dataConfigMilestone } = milestoneFieldConfig;
        const drawCustomMilestoneShape = (image) => (path, size) => { path.OW.image(image, 1, 1, size, size); };

        if ((generalConfig.configurationFrom == 'milestoneName' || JSONArray.milestones.length == 0)
            && JSONArray.milestoneType.length > 0) {
            this.milestoneType.formattedValues.forEach((value, index) => {
                let shape, color, stroke;
                if (milestoneNames.indexOf(value) == -1) {
                    milestoneNames.push(value);
                    if (generalConfig.configurationTypeMileStone == 'all') {
                        const imageSource = singleConfig.image;
                        if (generalConfig.isCustomImage && imageSource) {
                            shape = drawCustomMilestoneShape(imageSource);
                        } else {
                            shape = singleConfig.milestoneIconName;
                        }
                        color = singleConfig.milestoneFillColor;
                        stroke = singleConfig.milestoneBorderColor;
                    } else {
                        const imageSource = this.milestoneType.images[index];
                        if (generalConfig.isCustomImage && imageSource) {
                            shape = drawCustomMilestoneShape(imageSource);
                        } else {
                            shape = this.milestoneType.milestoneIconNames[index];
                        }
                        color = this.milestoneType.milestoneFillColors[index];
                        stroke = this.milestoneType.milestoneBorderColors[index];
                    }
                    if (highContrast.isHighContrast) {
                        color = highContrast.foreground;
                        stroke = highContrast.foreground;
                    }
                    legendItems.push({ index: eachIndex, text: value == null ? 'Blank' : value, iconFill: color, iconType: shape, iconStroke: stroke });
                    eachIndex++;
                }
            });
        } else if (JSONArray.milestones.length > 0) {
            if (generalConfig.mileStoneFromData && this.isMilestonePresentInData) {
                let fill: string, stroke: string, shape;
                if (generalConfig.configurationTypeMileStone == 'all') {
                    const imageSource = singleConfig.image;
                    if (generalConfig.isCustomImage && imageSource) {
                        shape = drawCustomMilestoneShape(imageSource);
                    } else {
                        shape = singleConfig.milestoneIconName;
                    }
                    fill = singleConfig.milestoneFillColor;
                    stroke = singleConfig.milestoneBorderColor;
                } else {
                    const imageSource = dataConfigMilestone.image;
                    if (generalConfig.isCustomImage && imageSource) {
                        shape = drawCustomMilestoneShape(imageSource);
                    } else {
                        shape = dataConfigMilestone.milestoneIconName;
                    }
                    fill = dataConfigMilestone.milestoneFillColor;
                    stroke = dataConfigMilestone.milestoneBorderColor;
                }
                if (highContrast.isHighContrast) {
                    fill = highContrast.foreground;
                    stroke = highContrast.foreground;
                }
                legendItems.push({ index: 0, text: 'Milestone From Data', iconFill: fill, iconType: shape, iconStroke: stroke, });
            }
            JSONArray.milestones.forEach((milestone) => {
                if (milestoneNames.indexOf(milestone.name) == -1) {
                    milestoneNames.push(milestone.name);
                    let shape = milestone.milestoneIconName, color, stroke;
                    if (generalConfig.configurationTypeMileStone == 'all') {
                        const imageSource = singleConfig.image;
                        if (generalConfig.isCustomImage && imageSource) {
                            shape = drawCustomMilestoneShape(imageSource);
                        } else {
                            shape = singleConfig.milestoneIconName;
                        }
                        color = singleConfig.milestoneFillColor;
                        stroke = singleConfig.milestoneBorderColor;
                    } else {
                        const imageSource = milestone.image;
                        if (generalConfig.isCustomImage && imageSource) {
                            shape = drawCustomMilestoneShape(imageSource);
                        }
                        color = milestone.milestoneFillColor;
                        stroke = milestone.milestoneBorderColor;
                    }
                    if (highContrast.isHighContrast) {
                        color = highContrast.foreground;
                        stroke = highContrast.foreground;
                    }
                    legendItems.push({ index: eachIndex, text: milestone.label, iconFill: color, iconType: shape, iconStroke: stroke, });
                    eachIndex++
                }
            });
        }
        return legendItems;
    }

    private drawCFLegendContainer(legend, legendItems, highContrast){
        // Legend Title
        const { hposition, titleText, vpositionGantt, legendFontSize, color} = this.settings.legend;
        const { isHighContrast, foreground } = highContrast;
        const titleContent = titleText == '' ? '' : titleText;
        const legendContainer = document.getElementById('legendContainer');
        const legendHeight = legendContainer.clientHeight;
        if (titleText !== '') {
            legend.title(titleContent);
            legend.title().height(vpositionGantt == 'bottom' ? legendHeight * 0.6 : legendHeight * 0.4).align(hposition);
            legend.title().textOverflow('...');
            legend.title().padding(vpositionGantt == 'bottom' ? 18 : 0, 0, vpositionGantt == 'bottom' ? 0 : 5, 0);
            legend.title().fontSize(legendFontSize);
            legend.title().fontFamily(this.settings.chartOptions.fontfamily);
            legend.title().fontColor(isHighContrast ? foreground : color);
        }
        
        //legend common properties
        legend.align(hposition);
        legend.iconSize(legendFontSize);
        legend.fontSize(legendFontSize);
        legend.fontFamily(this.settings.chartOptions.fontfamily);
        legend.fontColor(isHighContrast ? foreground : color);
        legend.margin(2, 2, 2, 2);
        //legend items
        legend.items(legendItems);
        // draw legend
        legend.container('legendContainer').draw();
        //disable anychart credits
        legend.container().credits().enabled(false);
    }

    private createCFLegendData(eachIndex: number, data: Data, highContrast: HighContrastColors, milestoneIconTypes: string[], JSONArray: JSONArrayDef){
        const legendItems = [];
        if(this.settings.editor.conditionalformatting != ""){
            const conditionalFormat = JSON.parse(this.settings.editor.conditionalformatting);
            conditionalFormat.forEach((cf) => {
                const isValidRule = cf.highlighedMeasure === JSONArray.duration?.[0]?.name 
                    || cf.highlighedMeasure === JSONArray.progressBase?.[0]?.name 
                    || cf.highlighedMeasure === JSONArray.progressValue?.[0]?.name  
                    || JSONArray.displayMeasures?.some((c) => c?.name === cf.highlighedMeasure);
                if(isValidRule){
                    if(cf.enabled && cf['showInLegend']){
                        if(cf.conditions[0].ruleType !== 'targetValue'){
                            const legendItem = this.createCfLegendItems(cf, eachIndex, highContrast, milestoneIconTypes);
                            if(legendItem.legendItems.length){
                                legendItems.push(...legendItem.legendItems);
                                eachIndex = legendItem.eachIndex;
                            }
                        } else {
                            if (cf.conditions[0].enableCustom) {
                                const targetValue = cf.conditions[0].targetValue;
                                const noOfRanges = targetValue.length;
                                for (let i = 0; i < noOfRanges; i++) {
                                    const { from, to, color } = targetValue[i];
                                    const legendItem = this.createCfLegendItems(cf, eachIndex, highContrast, milestoneIconTypes, color, ` (${from}-${to})`);
                                    if (legendItem.legendItems.length) {
                                        legendItems.push(...legendItem.legendItems);
                                        eachIndex = legendItem.eachIndex;
                                    }
                                }
                            } else {
                                const colorScheme = cf.conditions[0].colorScheme;
                                const noOfRanges = colorScheme.numberOfRanges;
                                const measureValues = data.categorical.measures.filter((m) => m.name == cf.highlighedMeasure);
                                measureValues.forEach((measureValue) => {
                                    const { minLocal, maxLocal } = measureValue;
                                    const difference = (maxLocal - minLocal) / noOfRanges;
                                    let initialValue = minLocal;
                                    for (let i = 0; i < noOfRanges; i++) {
                                        const from = initialValue.toFixed(2);
                                        const to = (initialValue + difference).toFixed(2);
                                        const legendItem = this.createCfLegendItems(cf, eachIndex, highContrast, milestoneIconTypes, colorScheme.colors[i], ` (${from}-${to})`);
                                        if (legendItem.legendItems.length) {
                                            legendItems.push(...legendItem.legendItems);
                                            eachIndex = legendItem.eachIndex;
                                        }
                                        initialValue = initialValue + difference;
                                    }
                                })
                            }
                        }
                    }
                }
            })
        }
        return legendItems;
    }

    private createCfLegendItems(cf, eachIndex, highContrast: HighContrastColors, milestoneIconTypes: string[], argsColor = '', ruleRange = '') {
        const legendItems = [];
        const color = highContrast.isHighContrast ? highContrast.foreground : argsColor || cf.color;
        const { milestoneBorderColor, image, milestoneIconName } = this.milestoneConfig.singleConfig;
        const borderColor = highContrast.isHighContrast ? highContrast.foreground : milestoneBorderColor;
        const { legendFontSize } = this.settings.legend;
        const addLegendItem = (text, iconFill, iconType, iconStroke) => {
            legendItems.push({ index: eachIndex, text, iconFill, iconType, iconStroke });
            eachIndex++;
        };
        if (cf.appliedSection.some((a) => a.value == "statusFlag")) {
            const shape = this.getShapeForLegend(cf.icon, false);
            const text = cf.displayName + ruleRange;
            const iconType = (path, size) => {
                const imageHtml = `<span style="font-family: FabricMDL2Icons; color: ${color};font-size:${legendFontSize}">${shape}</span>`;
                const htmlString = String.fromCharCode(104, 116, 109, 108); // to avoid eslint issue of using 'html'
                path.OW[htmlString](1, 1, imageHtml, size, size);
            }
            addLegendItem(text, color, iconType, color);
        }
        if (cf.appliedSection.some((a) => a.value == "milestone")) {
            const shape = this.getShapeForLegend(cf.milestoneShape, true);
            const text = cf.displayName + ruleRange;
            if (cf.isCustomImage && cf.image) {
                const imageSource = cf.image;
                const iconType = (path, size) => {
                    path.OW.image(imageSource, 1, 1, size, size);
                }
                addLegendItem(text, color, iconType, color);
            } else if (shape !== 'default') {
                addLegendItem(text, color, shape, borderColor);
            } else if (shape === 'default') {
                addLegendItem(text, color, milestoneIconName, borderColor);
            } else {
                if (milestoneIconTypes?.length) {
                    milestoneIconTypes.forEach((icon) => {
                        const [iconType, iconColor] = icon.split('_');
                        const strokeColor = highContrast.isHighContrast ? highContrast.foreground : iconColor;
                        addLegendItem(text, color, iconType, strokeColor);
                    })
                } else {
                    const iconType = (path, size) => {
                        path.OW.image(image, 1, 1, size, size);
                    }
                    addLegendItem(text, color, iconType, borderColor);
                }
            }
        }
        if (cf.appliedSection.some((a) => a.value == "progress")) {
            const text = cf.displayName + ruleRange;
            const iconType = (path, size) => {
                path.OW.rect(0, size / 3, size, size / 2).fill(color).stroke(color);
            }
            addLegendItem(text, color, iconType, color);
        }
        return { legendItems, eachIndex };
    }

    private afterDrawEvents(chart) {
        if (this.settings.dataGrid.collapseAllNodes && this.JSONArray.taskName.length > 1) {
            chart.collapseAll();
            this.count++;
            if (this.settings.dataGrid.expandTillLevel !== 0) {
                this.expandLevelsKey.forEach((key) => {
                    chart.expandTask(key);
                });
            }
        }
    }

    private getShapeForLegend(unicode: string, isMilestone: boolean) {
        const fabricIconList = isMilestone ? FabricIconsLists : FabricIconsList;
        const icons = fabricIconList.icons;
        const milestoneIcon = icons.find(icon => icon.unicode === unicode);
        return isMilestone ? milestoneIcon?.name : milestoneIcon?.unicode;
    }


    private convertJSONToArray(data: Data) {
        const dimensionsMeasures = {
            taskName: [],
            actualStartDate: [],
            actualEndDate: [],
            duration: [],
            progressValue: [],
            progressBase: [],
            plannedStartDate: [],
            plannedEndDate: [],
            primaryConnectTo: [],
            primaryConnectorType: [],
            secondaryConnectTo: [],
            secondaryConnectorType: [],
            displayColumn: [],
            displayMeasures: [],
            milestones: [],
            milestoneType: [],
            dataLabel: [],
            referenceStartDate: [],
            referenceEndDate: [],
            referenceText: [],
            tooltips: [],
            taskID: [],
        };
        const dimensionObject = data.categorical.objects.dimensions;
        const dimensionMetaData = data.metadata.dimensions;
        const measureObject = data.categorical.objects.measures;
        const measureMetaData = data.metadata.measures;
        let isAllDimMeasureLengthZero = true;
        let isSomeDimMeasuerLengthZero = false;
        const dimensionsMeasuresObj = this.dimensionsMeasuresObj;
        const { generalConfig } = this.milestoneConfig;
        data.categorical.dimensions.forEach((dimension) => {
            isAllDimMeasureLengthZero = isAllDimMeasureLengthZero && dimension.values.length > 0;
            isSomeDimMeasuerLengthZero = isSomeDimMeasuerLengthZero || dimension.values.length > 0;
            const metaObj = dimensionMetaData.find((dimMeasure) => dimMeasure.name == dimension.name);
            const dimObj = dimensionObject.find((dimMeasure) => dimMeasure.name == dimension.name);
            const objectMergedDimension = this.mergeDimensionMetaData( dimension, metaObj, dimObj, dimensionsMeasuresObj);
            if (this.isDateField(objectMergedDimension.type)) {
                this.dateDimensionArray.push(objectMergedDimension);
            }
            if (dimension.role.TaskID) dimensionsMeasures.taskID.push(objectMergedDimension);
            if (dimension.role.Task) dimensionsMeasures.taskName.push(objectMergedDimension);
            if (dimension.role.displayColumn) dimensionsMeasures.displayColumn.push(objectMergedDimension);
            if (dimension.role.actualStart) dimensionsMeasures.actualStartDate.push(objectMergedDimension);
            if (dimension.role.actualEnd) dimensionsMeasures.actualEndDate.push(objectMergedDimension);
            if (dimension.role.baselineStart) dimensionsMeasures.plannedStartDate.push(objectMergedDimension);
            if (dimension.role.baselineEnd) dimensionsMeasures.plannedEndDate.push(objectMergedDimension);
            if (dimension.role.primaryConnectTo) dimensionsMeasures.primaryConnectTo.push(objectMergedDimension);
            if (dimension.role.primaryConnectorType)
                dimensionsMeasures.primaryConnectorType.push(objectMergedDimension);
            if (dimension.role.secondaryConnectTo) dimensionsMeasures.secondaryConnectTo.push(objectMergedDimension);
            if (dimension.role.secondaryConnectorType)
                dimensionsMeasures.secondaryConnectorType.push(objectMergedDimension);
            if (dimension.role.milestone) dimensionsMeasures.milestones.push(objectMergedDimension);
            if (dimension.role.milestoneType) {
                if (generalConfig.milestoneName == objectMergedDimension.name)
                    this.milestoneType = objectMergedDimension;
                dimensionsMeasures.milestoneType.push(objectMergedDimension);
            }
            if (dimension.role.referenceStartDate) dimensionsMeasures.referenceStartDate.push(objectMergedDimension);
            if (dimension.role.referenceEndDate) dimensionsMeasures.referenceEndDate.push(objectMergedDimension);
            if (dimension.role.referenceText) dimensionsMeasures.referenceText.push(objectMergedDimension);
        });
        data.categorical.measures.forEach((measure) => {
            isAllDimMeasureLengthZero = isAllDimMeasureLengthZero && measure.values.length > 0;
            isSomeDimMeasuerLengthZero = isSomeDimMeasuerLengthZero || measure.values.length > 0;
            const metaObj = measureMetaData.find((dimMeasure) => dimMeasure.name == measure.name);
            const mesObj = measureObject.find((dimMeasure) => dimMeasure.name == measure.name);
            const objectMergedMeasure = this.mergeMeasureMetaData(measure, metaObj, mesObj, dimensionsMeasuresObj);
            if (measure.role.progressBase) dimensionsMeasures.progressBase.push(objectMergedMeasure);
            if (measure.role.progressValue) dimensionsMeasures.progressValue.push(objectMergedMeasure);
            if (measure.role.displayMeasures) dimensionsMeasures.displayMeasures.push(objectMergedMeasure);
            if (measure.role.tmeasure) dimensionsMeasures.tooltips.push(objectMergedMeasure);
            if (measure.role.dataLabel) {
                dimensionsMeasures.dataLabel.push(objectMergedMeasure);
                this.isDataLabeMeasure = objectMergedMeasure.isMeasure;
            }
            if (measure.role.duration) dimensionsMeasures.duration.push(objectMergedMeasure);
            this.measuresArray.push(objectMergedMeasure);
        });
        if (!this.milestoneType) this.milestoneType = dimensionsMeasures.milestoneType[0];
        if (!isAllDimMeasureLengthZero && isSomeDimMeasuerLengthZero) {
            Util.EMPTYNODE(this.chartContainer);
            UIIndicators.showErrorMessage(this.chartContainer, 'Please add the valid hierarchy data');
        }
        this.getGanttResourseTaskTemplate(dimensionsMeasures);
        this.mergeTaskObjectDimension(dimensionsMeasures.taskName);
        if (generalConfig.configurationTypeMileStone == 'individual') {
            if ((generalConfig.configurationFrom == 'milestoneName' || dimensionsMeasures.milestones.length == 0) && dimensionsMeasures.milestoneType.length > 0) {
                this.mergeMilestoneConfigNameMetaData(this.milestoneType);
            } else if (dimensionsMeasures.milestones.length > 0) {
                this.mergeMilestoneConfigMetaData(dimensionsMeasures.milestones);
            }
        }
        this.mergeMilestoneDataLabels(dimensionsMeasures.milestones, dimensionsMeasuresObj);
        this.mergeSelectedWebUrlsToDisplayColumns(dimensionsMeasures.displayColumn);
        return dimensionsMeasures;
    }

    private getGanttResourseTaskTemplate(dimensionsMeasures) {
        if (this.settings.chartOptions.ganttChartType === 'ganttresource') {
            const templateTaskName = { ...dimensionsMeasures.taskName[0] };
            templateTaskName.id = 'periodTemplate';
            templateTaskName.label = 'period';
            templateTaskName.name = 'periodTemplate';
            const values = [];
            for (let taskValueIndex = 0; taskValueIndex < templateTaskName.values.length; taskValueIndex++) {
                values.push(taskValueIndex);
            }
            templateTaskName.formattedValues = values;
            templateTaskName.values = values;
            dimensionsMeasures.taskName.push(templateTaskName);
        }
    }

    private mergeSelectedWebUrlsToDisplayColumns(displayColumn) {
        const webUrls = JSON.parse(this.settings.editor.webUrls);
        displayColumn.forEach((displaycolumn) => {
            const webUrl = webUrls.find((weburl) => weburl.name == displaycolumn.id);
            if (webUrl && webUrl.enabled) {
                const linkedColumn = displayColumn.find((column) => column.id == webUrl.linkedColumn);
                if (linkedColumn) {
                    displaycolumn['linkedWebUrl'] = linkedColumn.values;
                    if (linkedColumn.id == displaycolumn.id && webUrl.displayType == 'icon') {
                        displaycolumn['webUrlIcon'] = webUrl.icon;
                        displaycolumn['webUrlIconColor'] = webUrl.color;
                    }
                }
            }
        });
    }

    private mergeDimensionMetaData(dimension, dimensionMetaData, dimensionObject, dimensionsMeasuresObj) {
        dimension['format'] = dimensionMetaData['format'];
        dimension['type'] = dimensionMetaData['type'];
        dimension['settings'] = dimensionObject['settings'];
        dimension['memberObjects'] = dimensionObject['memberObjects'];
        dimension['mergedProps'] = dimensionObject['mergedProps'];
        const displayColumns = dimensionObject.settings.displayColumn;
        this.dimensionsAggregationType[dimension.name] =
            (displayColumns && displayColumns.columnAggregationType) || 'none';
        this.ivalueFormatters[dimension.name] = valueFormatter.create({
            format: dimension.format,
        }).format;
        dimensionsMeasuresObj[dimension.name] = dimension;
        return dimension;
    }

    private mergeMeasureMetaData(measure, measureMetaData, measureObject, dimensionsMeasuresObj) {
        measure['format'] = measureMetaData['format'];
        measure['type'] = measureMetaData['type'];
        measure['settings'] = measureObject['settings'];
        measure['isMeasure'] = measureMetaData.type.numeric;
        const numberFormatting = measureObject.settings.numberFormatting;
        this.measuresAggregationType[measure.name] = (numberFormatting && numberFormatting.aggregationType) || 'sum';
        dimensionsMeasuresObj[measure.name] = measure;
        return measure;
    }


    private mergeMilestoneConfigMetaData(milestones) {
        const { milestoneFieldConfig, singleConfig }= this.milestoneConfig;
        milestones.forEach((milestone) => {
            const milestoneConfig = milestoneFieldConfig[milestone.name];
            if (milestoneConfig) {
                milestone.milestoneBorderColor = milestoneConfig.milestoneBorderColor;
                milestone.milestoneFillColor = milestoneConfig.milestoneFillColor;
                milestone.milestoneShape = milestoneConfig.milestoneShape;
                milestone.milestoneIconName = milestoneConfig.milestoneIconName;
                milestone.image = milestoneConfig.image;
                milestone.imageName = milestoneConfig.imageName;
            } else {
                milestone.milestoneShape = singleConfig.milestoneShape;
                milestone.milestoneFillColor = singleConfig.milestoneFillColor;
                milestone.milestoneBorderColor = singleConfig.milestoneBorderColor;
                milestone.milestoneIconName = singleConfig.milestoneIconName;
                milestone.image = singleConfig.image;
                milestone.imageName = singleConfig.imageName;
            }
        });
        if (!milestoneFieldConfig.dataConfigMilestone) {
            milestoneFieldConfig.dataConfigMilestone = {
                milestoneShape: singleConfig.milestoneShape,
                milestoneFillColor: singleConfig.milestoneFillColor,
                milestoneBorderColor: singleConfig.milestoneBorderColor,
                milestoneIconName: singleConfig.milestoneIconName,
                image: singleConfig.image,
                imageName: singleConfig.imageName
            };
        }
    }

    private mergeTaskObjectDimension(taskDimensions) {
        const firstTaskDimension = taskDimensions[0];
        const memberObjects = firstTaskDimension.memberObjects;
        if (memberObjects.length == 0) return (firstTaskDimension.mergedProps = {});
        if (taskDimensions.length == 1) return;
        const obj = {};
        firstTaskDimension.values.forEach((value, valueIndex) => {
            if (memberObjects[valueIndex] && memberObjects[valueIndex].dataColors) {
                obj[value] = {
                    actualParentFillColor:
                        memberObjects[valueIndex].dataColors['actualParentFillColor'] &&
                        memberObjects[valueIndex].dataColors['actualParentFillColor'].solid.color,
                    actualParentTrackColor:
                        memberObjects[valueIndex].dataColors['actualParentTrackColor'] &&
                        memberObjects[valueIndex].dataColors['actualParentTrackColor'].solid.color,
                    actualChildFillColor:
                        memberObjects[valueIndex].dataColors['actualChildFillColor'] &&
                        memberObjects[valueIndex].dataColors['actualChildFillColor'].solid.color,
                    actualChildTrackColor:
                        memberObjects[valueIndex].dataColors['actualChildTrackColor'] &&
                        memberObjects[valueIndex].dataColors['actualChildTrackColor'].solid.color,
                    plannedFillColor:
                        memberObjects[valueIndex].dataColors['plannedFillColor'] &&
                        memberObjects[valueIndex].dataColors['plannedFillColor'].solid.color,
                };
            }
        });
        firstTaskDimension.mergedProps = obj;
    }

    private mergeMilestoneDataLabels(milestones, dimensionsMeasuresObj) {
        const dataLabelConfig = this.milestoneConfig.dataLabelConfig;
        const dataLabels = dataLabelConfig && dataLabelConfig.dataLabels;
        if (!(dataLabels && dataLabelConfig.isEnabled)) return;
        milestones.forEach((milestone) => {
            const dataLabel = dataLabels[milestone.name];
            if (!dataLabel) return;
            const dataLabelConfiguredDimensions = dataLabel.dataLabelConfiguredDimensions;
            const taskNameConfiguredDimensions = dataLabel.taskNameConfiguredDimensions;
            const dataLabelConfigDimension = dimensionsMeasuresObj[dataLabelConfiguredDimensions];
            const taskNameConfigDimension = dimensionsMeasuresObj[taskNameConfiguredDimensions];
            if (dataLabelConfigDimension) {
                milestone.dataLabelValues = dataLabelConfigDimension.values;
                milestone.dataLabelFormattedValues = dataLabelConfigDimension.formattedValues;
                milestone.dataLabelDetails = {
                    format: dataLabelConfigDimension.format,
                    numberFormatting: dataLabelConfigDimension.settings.numberFormatting,
                    id: dataLabelConfiguredDimensions,
                };
            }
            if (taskNameConfigDimension) {
                milestone.taskNameValues = taskNameConfigDimension.values;
                milestone.taskNameFormattedValues = taskNameConfigDimension.formattedValues;
                milestone.taskLabelDetails = {
                    id: taskNameConfigDimension.name,
                };
            }
        });
    }

    private mergeMilestoneConfigNameMetaData(milestone) {
        const milestoneFillColors = [],
            milestoneShapes = [],
            milestoneIconNames = [],
            milestoneBorderColors = [],
            milestoneNameConfig = this.milestoneConfig.milestoneNameFieldConfig[milestone.name],
            images = [],
            imageNames = [];
        const { singleConfig } = this.milestoneConfig;
        milestone.values.forEach((value) => {
            const individualConfig = milestoneNameConfig && milestoneNameConfig[value];
            if (individualConfig) {
                milestoneShapes.push(individualConfig.milestoneShape);
                milestoneFillColors.push(individualConfig.milestoneFillColor);
                milestoneBorderColors.push(individualConfig.milestoneBorderColor);
                milestoneIconNames.push(individualConfig.milestoneIconName);
                images.push(individualConfig.image);
                imageNames.push(individualConfig.imageName);
            } else {
                milestoneShapes.push(singleConfig.milestoneShape);
                milestoneFillColors.push(singleConfig.milestoneFillColor);
                milestoneBorderColors.push(singleConfig.milestoneBorderColor);
                milestoneIconNames.push(singleConfig.milestoneIconName);
                images.push(singleConfig.image);
                imageNames.push(singleConfig.imageName);
            }
        });
        milestone.milestoneFillColors = milestoneFillColors;
        milestone.milestoneBorderColors = milestoneBorderColors;
        milestone.milestoneShapes = milestoneShapes;
        milestone.milestoneIconNames = milestoneIconNames;
        milestone.images = images;
        milestone.imageNames = imageNames;
    }

    private isDateField(type) {
        return type.dateTime || type.duration;
    }

    private columnMeasureDataLabel(node: any, JSONArray: JSONArrayDef, taskIndex: number) {
        node['displayColumns'] = [];
        JSONArray.displayColumn.forEach((column) => {
            const settings = column.settings;
            node['cf'][column.name] = column.values[taskIndex];
            node['cfFormattedValues'][column.name] = column.formattedValues[taskIndex];
            if (!((settings.displayColumn && settings.displayColumn.columnEnable && settings.displayColumn.columnEnable) || settings.displayColumn == undefined || settings.displayColumn.columnEnable == undefined))
                return;
            const displayColumnObj = {};
            displayColumnObj['title'] = column['label'];
            displayColumnObj['value'] =
                column['formattedValues'][taskIndex] || column['formattedValues'][taskIndex] == 0 ? column['formattedValues'][taskIndex] : '';
            displayColumnObj['format'] = column.format;
            displayColumnObj['displayColumn'] = settings.displayColumn;
            displayColumnObj['id'] = column.name;
            displayColumnObj['name'] = column.id;
            displayColumnObj['isDateField'] = this.isDateField(column.type);
            if (column.linkedWebUrl) {
                const evaluatedWebUrlJSON = this.isValidURL(column.linkedWebUrl[taskIndex]);
                displayColumnObj['linkedWebUrl'] = evaluatedWebUrlJSON.url;
                displayColumnObj['isValiedWebUrl'] = evaluatedWebUrlJSON.isValiedURL;
            } else {
                displayColumnObj['linkedWebUrl'] = undefined;
                displayColumnObj['isValiedWebUrl'] = false;
            }
            displayColumnObj['webUrlIcon'] = column.webUrlIcon;
            displayColumnObj['webUrlIconColor'] = column.webUrlIconColor;
            displayColumnObj['defaultColor'] = this.settings.dataGrid.datagridFontColor;
            node['displayColumns'].push(displayColumnObj);
        });
        node['displayColumnsMeasure'] = [];
        JSONArray.displayMeasures.map((column) => {
            const settings = column.settings;
            node['cf'][column.name] = column.values[taskIndex];
            if (!((settings.displayMeasure && settings.displayMeasure.columnEnable && settings.displayMeasure.columnEnable) || settings.displayMeasure == undefined || settings.displayMeasure.columnEnable == undefined))
                return;
            const displayColumnObj = {};
            displayColumnObj['title'] = column['label'];
            displayColumnObj['value'] =
                column.values && column.values[taskIndex] != null ? column.values[taskIndex] : '';
            displayColumnObj['modifiedValues'] =
                column.formattedValues && column.formattedValues[taskIndex] != null
                    ? column.formattedValues[taskIndex]
                    : '';
            displayColumnObj['format'] = column.format;
            displayColumnObj['numberFormatting'] = settings.numberFormatting;
            displayColumnObj['displayMeasure'] = settings.displayMeasure;
            displayColumnObj['id'] = column.name;
            displayColumnObj['name'] = column.id;
            node['displayColumnsMeasure'].push(displayColumnObj);
        });
        node['displayMeasure'] = JSONArray.displayMeasures.map((column) => {
            const displayColumnObj = {};
            displayColumnObj['id'] = column.name;
            node['cf'][column.name] = column.values[taskIndex];
            return displayColumnObj;
        });
        node['displayMeasure'].push(
            ...JSONArray.progressValue.map((column) => {
                const displayColumnObj = {};
                displayColumnObj['id'] = column.name;
                node['cf'][column.name] = column.values[taskIndex];
                return displayColumnObj;
            }),
        );
        node['displayMeasure'].push(
            ...JSONArray.duration.map((column) => {
                const displayColumnObj = {};
                displayColumnObj['id'] = column.name;
                node['cf'][column.name] = column.values[taskIndex];
                return displayColumnObj;
            }),
        );
        node['displayMeasure'].push(
            ...JSONArray.progressBase.map((column) => {
                const displayColumnObj = {};
                displayColumnObj['id'] = column.name;
                node['cf'][column.name] = column.values[taskIndex];
                return displayColumnObj;
            }),
        );
        const dataLabel = JSONArray.dataLabel[0];
        if (dataLabel) {
            // const value = dataLabel.values[taskIndex] ?? '';
            // const modifiedValue = dataLabel.formattedValues[taskIndex] ?? '';
            const value = dataLabel.values[taskIndex] == null ? '' : dataLabel.values[taskIndex];
            const modifiedValue =
                dataLabel.formattedValues[taskIndex] == null ? '' : dataLabel.formattedValues[taskIndex];
            node['dataLabel'] = {
                value,
                modifiedValue,
                format: dataLabel.format,
                numberFormatting: dataLabel.settings.numberFormatting,
                id: dataLabel.name,
                scalingFactor: dataLabel.scalingFactor
            };
            node['cf'][dataLabel.name] = dataLabel.values[taskIndex];
            node['cfFormattedValues'][dataLabel.name] = dataLabel.formattedValues[taskIndex];
        }
    }

    private tooltipsPoints(node: any, JSONArray: JSONArrayDef, taskIndex: number) {
        node['tooltips'] = JSONArray.tooltips.map((tooltip, tooltipIndex) => {
            const values = JSONArray.tooltips[tooltipIndex].values[taskIndex],
                formattedValues = JSONArray.tooltips[tooltipIndex].formattedValues;
            node['cf'][tooltip.name] = values || values == 0 ? values : '(Blank)';
            node['cfFormattedValues'][tooltip.name] = formattedValues[taskIndex] ? formattedValues[taskIndex] : '(Blank)';
            return {
                name: JSONArray.tooltips[tooltipIndex].label,
                value: values || values == 0 ? values : '(Blank)',
                modifiedValues: formattedValues && formattedValues[taskIndex] ? formattedValues[taskIndex] : '(Blank)',
                numberFormatting: JSONArray.tooltips[tooltipIndex].settings.numberFormatting,
                format: JSONArray.tooltips[tooltipIndex].format,
                isMeasure: JSONArray.tooltips[tooltipIndex].isMeasure,
                id: JSONArray.tooltips[tooltipIndex].name,
                scalingFactor: JSONArray.tooltips[tooltipIndex].scalingFactor
            };
        });
    }

    private getTooltipPointsIndividual(dimension: any, node: any, taskIndex: number) {
        node['cf'][dimension.name] = dimension.values[taskIndex];
        node['cfFormattedValues'][dimension.name] = dimension.formattedValues[taskIndex];
        return {
            name: dimension.label,
            value: dimension.values[taskIndex] || dimension.values[taskIndex] == 0 ? dimension.values[taskIndex] : '',
            modifiedValues: dimension.formattedValues && dimension.formattedValues[taskIndex],
            numberFormatting: dimension.settings.numberFormatting,
            format: dimension.format,
            isMeasure: dimension.isMeasure,
            id: dimension.name,
            scalingFactor: dimension.scalingFactor
        };
    }

    private getColors(JSONArray: JSONArrayDef, taskCategory: any, taskIndex: number, highContrast: HighContrastColors) {
        let actualParentFillColor,
            actualParentTrackColor,
            actualChildFillColor,
            actualChildTrackColor,
            plannedFillColor;
        if (highContrast.isHighContrast) {
            actualParentFillColor = highContrast.foreground + ' ' + 0.5;
            actualParentTrackColor = highContrast.foreground;
            actualChildFillColor = highContrast.foreground + ' ' + 0.5;
            actualChildTrackColor = highContrast.foreground;
            plannedFillColor = highContrast.foreground + ' ' + 0.5;
        } else {
            if (JSONArray.taskName.length == 1 && this.settings.chartOptions.ganttChartType == 'gantt') {
                actualParentFillColor =
                    (taskCategory.memberObjects &&
                        taskCategory.memberObjects[taskIndex] &&
                        taskCategory.memberObjects[taskIndex].dataColors &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildFillColor &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildFillColor.solid &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildFillColor.solid.color) ||
                    this.settings.dataColors.actualChildFillColor;
                actualParentTrackColor =
                    (taskCategory.memberObjects &&
                        taskCategory.memberObjects[taskIndex] &&
                        taskCategory.memberObjects[taskIndex].dataColors &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildTrackColor &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildTrackColor.solid &&
                        taskCategory.memberObjects[taskIndex].dataColors.actualChildTrackColor.solid.color) ||
                    this.settings.dataColors.actualChildTrackColor;
                plannedFillColor =
                    (taskCategory.memberObjects &&
                        taskCategory.memberObjects[taskIndex] &&
                        taskCategory.memberObjects[taskIndex].dataColors &&
                        taskCategory.memberObjects[taskIndex].dataColors.plannedFillColor &&
                        taskCategory.memberObjects[taskIndex].dataColors.plannedFillColor.solid &&
                        taskCategory.memberObjects[taskIndex].dataColors.plannedFillColor.solid.color) ||
                    this.settings.dataColors.plannedFillColor;
            } else {
                actualParentFillColor =
                    (taskCategory.mergedProps &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]] &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]].actualParentFillColor) ||
                    this.settings.dataColors.actualParentFillColor;
                actualParentTrackColor =
                    (taskCategory.mergedProps &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]] &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]].actualParentTrackColor) ||
                    this.settings.dataColors.actualParentTrackColor;
                actualChildFillColor =
                    (taskCategory.mergedProps &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]] &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]].actualChildFillColor) ||
                    this.settings.dataColors.actualChildFillColor;
                actualChildTrackColor =
                    (taskCategory.mergedProps &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]] &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]].actualChildTrackColor) ||
                    this.settings.dataColors.actualChildTrackColor;
                plannedFillColor =
                    (taskCategory.mergedProps &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]] &&
                        taskCategory.mergedProps[taskCategory.values[taskIndex]].plannedFillColor) ||
                    this.settings.dataColors.plannedFillColor;
            }
            if (
                this.settings.dataColors.configurationType == 'parent' &&
                this.settings.chartOptions.ganttChartType == 'gantt'
            ) {
                actualChildFillColor = actualParentFillColor;
                actualChildTrackColor = actualParentTrackColor;
            }
        }
        return {
            actualParentFillColor,
            actualParentTrackColor,
            actualChildFillColor,
            actualChildTrackColor,
            plannedFillColor,
        };
    }

    private connectorHelper(connectToJSON: any, connectTypeJSON: any, JSONArray: JSONArrayDef, taskIndex: number) {
        const connectorArray = [];
        const connectToValue = connectToJSON[0].values[taskIndex];
        const connectorTypeValue = connectTypeJSON[0].values[taskIndex];
        let connectToParsed, connectorTypeParsed;
        try {
            connectToParsed = JSON.parse(connectToValue);
        } catch (err) {
            connectToParsed = connectToValue;
        }
        try {
            connectorTypeParsed = JSON.parse(connectorTypeValue);
        } catch (err) {
            connectorTypeParsed = connectorTypeValue;
        }
        const isConnectToArray = Array.isArray(connectToParsed);
        const isConnectTypeArray = Array.isArray(connectorTypeParsed);
        if (isConnectToArray) {
            connectToParsed.forEach((connectTo, index) => {
                let connectType;
                if (isConnectTypeArray) {
                    if (connectorTypeParsed[index]) {
                        connectType = connectorTypeParsed[index];
                    } else {
                        connectType = connectorTypeParsed[connectorTypeParsed.length - 1];
                    }
                } else {
                    connectType = connectorTypeParsed;
                }
                connectorArray.push(...this.getConnectors(JSONArray, connectTo, connectType));
            });
        } else {
            connectorArray.push(...this.getConnectors(JSONArray, connectToValue, connectorTypeValue));
        }
        return connectorArray;
    }

    private connectors(JSONArray: JSONArrayDef, taskIndex: number) {
        const connectorArray = [];
        if (JSONArray.primaryConnectTo.length > 0 && JSONArray.primaryConnectorType.length > 0) {
            connectorArray.push(
                ...this.connectorHelper(
                    JSONArray.primaryConnectTo,
                    JSONArray.primaryConnectorType,
                    JSONArray,
                    taskIndex,
                ),
            );
        }
        if (JSONArray.secondaryConnectTo.length > 0 && JSONArray.secondaryConnectorType.length > 0) {
            connectorArray.push(
                ...this.connectorHelper(
                    JSONArray.secondaryConnectTo,
                    JSONArray.secondaryConnectorType,
                    JSONArray,
                    taskIndex,
                ),
            );
        }
        return connectorArray;
    }

    private getCategoryIndex(JSONArray: JSONArrayDef) {
        const categoryValues = [];
        let categoryIndexLength: number;
        if (this.settings.chartOptions.ganttChartType === 'gantt') {
            categoryIndexLength = JSONArray.taskName.length;
        } else {
            categoryIndexLength = JSONArray.taskName.length - 1;
        }
        for (let categoryIndex = 0; categoryIndex < categoryIndexLength; categoryIndex++) {
            categoryValues.push(categoryIndex);
        }
        return categoryValues;
    }

    private initializeNode(taskCategory: any, taskCategoryIndex: number, taskIndex: number, selectionId: ISelectionId) {
        return {
            cf: {},
            cfColor: {},
            othersCfColor: {},
            cfIcon: {},
            cfFormattedValues: {},
            minMax: {},
            immeditateNodeCount: 0,
            nodeTrackCount: 0,
            name:
                taskCategory['formattedValues'][taskIndex] || taskCategory['formattedValues'][taskIndex] == 0
                    ? taskCategory['formattedValues'][taskIndex]
                    : '',
            index: taskIndex,
            selectionId,
            level: this.settings.chartOptions.displayTotals ? taskCategoryIndex + 1 : taskCategoryIndex,
        };
    }

    private addImmediateCountToParent(node) {
        node['immeditateNodeCount'] = node['immeditateNodeCount'] + 1;
    }

    private getSelectedFillColor(highContrast: HighContrastColors) {
        return this.settings.dataColors.enableSelectedColor
            ? highContrast.isHighContrast
                ? highContrast.foregroundSelected
                : this.settings.dataColors.selectedFillColor
            : null;
    }

    private childNodesToParent(individualTasks: any, node: any) {
        if (node.parent) {
            const parentKey = node.parent;

            if (individualTasks[parentKey].childNodes) {
                individualTasks[parentKey].childNodes.push(node.actualKey);
            } else {
                individualTasks[parentKey].childNodes = [node.actualKey];
            }
        }
    }

    private generateTask(JSONArray: JSONArrayDef, highContrast: HighContrastColors) {
        const taskArray = [],
            dataGridMembersObject = [],
            dataGridMembers = [],
            selectionIds: ISelectionId[] = [],
            categoryIndex = this.getCategoryIndex(JSONArray),
            individualTasks = {},
            taskChildrens = {},
            nodeLevels = [],
            selectedFillColor = this.getSelectedFillColor(highContrast);
            if(JSONArray.milestones.length !== 0){
                this.isMilestonePresentInField = true;
            }
        JSONArray.taskName[0].values.forEach((task, taskIndex) => {
            const selectionId = this._selectionIdBuilder.getSelectionId({
                categoricalIndex: categoryIndex,
                categoricalMemberIndex: [...categoryIndex].fill(taskIndex),
            });
            JSONArray.taskName.forEach((taskCategory, taskCategoryIndex) => {
                const node = this.initializeNode(taskCategory, taskCategoryIndex, taskIndex, selectionId);
                node.cf[taskCategory.name] = taskCategory.values[taskIndex];
                node.cfFormattedValues[taskCategory.name] = taskCategory.formattedValues[taskIndex];
                const { actualParentFillColor, actualParentTrackColor, actualChildFillColor, actualChildTrackColor, plannedFillColor} = this.getColors(JSONArray, JSONArray.taskName[0], taskIndex, highContrast);
                if (JSONArray.tooltips.length > 0 && taskCategoryIndex === JSONArray.taskName.length - 1) {
                    this.tooltipsPoints(node, JSONArray, taskIndex);
                }
                if (dataGridMembers[taskIndex] !== undefined) {
                    //fix for PBX-1357
                    if (this.settings.chartOptions.ganttChartType === 'ganttresource' && dataGridMembers[taskIndex] == null) {
                        dataGridMembers[taskIndex] = '';
                    }
                    node['parent'] = dataGridMembers[taskIndex];
                    if (this.settings.chartOptions.ganttChartType == 'gantt' && JSONArray.taskName.length - 1 == taskCategoryIndex) {
                        node['actualKey'] = dataGridMembers[taskIndex] + '~!~' + taskCategory['formattedValues'][taskIndex] + '~!~' + taskIndex;
                        this.getConnectorsMapping(JSONArray, node, taskIndex);
                    } else {
                        node['actualKey'] = dataGridMembers[taskIndex] + '~!~' + taskCategory['formattedValues'][taskIndex];
                    }
                    node['nonUniqueKey'] = dataGridMembers[taskIndex] + '~!~' + taskCategory['formattedValues'][taskIndex];
                    if (taskCategoryIndex === JSONArray.taskName.length - 1) {
                        this.columnMeasureDataLabel(node, JSONArray, taskIndex);
                        this.generateLeafNodeData(node, JSONArray, taskIndex, highContrast);
                    }
                    if (
                        taskCategoryIndex === JSONArray.taskName.length - 1 &&
                        this.settings.chartOptions.ganttChartType === 'ganttresource'
                    ) {
                        node['parentvalue'] = dataGridMembers[taskIndex];
                    }
                    dataGridMembers[taskIndex] = dataGridMembers[taskIndex] + '~!~' + taskCategory['formattedValues'][taskIndex];
                    if ((JSONArray.taskName.length > 1 && this.settings.dataColors.configurationType !== 'all') || (JSONArray.taskName.length == 1 && this.settings.dataColors.configurationTypeIndividual !== 'all')) {
                        if (taskCategoryIndex === JSONArray.taskName.length - 1) {
                            const actual = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].actualChildFillColor;
                            const progress = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].actualChildTrackColor;
                            node['actual'] = { fill: actual, selected: { fill: selectedFillColor || actual } };
                            node['grouping-tasks'] = { fill: actual, selected: { fill: selectedFillColor || actual } };
                            node['progress'] = { fill: progress, selected: { fill: selectedFillColor || progress } };
                        } else {
                            const actual = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].actualParentFillColor;
                            const progress = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].actualParentTrackColor;
                            node['actual'] = { fill: actual, selected: { fill: selectedFillColor || actual } };
                            node['grouping-tasks'] = { fill: actual, selected: { fill: selectedFillColor || actual } };
                            node['progress'] = { fill: progress, selected: { fill: selectedFillColor || progress } };
                        }
                        const baselineColor = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].plannedFillColor;
                        node['baseline'] = { fill: baselineColor, selected: { fill: selectedFillColor || baselineColor }};
                    }
                    if ( this.settings.dataColors.configurationTypeIndividual !== 'all' && this.settings.chartOptions.ganttChartType !== 'gantt')
                        node['fill'] = dataGridMembersObject[taskIndex] && dataGridMembersObject[taskIndex].actualChildFillColor;
                } else {
                    if (this.settings.chartOptions.ganttChartType == 'gantt' && JSONArray.taskName.length == 1) {
                        node['actualKey'] = taskCategory['formattedValues'][taskIndex] + '~!~' + taskIndex;
                        this.getConnectorsMapping(JSONArray, node, taskIndex);
                    } else {
                        node['actualKey'] = taskCategory['formattedValues'][taskIndex];
                    }
                    node['nonUniqueKey'] = taskCategory['formattedValues'][taskIndex];
                    dataGridMembers[taskIndex] = taskCategory['formattedValues'][taskIndex];
                    if ((JSONArray.taskName.length > 1 && this.settings.dataColors.configurationType !== 'all') ||
                        (JSONArray.taskName.length == 1 && this.settings.dataColors.configurationTypeIndividual !== 'all')) {
                        node['actual'] = {fill: actualParentFillColor, selected: { fill: selectedFillColor || actualParentFillColor }};
                        node['grouping-tasks'] = { fill: actualParentFillColor, selected: { fill: selectedFillColor || actualParentFillColor }};
                        node['progress'] = {fill: actualParentTrackColor, selected: { fill: selectedFillColor || actualParentTrackColor }};
                        node['baseline'] = {fill: plannedFillColor, selected: { fill: selectedFillColor || plannedFillColor }};
                    }
                    this.settings.dataColors.configurationTypeIndividual !== 'all' && this.settings.chartOptions.ganttChartType !== 'gantt' ? (node['fill'] = actualChildFillColor) : null;
                    dataGridMembersObject[taskIndex] = { actualChildFillColor, actualChildTrackColor, actualParentFillColor, actualParentTrackColor, plannedFillColor};
                }
                if (JSONArray.taskName.length == 1) {
                    this.columnMeasureDataLabel(node, JSONArray, taskIndex);
                    this.generateLeafNodeData(node, JSONArray, taskIndex, highContrast);
                }
                this.generateTaskHelper( selectionIds, selectionId, node, individualTasks,  taskArray,  taskChildrens,  JSONArray,  highContrast,  taskIndex,  nodeLevels);
                this.childNodesToParent(individualTasks, node);
            });
        });
        this.addIndexToMarkers(taskArray);
        this.selectionIDArrays = selectionIds;
        return { tasks: taskArray, individualTasks, taskChildrens, nodeLevels };
    }

    private generateTaskHelper(
        selectionIds: ISelectionId[],
        selectionId: ISelectionId,
        node: any,
        individualTasks: any,
        taskArray: any[],
        taskChildrens: any,
        JSONArray: JSONArrayDef,
        highContrast: HighContrastColors,
        taskIndex: number,
        nodeLevels: any[],
    ) {
        selectionIds.push(selectionId);
        const { generalConfig } = this.milestoneConfig;
        if (
            this.settings.chartOptions.ganttChartType == 'gantt' &&
            this.settings.chartOptions.displayTotals &&
            node['parent'] === undefined
        ) {
            node['parent'] = 'grand_total';
            individualTasks['grand_total'] ? null : this.addGrandTotalNode(taskArray, individualTasks, nodeLevels);
        }
        if (individualTasks[node['actualKey']]) return;
        if (this.settings.dataGrid.collapseAllNodes && this.JSONArray.taskName.length > 1) {
            if (this.settings.dataGrid.expandTillLevel > node.level && !node['isChildren'])
                this.expandLevelsKey.push(node['actualKey']);
        }
        if (nodeLevels[node.level]) {
            node['levelIndex'] = nodeLevels[node.level].length + 1;
            nodeLevels[node.level].push(node);
        } else {
            node['levelIndex'] = 1;
            nodeLevels[node.level] = [node];
        }
        let hierarchyID = '';
        if (individualTasks[node.parent]) {
            this.addImmediateCountToParent(individualTasks[node.parent]);
            hierarchyID =
                individualTasks[node.parent].hierarchyID + '.' + individualTasks[node.parent].immeditateNodeCount;
        } else {
            hierarchyID = node.levelIndex + '';
        }
        node.hierarchyID = hierarchyID;
        if (
            this.settings.chartOptions.ganttChartType == 'gantt' &&
            !generalConfig.mileStoneFromData &&
            JSONArray.milestones.length > 0 &&
            node['isChildren'] &&
            node['actualStart'] &&
            node['actualEnd'] &&
            node['actualStart'] == node['actualEnd']
        ) {
            if (generalConfig.milestoneType == 'milestone' && JSONArray.milestones.length > 0) {
                taskArray.push(...this.getMilestone(JSONArray, highContrast, taskIndex, node));
            }
            this.mergeLiveEditingChanges(JSONArray, node, this.modifiedData[node['liveEditingKey']]);
            this.setDynamicSummaryTableField(node);
            return;
        }
        taskArray.push(node);
        individualTasks[node['actualKey']] = node;
        if (node['isChildren']) {
            taskChildrens[node['actualKey']] = node;
            this.mergeLiveEditingChanges(JSONArray, node, this.modifiedData[node['liveEditingKey']]);
            this.setDynamicSummaryTableField(node);
            if (this.settings.chartOptions.ganttChartType == 'gantt') {
                if (
                    generalConfig.milestoneType == 'milestone' &&
                    JSONArray.milestones.length > 0
                ) {
                    taskArray.push(...this.getMilestone(JSONArray, highContrast, taskIndex, node));
                }
                this.aggregateAllNeedValuesToParent(node, individualTasks);
            }
        }
    }

    private setMinMaxDate(node) {
        let startKey = 'actualStart',
            endKey = 'actualEnd';
        if (this.settings.chartOptions.ganttChartType != 'gantt') {
            (startKey = 'start'), (endKey = 'end');
        }
        if (node[startKey] < this.minMaxDate.min) this.minMaxDate.min = node['actualStart'];
        if (node[endKey] < this.minMaxDate.min) this.minMaxDate.min = node['actualEnd'];
        if (node[startKey] > this.minMaxDate.max) this.minMaxDate.max = node['actualStart'];
        if (node[endKey] > this.minMaxDate.max) this.minMaxDate.max = node['actualEnd'];
    }

    private mergeLiveEditingChanges(JSONArray: JSONArrayDef, node: any, modifiedData: any) {
        if (!(this.settings.interaction.show && this.isGanttEnterprise && modifiedData)) {
            this.setMinMaxDate(node);
            return;
        }
        const { actualStart, actualEnd, baselineStart, baselineEnd, progressValue } = modifiedData;
        if (this.settings.chartOptions.ganttChartType == 'gantt') {
            node['actualStart'] = actualStart;
            node['actualEnd'] = actualEnd;
            if (JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0) {
                baselineStart !== undefined ? (node['baselineStart'] = baselineStart) : null;
                baselineEnd !== undefined ? (node['baselineEnd'] = baselineEnd) : null;
            }
            if (progressValue !== undefined && JSONArray.progressValue.length > 0) {
                node['progressValue'] = progressValue;
                if (node['percentageHelper']['progressValue']) {
                    const progressFinished = node['percentageHelper']['progressValue']['base'] * progressValue;
                    node['percentageHelper']['progressValue']['finished'] = progressFinished;
                    node['percentageHelper']['progressValue']['finishedFormatted'] = progressFinished;
                }
            }
        } else {
            node['start'] = actualStart;
            node['end'] = actualEnd;
        }
        this.setMinMaxDate(node);
    }

    private setDynamicSummaryTableField(node) {
        const { actualStart, actualEnd, baselineStart, baselineEnd, progressValue } = this.dynamicSummaryTableFiled;
        let start, end;
        if (this.settings.chartOptions.ganttChartType == 'gantt') {
            start = node['actualStart'];
            end = node['actualEnd'];
        } else {
            start = node['start'];
            end = node['end'];
        }
        actualStart.push(start);
        actualEnd.push(end);
        baselineStart.push(node['baselineStart']);
        baselineEnd.push(node['baselineEnd']);
        progressValue.push(node['progressValue']);
    }

    private addGrandTotalNode(taskArray, individualTasks, nodeLevels) {
        const totalTemplate = {
            cf: {},
            cfColor: {},
            cfIcon: {},
            othersCfColor: {},
            cfFormattedValues: {},
            minMax: {},
            name: this.settings.chartOptions.totalLabel || 'Overall Result',
            actualKey: 'grand_total',
            selectionId: {},
            level: 0,
            immeditateNodeCount: 0,
            nodeTrackCount: 0,
            hierarchyID: 1,
        };
        if (
            this.settings.dataGrid.collapseAllNodes &&
            this.JSONArray.taskName.length > 1 &&
            this.settings.dataGrid.expandTillLevel > 0
        ) {
            this.expandLevelsKey.push('grand_total');
        }
        nodeLevels[0] = [];
        nodeLevels[0].push(totalTemplate);
        taskArray.push(totalTemplate);
        individualTasks['grand_total'] = totalTemplate;
    }

    private aggregateAllNeedValuesToParent(childNode, individualTasks) {
        let node = childNode;
        const pathArray = [];
        pathArray.push(node);
        while (node.parent !== undefined) {
            this.aggregationWrapper(individualTasks[node.parent], childNode);
            this.minMaxStartEndDate(individualTasks[node.parent], childNode);
            if (this.settings.chartOptions.showPlannedTaskInParent)
                this.minMaxPlannedStartEndDate(individualTasks[node.parent], childNode);
            this.displayColumnDataLabelWrapper(individualTasks[node.parent], childNode);
            node = individualTasks[node.parent];
            pathArray.unshift(node);
        }
        let cf = {},
            cfFormattedValues = {},
            isBlank = false,
            parent = null;
        pathArray.forEach((path) => {
            cf = { ...cf, ...path.cf };
            cfFormattedValues = { ...cfFormattedValues, ...path.cfFormattedValues };
            if (path.name === '' || path.name === null) {
                path.isBlank = true;
                if (!isBlank) {
                    parent = path.parent;
                    isBlank = true;
                }
            }
            path.cf = cf;
            path.cfFormattedValues = cfFormattedValues;
            if (this.settings.chartOptions.hideBlankGantt == 'hideDescendantNode') path.isBlank = isBlank;
            if (parent) {
                path.newParent = parent;
            }
        });
    }

    private aggregationWrapper(parentNode, childNode) {
        if (parentNode.countObj) {
            this.aggregateValues(parentNode.countObj, childNode.countObj);
        } else {
            parentNode.countObj = { ...childNode.countObj };
        }
        if (parentNode.measureDetailsValue) {
            this.aggregateValues(parentNode.measureDetailsValue.sum, childNode.measureDetailsValue.sum);
            this.aggregateValues(
                parentNode.measureDetailsFormattedValue.sum,
                childNode.measureDetailsFormattedValue.sum,
            );
        } else {
            parentNode.measureDetailsValue = {
                sum: { ...childNode.measureDetailsValue.sum },
                average: {},
                percentage: {},
            };
            parentNode.measureDetailsFormattedValue = {
                sum: { ...childNode.measureDetailsFormattedValue.sum },
                average: {},
                percentage: {},
            };
        }

        if (this.milestoneConfig.generalConfig.enablePreview) {
            if (parentNode.markers) {
                if (childNode.markers && childNode.markers.length > 0) parentNode.markers.push(...childNode.markers);
            } else {
                if (childNode.markers && childNode.markers.length > 0) parentNode.markers = [...childNode.markers];
            }
        }

        if (parentNode.dimensionDetailsValue) {
            this.aggregateDimensionDate(
                parentNode.dimensionDetailsValue,
                parentNode.dimensionDetailsFormattedValue,
                childNode.dimensionDetailsValue,
                childNode.dimensionDetailsFormattedValue,
            );
        } else {
            parentNode.dimensionDetailsValue = {
                ...childNode.dimensionDetailsValue,
            };
            parentNode.dimensionDetailsFormattedValue = {
                ...childNode.dimensionDetailsFormattedValue,
            };
        }
    }

    private aggregateDimensionDate(
        dimensionDetailsValueParent,
        dimensionDetailsFormattedValueParent,
        dimensionDetailsValueChild,
        dimensionDetailsFormattedValueChild,
    ) {
        Object.keys(dimensionDetailsValueParent).forEach((key) => {
            const parentValue = dimensionDetailsValueParent[key] ? Helper.GET_UTC_TIMESTAMP(moment(dimensionDetailsValueParent[key])) : null;
            const childValue = dimensionDetailsValueChild[key] ? Helper.GET_UTC_TIMESTAMP(moment(dimensionDetailsValueChild[key])) : null;
            if (this.dimensionsAggregationType[key] == 'max') {
                if (parentValue < childValue) {
                    dimensionDetailsValueParent[key] = dimensionDetailsValueChild[key];
                    dimensionDetailsFormattedValueParent[key] = dimensionDetailsFormattedValueChild[key];
                }
            } else if (this.dimensionsAggregationType[key] == 'min') {
                if ((!parentValue && childValue) || (childValue && (parentValue > childValue))) {
                    dimensionDetailsValueParent[key] = dimensionDetailsValueChild[key];
                    dimensionDetailsFormattedValueParent[key] = dimensionDetailsFormattedValueChild[key];
                }
            } else if (this.dimensionsAggregationType[key] == 'current') {
                dimensionDetailsValueParent[key] = 'current';
                dimensionDetailsFormattedValueParent[key] = this.ivalueFormatters[key](new Date());
            }
        });
    }

    private minMaxStartEndDate(parentNode, childNode) {
        if (!(parentNode.actualStart && parentNode.actualStart < childNode.actualStart)) {
            if (childNode.actualStart != null && childNode.actualEnd != null)
                //to avoid considering bar which don't display
                parentNode.actualStart = childNode.actualStart;
        }
        if (!(parentNode.actualEnd && parentNode.actualEnd > childNode.actualEnd)) {
            if (childNode.actualStart != null && childNode.actualEnd != null)
                //to avoid considering bar which don't display
                parentNode.actualEnd = childNode.actualEnd;
        }
    }

    private minMaxPlannedStartEndDate(parentNode, childNode) {
        if (!(parentNode.baselineStart && parentNode.baselineStart < childNode.baselineStart)) {
            if (childNode.baselineStart != null) parentNode.baselineStart = childNode.baselineStart;
        }
        if (!(parentNode.baselineEnd && parentNode.baselineEnd > childNode.baselineEnd)) {
            if (childNode.baselineEnd != null) parentNode.baselineEnd = childNode.baselineEnd;
        }
    }

    private displayColumnDataLabelWrapper(parentNode, childNode) {
        if (!parentNode.displayColumnsMeasure) {
            parentNode.displayColumnsMeasure = JSON.parse(JSON.stringify(childNode.displayColumnsMeasure));
        }
        if (!parentNode.displayMeasure) {
            parentNode.displayMeasure = JSON.parse(JSON.stringify(childNode.displayMeasure));
        }

        if (childNode.dataLabel && !parentNode.dataLabel && this.isDataLabeMeasure) {
            parentNode.dataLabel = JSON.parse(JSON.stringify(childNode.dataLabel));
        }

        if (childNode.displayColumns && !parentNode.displayColumns) {
            parentNode.displayColumns = JSON.parse(
                JSON.stringify(childNode.displayColumns.filter((displayColumn) => displayColumn.isDateField)),
            );
        }

        if (!parentNode.tooltips && childNode.tooltips) {
            parentNode.tooltips = JSON.parse(JSON.stringify(childNode.tooltips.filter((tooltip) => tooltip.isMeasure)));
        }
    }

    private aggregateValues(parentObj, childObj) {
        Object.keys(childObj).forEach((key) => {
            parentObj[key] = parentObj[key] + childObj[key];
        });
    }

    private getConnectorsMapping(JSONArray: JSONArrayDef, node: any, taskIndex: number) {
        if (JSONArray.taskID.length > 0) {
            node['connectorID'] = JSONArray.taskID[0].values[taskIndex];
            if (this.connectorIDMapping[node['connectorID']] == null) {
                this.connectorIDMapping[node['connectorID']] = [node['actualKey']];
            } else {
                this.connectorIDMapping[node['connectorID']].push(node['actualKey']);
            }
        } else {
            if (!this.idNameMapping[node['name']]) {
                this.idNameMapping[node['name']] = [node['actualKey']];
            } else {
                this.idNameMapping[node['name']].push(node['actualKey']);
            }
        }
    }

    private getConnectorType(connectorType) {
        if (!(typeof connectorType == 'string')) return;
        connectorType = connectorType.toLowerCase();
        const ganttConnectors = ['start-start', 'start-finish', 'finish-start', 'finish-finish'];
        const shortConnectors = ['ss', 'sf', 'fs', 'ff'];
        if (ganttConnectors.indexOf(connectorType) != -1) {
            return connectorType;
        }
        if (shortConnectors.indexOf(connectorType) != -1) {
            return ganttConnectors[shortConnectors.indexOf(connectorType)];
        }
        const startIndex = connectorType.indexOf('start');
        const finishIndex = connectorType.indexOf('finish');
        if (startIndex >= 0 && finishIndex >= 0) {
            if (startIndex > finishIndex) {
                return 'finish-start';
            } else {
                return 'start-finish';
            }
        } else if (startIndex >= 0) {
            return 'start-start';
        } else if (finishIndex >= 0) {
            return 'finish-finish';
        } else {
            return 'finish-start';
        }
    }

    private getConnectors(JSONArray: JSONArrayDef, connectTo: any, connectorType: any) {
        let idNameMapping,
            connectorArray = [];
        if (JSONArray.taskID.length > 0) {
            idNameMapping = this.connectorIDMapping;
        } else {
            idNameMapping = this.idNameMapping;
        }
        if (connectTo) {
            const connectToArray = idNameMapping[connectTo];
            if (connectToArray) {
                connectorArray = connectToArray.map((connectTo) => {
                    return {
                        connectTo: connectTo,
                        connectorType: this.getConnectorType(connectorType),
                    };
                });
            }
        }
        return connectorArray;
    }

    private generateLeafNodeData(
        nodeDate: any,
        JSONArray: JSONArrayDef,
        taskIndex: number,
        highContrast: HighContrastColors,
    ) {
        nodeDate['isChildren'] = true;
        nodeDate['rowHeight'] = this.settings.chartOptions.ganttRowHeight;
        let ganttOriginalEndDate;
        if (this.settings.chartOptions.ganttChartType === 'gantt') {
            nodeDate['actualStart'] = this.getUnixTimeStamp(JSONArray.actualStartDate[0].values[taskIndex]);
            if (JSONArray.actualEndDate[0] && JSONArray.actualEndDate[0].values) {
                if (nodeDate['actualStart'] && JSONArray.actualEndDate[0].values[taskIndex] == null) {
                    nodeDate['actualEnd'] = this.getUnixTimeStamp(new Date());
                } else {
                    nodeDate['actualEnd'] = this.getUnixTimeStamp(JSONArray.actualEndDate[0].values[taskIndex]);
                }
                ganttOriginalEndDate = this.getUnixTimeStamp(JSONArray.actualEndDate[0].values[taskIndex]);
            } else {
                if (nodeDate['actualStart'] && JSONArray.duration[0].formattedValues[taskIndex] == null) {
                    nodeDate['actualEnd'] = this.getUnixTimeStamp(new Date());
                } else {
                    nodeDate['actualEnd'] = this.endDateCalculator(
                        JSONArray.actualStartDate[0].values[taskIndex],
                        JSONArray.duration[0].formattedValues[taskIndex],
                        this.settings.chartOptions.durationUnit,
                    );
                }
                ganttOriginalEndDate = this.endDateCalculator(
                    JSONArray.actualStartDate[0].values[taskIndex],
                    JSONArray.duration[0].formattedValues[taskIndex],
                    this.settings.chartOptions.durationUnit,
                );
            }
            if (JSONArray.progressValue[0] && JSONArray.progressValue[0].values){
                if (JSONArray.progressBase.length == 0) {
                    nodeDate['progressValue'] = JSONArray.progressValue[0].formattedValues[taskIndex]
                        ? JSONArray.progressValue[0].formattedValues[taskIndex] / 100
                        : 0;
                } else {
                    if (JSONArray.progressBase[0].values[taskIndex]) {
                        nodeDate['progressValue'] =
                            JSONArray.progressValue[0].formattedValues[taskIndex] /
                            JSONArray.progressBase[0].formattedValues[taskIndex];
                    }
                }
            }
            nodeDate['progressBase'] =
                JSONArray.progressBase &&
                JSONArray.progressBase[0] &&
                JSONArray.progressBase[0].formattedValues &&
                JSONArray.progressBase[0].formattedValues[taskIndex];
            nodeDate['progressValueNumberFormatting'] =
                JSONArray.progressValue[0] && JSONArray.progressValue[0].settings.numberFormatting;
            nodeDate['isHighLighted'] =
                JSONArray.progressValue[0] &&
                JSONArray.progressValue[0].highlight &&
                JSONArray.progressValue[0].highlight[taskIndex];
            if (JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0) {
                nodeDate['baselineStart'] = this.getUnixTimeStamp(JSONArray.plannedStartDate[0].values[taskIndex]);
                nodeDate['baselineEnd'] = this.getUnixTimeStamp(JSONArray.plannedEndDate[0].values[taskIndex]);
                
                if(nodeDate['baselineStart'] == nodeDate['baselineEnd'] && nodeDate['baselineStart'] !== null && nodeDate['baselineStart'] !== undefined){
                    nodeDate['baselineEnd']+=1;
                }
            
            } 
            this.getMilestoneColors(nodeDate, taskIndex, JSONArray, highContrast);
            if (this.milestoneConfig.generalConfig.milestoneType == 'marker')
                this.generateMarker(nodeDate, JSONArray, taskIndex, highContrast);
        } else {
            nodeDate['start'] = this.getUnixTimeStamp(JSONArray.actualStartDate[0].values[taskIndex]);
            if (JSONArray.actualEndDate[0] && JSONArray.actualEndDate[0].values) {
                nodeDate['end'] = this.getUnixTimeStamp(JSONArray.actualEndDate[0].values[taskIndex]);
            } else {
                nodeDate['end'] = this.endDateCalculator(
                    JSONArray.actualStartDate[0].values[taskIndex],
                    JSONArray.duration[0].formattedValues[taskIndex],
                    this.settings.chartOptions.durationUnit,
                );
            }
            //Based on new feature from anygantt library we change marker to milestone
            // this.generateMarker(nodeDate, JSONArray, taskIndex, highContrast);
            nodeDate['markers'] = this.getMilestone(JSONArray, highContrast, taskIndex, nodeDate);
        }

        this.addConditionalFormattingDimMeasure(JSONArray, nodeDate, taskIndex);
        this.measureDetails(nodeDate, taskIndex);
        if (this.settings.chartOptions.ganttChartType == 'gantt') {
            nodeDate['liveEditingKey'] = nodeDate['nonUniqueKey'] + nodeDate['actualStart'] + ganttOriginalEndDate;
        } else {
            nodeDate['liveEditingKey'] = nodeDate['parent'] + nodeDate['start'] + nodeDate['end'];
        }
    }

    private measureDetails(nodeDate: any, taskIndex: number) {
        const valueObj = {},
            formattedValueObj = {},
            percetageValueObj = {},
            percetageFormattedValueObj = {},
            countObj = {};
        const dateDiff = nodeDate.actualEnd - nodeDate.actualStart;

        nodeDate['percentageHelper'] = {};
        this.measuresArray.forEach((measure) => {
            valueObj[measure.name] = measure.values[taskIndex];
            formattedValueObj[measure.name] = measure.formattedValues[taskIndex];
            percetageValueObj[measure.name] =
                measure.values[taskIndex] == null ? measure.values[taskIndex] : measure.values[taskIndex] / 100;
            percetageFormattedValueObj[measure.name] =
                measure.formattedValues[taskIndex] == null
                    ? measure.formattedValues[taskIndex]
                    : measure.formattedValues[taskIndex] / 100;
            countObj[measure.name] = 1;
            nodeDate['percentageHelper'][measure.name] = {
                base: dateDiff,
                finished: dateDiff * percetageValueObj[measure.name],
                finishedFormatted: dateDiff * percetageFormattedValueObj[measure.name],
            };
            nodeDate['percentageHelper']['progressValue'] = {
                base: dateDiff,
                finished: dateDiff * nodeDate.progressValue,
                finishedFormatted: dateDiff * nodeDate.progressValue,
            };
        });
        nodeDate['measureDetailsValue'] = {
            sum: { ...valueObj },
            average: { ...valueObj },
            percentage: { ...percetageValueObj },
        };
        nodeDate['measureDetailsFormattedValue'] = {
            sum: { ...formattedValueObj },
            average: { ...formattedValueObj },
            percentage: { ...percetageFormattedValueObj },
        };

        nodeDate['dimensionDetailsValue'] = {};
        nodeDate['dimensionDetailsFormattedValue'] = {};
        this.dateDimensionArray.forEach((dimension) => {
            if (this.dimensionsAggregationType[dimension.name] == 'none') return;
            nodeDate['dimensionDetailsValue'][dimension.name] = dimension.values[taskIndex];
            nodeDate['dimensionDetailsFormattedValue'][dimension.name] = dimension.formattedValues[taskIndex];
        });
        nodeDate['countObj'] = countObj;
    }

    private addConditionalFormattingDimMeasure(JSONArray: JSONArrayDef, nodeDate: any, taskIndex: number) {
        if (JSONArray.primaryConnectTo.length > 0) {
            nodeDate['cf'][JSONArray.primaryConnectTo[0].name] = JSONArray.primaryConnectTo[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.primaryConnectTo[0].name] =
                JSONArray.primaryConnectTo[0].formattedValues[taskIndex];
        }

        if (JSONArray.primaryConnectorType.length > 0) {
            nodeDate['cf'][JSONArray.primaryConnectorType[0].name] =
                JSONArray.primaryConnectorType[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.primaryConnectorType[0].name] =
                JSONArray.primaryConnectorType[0].formattedValues[taskIndex];
        }

        if (JSONArray.secondaryConnectTo.length > 0) {
            nodeDate['cf'][JSONArray.secondaryConnectTo[0].name] = JSONArray.secondaryConnectTo[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.secondaryConnectTo[0].name] =
                JSONArray.secondaryConnectTo[0].formattedValues[taskIndex];
        }

        if (JSONArray.secondaryConnectorType.length > 0) {
            nodeDate['cf'][JSONArray.secondaryConnectorType[0].name] =
                JSONArray.secondaryConnectorType[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.secondaryConnectorType[0].name] =
                JSONArray.secondaryConnectorType[0].formattedValues[taskIndex];
        }

        if (JSONArray.actualStartDate[0] && JSONArray.actualStartDate[0].values) {
            nodeDate['cf'][JSONArray.actualStartDate[0].name] = JSONArray.actualStartDate[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.actualStartDate[0].name] =
                JSONArray.actualStartDate[0].formattedValues[taskIndex];
        }

        if (JSONArray.actualEndDate[0] && JSONArray.actualEndDate[0].values) {
            nodeDate['cf'][JSONArray.actualEndDate[0].name] = JSONArray.actualEndDate[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.actualEndDate[0].name] =
                JSONArray.actualEndDate[0].formattedValues[taskIndex];
        }

        if (JSONArray.plannedStartDate[0] && JSONArray.plannedStartDate[0].values) {
            nodeDate['cf'][JSONArray.plannedStartDate[0].name] = JSONArray.plannedStartDate[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.plannedStartDate[0].name] =
                JSONArray.plannedStartDate[0].formattedValues[taskIndex];
        }

        if (JSONArray.plannedEndDate[0] && JSONArray.plannedEndDate[0].values) {
            nodeDate['cf'][JSONArray.plannedEndDate[0].name] = JSONArray.plannedEndDate[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.plannedEndDate[0].name] =
                JSONArray.plannedEndDate[0].formattedValues[taskIndex];
        }

        if (JSONArray.progressValue[0] && JSONArray.progressValue[0].values) {
            nodeDate['cf'][JSONArray.progressValue[0].name] = JSONArray.progressValue[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.progressValue[0].name] =
                JSONArray.progressValue[0].formattedValues[taskIndex];
        }

        if (JSONArray.progressBase[0] && JSONArray.progressBase[0].values) {
            nodeDate['cf'][JSONArray.progressBase[0].name] = JSONArray.progressBase[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.progressBase[0].name] =
                JSONArray.progressBase[0].formattedValues[taskIndex];
        }

        JSONArray.milestoneType.forEach((milestoneType) => {
            nodeDate['cf'][milestoneType.name] = milestoneType.values[taskIndex];
            nodeDate['cfFormattedValues'][milestoneType.name] = milestoneType.formattedValues[taskIndex];
        });

        JSONArray.milestones.forEach((milestone) => {
            nodeDate['cf'][milestone.name] = milestone.values[taskIndex];
            nodeDate['cfFormattedValues'][milestone.name] = milestone.formattedValues[taskIndex];
        });

        if (JSONArray.taskID.length > 0) {
            nodeDate['cf'][JSONArray.taskID[0].name] = JSONArray.taskID[0].values[taskIndex];
            nodeDate['cfFormattedValues'][JSONArray.taskID[0].name] = JSONArray.taskID[0].formattedValues[taskIndex];
        }
    }

    private getMilestoneColors(nodeDate, taskIndex, JSONArray, highContrast) {
        if (nodeDate['actualStart'] == nodeDate['actualEnd']) {
            this.isMilestonePresentInData = true;
            const { generalConfig, singleConfig, milestoneFieldConfig } = this.milestoneConfig;
            let fill = singleConfig.milestoneFillColor,
                stroke = singleConfig.milestoneBorderColor,
                shape = singleConfig.milestoneIconName,
                imageUrl;
            if (
                generalConfig.configurationTypeMileStone == 'individual' ||
                generalConfig.configurationTypeMileStone == 'individualMatrix'
            ) {
                if (
                    (generalConfig.configurationFrom == 'milestoneName' ||
                        JSONArray.milestones.length == 0) &&
                    JSONArray.milestoneType.length > 0
                ) {
                    const imageSource = this.milestoneType.images[taskIndex];
                    if (generalConfig.isCustomImage && imageSource) {
                        shape = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        shape = this.milestoneType.milestoneIconNames && this.milestoneType.milestoneIconNames[taskIndex];
                    }
                    fill = this.milestoneType.milestoneFillColors && this.milestoneType.milestoneFillColors[taskIndex];
                    stroke =
                        this.milestoneType.milestoneBorderColors && this.milestoneType.milestoneBorderColors[taskIndex];
                } else if (JSONArray.milestones.length > 0) {
                    const { dataConfigMilestone } = milestoneFieldConfig;
                    const imageSource = dataConfigMilestone.image;
                    if (generalConfig.isCustomImage && imageSource) {
                        shape = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        shape = dataConfigMilestone.milestoneIconName;
                    }
                    fill = dataConfigMilestone.milestoneFillColor;
                    stroke = dataConfigMilestone.milestoneBorderColor;
                }
            } else if (generalConfig.configurationTypeMileStone == 'all') {
                const imageSource = singleConfig.image;
                if (generalConfig.isCustomImage && imageSource) {
                    shape = IMAGE_URL;
                    imageUrl = imageSource;
                }
            }
            if (highContrast.isHighContrast) {
                fill = highContrast.foreground;
                stroke = highContrast.foreground;
            }
            const selectedFillColor = this.getSelectedFillColor(highContrast);
            nodeDate['milestone'] = {
                fill,
                stroke,
                selected: {
                    fill: selectedFillColor || fill,
                    stroke: selectedFillColor || stroke,
                },
                markerType: shape,
                imageUrl: imageUrl
            };
        }
    }

    private generateMarker(
        nodeDate: any,
        JSONArray: JSONArrayDef,
        taskIndex: number,
        highContrast: HighContrastColors,
    ) {
        nodeDate['markers'] = JSONArray.milestones.map((milestone) => {
            let type, fill, stroke, imageUrl;
            const dataLabelValues = milestone.dataLabelValues;
            const dataLabelFormattedValues = milestone.dataLabelFormattedValues;
            const taskNameValues = milestone.taskNameValues;
            const taskNameFormattedValues = milestone.taskNameFormattedValues;
            const dataLabelDetails = milestone.dataLabelDetails || {};
            const taskLabelDetails = milestone.taskLabelDetails || {};
            const { generalConfig, singleConfig } = this.milestoneConfig;

            if (generalConfig.configurationTypeMileStone == 'individual') {
                if (this.milestoneType && generalConfig.configurationFrom == 'milestoneName') {
                    const imageSource = this.milestoneType.images[taskIndex];
                    if (generalConfig.isCustomImage && imageSource) {
                        type = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        type = this.milestoneType.milestoneIconNames[taskIndex];
                    }
                    stroke = this.milestoneType.milestoneBorderColors[taskIndex];
                    fill = this.milestoneType.milestoneFillColors[taskIndex];
                } else {
                    const imageSource = milestone.image;
                    if (generalConfig.isCustomImage && imageSource) {
                        type = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        type = milestone.milestoneIconName;
                    }
                    stroke = milestone.milestoneBorderColor;
                    fill = milestone.milestoneFillColor;
                }
            } else {
                const imageSource = singleConfig.image;
                if (generalConfig.isCustomImage && imageSource ) {
                    type = IMAGE_URL;
                    imageUrl = imageSource;
                } else {
                    type = singleConfig.milestoneIconName;
                }
                fill = singleConfig.milestoneFillColor;
                stroke = singleConfig.milestoneBorderColor;
            }
            if (highContrast.isHighContrast) {
                fill = highContrast.foreground;
                stroke = highContrast.foreground;
            }
            const cf = { ...nodeDate.cf },
                cfFormattedValues = { ...nodeDate.cfFormattedValues };
            cf[milestone.name] = milestone.values[taskIndex];
            if (dataLabelDetails.id) {
                cf[dataLabelDetails.id] = dataLabelValues[taskIndex];
                cfFormattedValues[dataLabelDetails.id] = dataLabelFormattedValues[taskIndex];
            }
            if (taskLabelDetails.id) {
                cf[taskLabelDetails.id] = taskNameValues[taskIndex];
                cfFormattedValues[taskLabelDetails.id] = taskNameFormattedValues[taskIndex];
            }
            cfFormattedValues[milestone.name] = milestone.formattedValues[taskIndex];
            const dateValue = this.getUnixTimeStampMilestone(milestone['values'][taskIndex]);
            if (dateValue < this.minMaxDate.min) {
                this.minMaxDate.min = dateValue;
            } else if (dateValue > this.minMaxDate.max) {
                this.minMaxDate.max = dateValue;
            }
            return {
                name: milestone.label,
                value: dateValue,
                type: type,
                imageSource: imageUrl,
                fill: imageUrl ? { src: imageUrl } : fill,
                stroke: imageUrl ? 'none' : stroke,
                defaultStroke: stroke,
                isMarker: true,
                showInTooltip:
                    milestone.settings.customizeTooltip === undefined
                        ? true
                        : milestone.settings.customizeTooltip.displayMilestoneTooltip,
                cf,
                cfFormattedValues,
                cfColor: {},
                cfIcon: {},
                milestoneFieldName: milestone.id,
            };
        });
    }

    private flatToHierarchyResource(task: any, JSONArray: JSONArrayDef) {
        let tasks = [];
        const individualTasks = {};
        task.forEach((item) => {
            //fix for PBX-1357
            if (item.actualKey == null) item.actualKey = '';
            individualTasks[item.actualKey] = item;
        });
        Object.keys(individualTasks).forEach((actualKey) => {
            const item = individualTasks[actualKey];
            if (item.parentvalue == null) {
                if (item !== '' && item !== undefined && item !== 'undefined') {
                    tasks.push(item);
                }
            } else if (item.parentvalue in individualTasks) {
                let parent;
                if (this.settings.chartOptions.displayindividualtask || JSONArray.taskName.length == 2) {
                    parent = individualTasks[item.parentvalue];
                } else {
                    parent = individualTasks[individualTasks[item.parentvalue].parent];
                    tasks = tasks.filter((task) => {
                        return task.actualKey !== individualTasks[item.parentvalue].actualKey;
                    });
                }
                if (parent) {
                    if (parent.actualStart) {
                        delete parent.actualStart;
                    }
                    if (parent.actualEnd) {
                        delete parent.actualEnd;
                    }
                    if (parent.start) {
                        delete parent.start;
                    }
                    if (parent.end) {
                        delete parent.end;
                    }
                    if (parent.baselineStart) {
                        delete parent.baselineStart;
                    }
                    if (parent.baselineEnd) {
                        delete parent.baselineEnd;
                    }
                    if (parent.progressValue) {
                        delete parent.progressValue;
                    }
                    if (!('periods' in parent)) {
                        parent.periods = [];
                        parent.markers = [];
                    }
                    this.mergeParentDataToChildren(item, individualTasks);
                    parent.periods.push(item);
                    parent.periods.push(...item.markers);
                }
            }
        });
        return tasks;
    }

    private mergeParentDataToChildren(item, individualTasks) {
        let node = item;
        const pathArray = [];
        pathArray.push(node);
        while (node.parent !== undefined) {
            node = individualTasks[node.parent];
            pathArray.unshift(node);
        }
        let cf = {},
            cfFormattedValues = {},
            isBlank = false;
        pathArray.forEach((path) => {
            cf = { ...cf, ...path.cf };
            cfFormattedValues = { ...cfFormattedValues, ...path.cfFormattedValues };
            if (path.name === '' || path.name === null) isBlank = true;
            path.cf = cf;
            path.cfFormattedValues = cfFormattedValues;
            path.isBlank = isBlank;
        });
        this.getMeasureMinMax(item);
    }

    private getUnixTimeStamp(dateString) {
        const unixTimeStamp = Helper.GET_UTC_TIMESTAMP(moment(dateString));
        if (dateString != null) {
            if (this.dateTimeDeviation == null) {
                this.dateTimeDeviation = unixTimeStamp - moment(dateString).valueOf();
            }
            return unixTimeStamp;
        } else return dateString;
    }

    private getUnixTimeStampMilestone(dateString) {
        if (dateString) {
            const momentObj = moment(dateString);
            if (momentObj.year() == 1970 || momentObj.year() == 'Invalid date') {
                return 'Invalid date';
            } else {
                return Helper.GET_UTC_TIMESTAMP(momentObj);
            }
        } else return dateString;
    }

    private endDateCalculator(dateString: string, duration: number, durationUnit: string = 'days') {
        if (dateString) {
            const momentObj = moment(dateString).add(duration, durationUnit);
            return Helper.GET_UTC_TIMESTAMP(momentObj);
        }
        return dateString;
    }

    private getMilestoneDefaultObj(milestone: any, node: any, taskIndex: number, milestoneIndex: number) {
        const dataLabelConfig = this.milestoneConfig.dataLabelConfig;
        const milestoneDataLabelConfig = dataLabelConfig && dataLabelConfig.dataLabels[milestone.name];
        const isDataLabelEnabled = dataLabelConfig && dataLabelConfig.isEnabled;
        const milestoneDataLabelType =
            milestoneDataLabelConfig && milestoneDataLabelConfig.dataLabelConfiguredDimensions;
        const dataLabelValues = milestone.dataLabelValues;
        const dataLabelFormattedValues = milestone.dataLabelFormattedValues;
        const taskNameValues = milestone.taskNameValues;
        const taskNameFormattedValues = milestone.taskNameFormattedValues;
        const dataLabelDetails = milestone.dataLabelDetails || {};
        const taskLabelDetails = milestone.taskLabelDetails || {};
        const cf = { ...node.cf };
        const cfFormattedValues = { ...node.cfFormattedValues };
        if (dataLabelDetails.id) {
            cf[dataLabelDetails.id] = dataLabelValues[taskIndex];
            cfFormattedValues[dataLabelDetails.id] = dataLabelFormattedValues[taskIndex];
        }
        if (taskLabelDetails.id) {
            cf[taskLabelDetails.id] = taskNameValues[taskIndex];
            cfFormattedValues[taskLabelDetails.id] = taskNameFormattedValues[taskIndex];
        }
        cf[milestone.name] = milestone.values[taskIndex];
        cfFormattedValues[milestone.name] = milestone.formattedValues[taskIndex];
        const parentHierarchyId = node.hierarchyID == undefined ? '1.0' : node.hierarchyID;
        const hierarchyIDArray = parentHierarchyId.split('.');
        const nodeHierarchyIndex = Number(hierarchyIDArray.pop());
        const nodeParentHierarchy = hierarchyIDArray.join('.');
        const name = taskNameFormattedValues
            ? taskNameFormattedValues[taskIndex]
            : this.settings.chartOptions.ganttChartType == 'gantt'
            ? node.name + ' ' + milestone.label
            : milestone.label;
        return {
            actualKey: node.actualKey + '~!~' + milestone.name + milestoneIndex,
            liveEditingKey: node.liveEditingKey + '~!~' + milestone.name,
            parent: node.parent,
            name,
            actualStart: null,
            start: null,
            isMilestone: true,
            milestone: null,
            mileStoneFromData: false,
            milestoneFieldName: milestone.id,
            index: taskIndex,
            selectionId: node.selectionId,
            nonUniqueKey: node.nonUniqueKey,
            rowBindingKey: node.actualKey,
            cf,
            cfFormattedValues,
            cfColor: {},
            cfIcon: {},
            othersCfColor: {},
            dataLabel: {
                value:
                    milestoneDataLabelType == 'default' || !isDataLabelEnabled
                        ? name
                        : dataLabelFormattedValues
                        ? dataLabelFormattedValues[taskIndex]
                        : '',
                modifiedValue:
                    milestoneDataLabelType == 'default' || !isDataLabelEnabled
                        ? name
                        : dataLabelFormattedValues
                        ? dataLabelFormattedValues[taskIndex]
                        : '',
                format: dataLabelDetails.format,
                numberFormatting: dataLabelDetails.numberFormatting,
                id: dataLabelDetails.id,
                scalingFactor: dataLabelDetails.scalingFactor
            },
            hierarchyID: nodeParentHierarchy + '.' + (nodeHierarchyIndex + milestoneIndex + 1),
        };
    }

    private getMilestone(JSONArray: JSONArrayDef, highContrast: HighContrastColors, taskIndex: number, node) {
        const milestoneArray = [];
        JSONArray.milestones.forEach((milestone, milestoneIndex) => {
            let markerType, fill, stroke, imageUrl;
            const mileStoneTemplate = this.getMilestoneDefaultObj(milestone, node, taskIndex, milestoneIndex);
            const { generalConfig, singleConfig } = this.milestoneConfig;
            if (generalConfig.configurationTypeMileStone == 'individual') {
                if (this.milestoneType && generalConfig.configurationFrom == 'milestoneName') {
                    const imageSource = this.milestoneType.images[taskIndex];
                    if (generalConfig.isCustomImage && imageSource) {
                        markerType = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        markerType = this.milestoneType.milestoneIconNames[taskIndex];
                    }
                    stroke = this.milestoneType.milestoneBorderColors[taskIndex];
                    fill = this.milestoneType.milestoneFillColors[taskIndex];
                    if (this.settings.chartOptions.ganttChartType == 'ganttresource' && this.milestoneType != undefined)
                        mileStoneTemplate['tooltips'] = [
                            this.getTooltipPointsIndividual(this.milestoneType, mileStoneTemplate, taskIndex),
                        ];
                } else {
                    const imageSource = milestone.image;
                    if (generalConfig.isCustomImage && imageSource) {
                        markerType = IMAGE_URL;
                        imageUrl = imageSource;
                    } else {
                        markerType = milestone.milestoneIconName;
                    }
                    stroke = milestone.milestoneBorderColor;
                    fill = milestone.milestoneFillColor;
                }
            } else {
                const imageSource = singleConfig.image;
                if (generalConfig.isCustomImage && imageSource) {
                    markerType = IMAGE_URL;
                    imageUrl = imageSource;
                } else {
                    markerType = singleConfig.milestoneIconName;
                }
                stroke = singleConfig.milestoneBorderColor;
                fill = singleConfig.milestoneFillColor;
            }
            if (highContrast.isHighContrast) {
                fill = highContrast.foreground;
                stroke = highContrast.foreground;
            }

            let date = this.getUnixTimeStampMilestone(milestone.values[taskIndex]);
            if (this.modifiedData[mileStoneTemplate.liveEditingKey]) {
                date = this.modifiedData[mileStoneTemplate.liveEditingKey].actualStart;
            }
            mileStoneTemplate.actualStart = date;
            mileStoneTemplate.start = date;
            mileStoneTemplate['fill'] = fill;
            mileStoneTemplate['stroke'] = stroke;
            mileStoneTemplate['markerType'] = markerType;
            mileStoneTemplate['imageUrl'] = imageUrl;
            mileStoneTemplate.milestone = {
                fill,
                stroke,
                markerType,
                imageUrl
            };
            if (typeof date == 'number') {
                milestoneArray.push(mileStoneTemplate);
                this.setMinMaxDate(node);
            }
        });
        return milestoneArray;
    }

    private applyCustomTimelineShape(chart: any, settings: VisualSettings) {
        try {
            // a function for drawing custom elements
            const drawingFunction = function () {
                const shapes = this["shapes"]; // get the shapes of the element
                const path = shapes["path"]; // get the shape to be modified
                const bounds = this["predictedBounds"]; // get the bounds of the element

                const t = bounds.top;
                const l = bounds.left;
                const r = bounds.left + bounds.width;
                const b = bounds.top + bounds.height;

                // draw a rectangle
                path.moveTo(l, t);
                path.lineTo(r, t);
                path.lineTo(r, b);
                path.lineTo(l, b);
                path.close();
            }

            // access tasks
            const groupingTasks = chart.getTimeline().groupingTasks();
            if (settings.chartOptions.ganttChartType === 'gantt') {
                // draw parent tasks
                if (groupingTasks) groupingTasks.rendering().drawer(drawingFunction);
            }
        } catch (error) {
            // console.log(error, "  error")
        }
    }

    private addIndexToMarkers(taskArray) {
        if (this.settings.chartOptions.ganttChartType == 'gantt') {
            // Sort the taskArray so that child tasks come right after their parent
            const sortedTaskArray = this.sortTasksByParentChild(taskArray);

            this.markerItems = [];
            let mIndex = 0;
            sortedTaskArray.forEach(tasks => {
                const markersList = tasks.markers;
                if (markersList) {
                    markersList.forEach(marker => {
                        if (marker.value != null) {
                            const updatedMarker = { ...marker, mIndex: mIndex };
                            this.markerItems.push(updatedMarker);
                            mIndex += 1;
                        }
                    })
                }
            });
        }
    }

    // Helper function to sort tasks by parent-child relationship
    private sortTasksByParentChild(taskArray) {
        const parents = taskArray.filter(task => !task.parent);

        // Create a new array to store the ordered tasks
        const orderedTasks = [];

        const addChildren = (parent) => {
            orderedTasks.push(parent);
            if (parent.childNodes) {
                parent.childNodes.forEach(childNode => {
                    const node = taskArray.find(task => task.actualKey === childNode);
                    if (node) {
                        addChildren(node);
                    }
                });
            }
        };

        parents.forEach(parent => addChildren(parent));

        return orderedTasks;
    }  

}
