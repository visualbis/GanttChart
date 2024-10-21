import * as SettingsSchemaTypeDef from '@visualbi/bifrost-powerbi/dist/types/SettingsSchemaTypeDef';
import { VisualSettings } from "./settings";
import { GanttChart } from "./GanttChart";
import { JSONArrayDef } from './interfaces';
export class Configuration {
    private isProPropertiesUsed: boolean;
    private enumerationConfig: SettingsSchemaTypeDef.Section[] = [];

    private editor() {
        return {
            name: 'editor',
            properties: [
                {
                    name: 'conditionalformatting',
                    isVisible: () => false
                },
                {
                    name: 'customcss',
                    isVisible: () => false
                },
                {
                    name: 'enableCustomCss',
                    isVisible: () => false
                },
                {
                    name: 'enableCustomTheme',
                    isVisible: () => false
                },
                {
                    name: 'componentName',
                    isVisible: () => false
                },
                {
                    name: 'customSummaryTableConfig',
                    isVisible: () => false
                }, {
                    name: 'markers',
                    isVisible: () => false
                },
                {
                    name: 'zoomLevels',
                    isVisible: () => false
                },
                {
                    name: 'webUrls',
                    isVisible: () => false
                },
                {
                    name: 'enableZoomLevels',
                    isVisible: () => false
                },
                {
                    name: 'milestones',
                    isVisible: () => false
                },
                {
                    name: 'daysOff',
                    isVisible: () => false
                },
                {
                    name: 'dataLabels',
                    isVisible: () => false
                }
            ],
            isVisible: true
        }
    }

    private statusFlag(instance) {
        return {
            name: 'statusFlag',
            properties: [
                {
                    name: ['sFTitle', 'sFWidth'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.MEASURE,
                    roles: ["progressValue", "displayMeasures", "duration", "progressBase"],
                    getIteratorText: (techName, meaName) => {
                        if (techName === "sFTitle") {
                            return meaName + ' ' + "Title";
                        } else if (techName === "sFWidth") {
                            return meaName + ' ' + "Width";
                        }
                    },
                    defaultValue: ["Auto", 50],
                    isIteratorVisible: (settings, measureObj) => {
                        if (measureObj) {
                            const currentMeasure = instance.data.categorical.measures.find((measure) => { return measure.name == measureObj.name });
                            if (currentMeasure) {
                                return instance.cfAppliedMeasures[currentMeasure.name] && instance.statusFlagPresentMeasures[currentMeasure.name];
                            }
                        }
                        return false;
                    },
                    isVisible: () => {
                        return true;
                    }
                }
            ]
        }
    }

    private displayMeasure() {
        return {
            name: 'displayMeasure',
            properties: [
                {
                    name: ['aggregateValue', 'columnEnable', 'columnTitle', 'columnWidth'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.MEASURE,
                    roles: ["displayMeasures"],
                    getIteratorText: (techName, meaName) => {
                        if (techName === "columnEnable") {
                            return meaName + '';
                        } else if (techName === "columnTitle") {
                            return "Title";
                        } else if (techName === "columnWidth") {
                            return "Width";
                        } else if (techName === "aggregateValue") {
                            return "Aggregate Value in Display Measure";
                        }
                    },
                    defaultValue: [false, true, "Auto", 100],
                    isIteratorVisible: (settings, measureObj, propName) => {
                        if (propName === "columnEnable") {
                            return true;
                        } else if (propName === "aggregateValue") {
                            if (settings.chartOptions.ganttChartType == 'ganttresource') {
                                return true;
                            } else {
                                return false;
                            }
                        } else {
                            if ((measureObj && measureObj.settings && measureObj.settings.displayMeasure && measureObj.settings.displayMeasure.columnEnable)) {
                                return true;
                            } else {
                                if (measureObj && measureObj.settings) {
                                    if (measureObj.settings.displayMeasure == undefined || measureObj.settings.displayMeasure.columnEnable == undefined) {
                                        return true;
                                    }
                                }
                            }
                        }
                        return false;
                    },
                    isVisible: () => true
                }
            ]
        }
    }



    private displayColumnDuration(JSONArray: JSONArrayDef) {
        const isPlannedPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0;
        return [
            {
                name: "enableActualDuration",
                isVisible: (settings: VisualSettings) => !isPlannedPresent && settings.chartOptions.ganttChartType == 'gantt'
            },
            {
                name: "taskDurationType",
                isVisible: (settings: VisualSettings) => isPlannedPresent && settings.chartOptions.ganttChartType == 'gantt'
            },
            {
                name: "actualDurationUnit",
                isVisible: (settings: VisualSettings) => (isPlannedPresent ? settings.displayColumn.taskDurationType != 'none' : settings.displayColumn.enableActualDuration) && settings.chartOptions.ganttChartType == 'gantt'
            }, {
                name: "actualDurationDecimalPlaces",
                isVisible: (settings: VisualSettings) => (isPlannedPresent ? settings.displayColumn.taskDurationType != 'none' : settings.displayColumn.enableActualDuration) && settings.chartOptions.ganttChartType == 'gantt'
            },
            {
                name: "actualDurationSuffix",
                isVisible: (settings: VisualSettings) => (isPlannedPresent ? settings.displayColumn.taskDurationType != 'none' : settings.displayColumn.enableActualDuration) && settings.chartOptions.ganttChartType == 'gantt'
            }, {
                name: "actualDurationTitle",
                isVisible: (settings: VisualSettings) => (isPlannedPresent ? ['actual', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1 : settings.displayColumn.enableActualDuration) && settings.chartOptions.ganttChartType == 'gantt'
            },
            {
                name: "actualDurationWidth",
                isVisible: (settings: VisualSettings) => (isPlannedPresent ? ['actual', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1 : settings.displayColumn.enableActualDuration) && settings.chartOptions.ganttChartType == 'gantt'
            }, {
                name: "plannedDurationTitle",
                isVisible: (settings: VisualSettings) => ['planned', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1 && isPlannedPresent && settings.chartOptions.ganttChartType == 'gantt'
            },
            {
                name: "plannedDurationWidth",
                isVisible: (settings: VisualSettings) => ['planned', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1 && isPlannedPresent && settings.chartOptions.ganttChartType == 'gantt'
            },]
    }

    private displayColumn(instance: GanttChart, JSONArray: JSONArrayDef) {
        return {
            name: 'displayColumn',
            properties: [
                {
                    name: ['columnEnable', 'columnTitle', 'columnWidth', 'columnAggregationType'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.CATEGORY,
                    roles: ["displayColumn"],
                    getIteratorText: (techName, meaName) => {
                        if (techName === "columnEnable") {
                            return meaName + '';
                        } else if (techName === "columnTitle") {
                            return "Title";
                        } else if (techName === "columnWidth") {
                            return "Width";
                        } else if (techName == 'columnAggregationType') {
                            return 'AggregationType';
                        }
                    },
                    defaultValue: [true, "Auto", 100, 'none'],
                    isIteratorVisible: (settings, measureObj, propName) => {
                        const type = instance.dimensionsMeasuresObj[measureObj.name].type;
                        const isDateDimension = type.dateTime || type.duration;
                        let isVisible = false;
                        if (propName === "columnEnable") {
                            isVisible = true;
                        } else {
                            if ((measureObj && measureObj.settings && measureObj.settings.displayColumn && measureObj.settings.displayColumn.columnEnable)) {
                                isVisible = true;
                            }
                            else {
                                if (measureObj && measureObj.settings) {
                                    if (measureObj.settings.displayColumn == undefined || measureObj.settings.displayColumn.columnEnable == undefined) {
                                        isVisible = true;
                                    }
                                }
                            }
                        }
                        if (propName == 'columnAggregationType' && !(isVisible && isDateDimension)) {
                            isVisible = false
                        }
                        return isVisible;
                    },
                    isVisible: () => true
                },
                {
                    name: "columnIDEnabled",
                    isVisible: () => false
                },
                {
                    name: "columnIdTitle",
                    isVisible: (settings: VisualSettings) => settings.displayColumn.columnIdType != 'none'
                },
                {
                    name: "columnIdWidth",
                    isVisible: (settings: VisualSettings) => settings.displayColumn.columnIdType != 'none'
                },
                {
                    name: "categoryIndentation",
                    isVisible: () => true
                },
                ...this.displayColumnDuration(JSONArray)
            ]
        }
    }

    private dataLabel() {
        return {
            name: 'dataLabel',
            isVisible: () => true,
            properties: [
                {
                    name: "datalabeltextcolor",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show
                },
                {
                    name: "datalabelfontsize",
                    isVisible: () => false
                },
                {
                    name: "dataLabelBackgroundColorShow",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show
                },
                {
                    name: "datalabelbackgroundcolor",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show && settings.dataLabel.dataLabelBackgroundColorShow
                },
                {
                    name: "transparency",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show && settings.dataLabel.dataLabelBackgroundColorShow
                },
                {
                    name: "horizontaloffset",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show
                },
                {
                    name: "verticaloffset",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show
                }, {
                    name: "dataLabelAlignment",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show
                }, {
                    name: "enableAdaptiveLabel",
                    isVisible: (settings: VisualSettings) => settings.dataLabel.show && settings.chartOptions.ganttChartType == 'ganttresource'
                }, {
                    name: "dataLabelStep",
                    isVisible: () => false
                }
            ]
        };
    }

    private numberFormatting(JSONArray: JSONArrayDef, instance: GanttChart) {
        return {
            name: 'numberFormatting',
            properties: [
                {
                    name: ['aggregationType', 'showMeasureLabel', 'noOfDecimal', 'scalingFactor', 'prefix', 'suffix'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.MEASURE,
                    roles: ["tmeasure", "dataLabel", "progressValue", "displayMeasures"],
                    getIteratorText: (techName, meaName) => {
                        if (techName === "aggregationType") {
                            return meaName + ' AggregationType'
                        }
                        else if (techName === "showMeasureLabel") {
                            return meaName + '';
                        } else if (techName === "noOfDecimal") {
                            return "Value Decimal Places";
                        } else if (techName === "scalingFactor") {
                            return "Scaling Display";
                        } else if (techName === "prefix") {
                            return "Prefix";
                        } else if (techName === "suffix") {
                            return "Suffix";
                        } else {
                            return "";
                        }
                    },
                    defaultValue: ['sum', false, 2, "", ""],
                    isIteratorVisible: (settings, measureObj, propName) => {
                        const category = (<any>instance).data.metadata.measures.find((measure) => measure.name == measureObj.name);
                        if (!category.type.numeric) {
                            return false;
                        }
                        const isProgessMeasureOnly = category.role.progressValue && Object.keys(category.role).length == 1;
                        if (settings.chartOptions.ganttChartType !== 'gantt' && isProgessMeasureOnly) {
                            return false;
                        }
                        if (propName === "showMeasureLabel" || propName === "aggregationType") {
                            if (propName === "aggregationType") {
                                if ((measureObj && measureObj.settings && measureObj.settings.numberFormatting && measureObj.settings.numberFormatting.aggregationType != "sum") && !this.isProPropertiesUsed) {
                                    this.isProPropertiesUsed = true;
                                    instance.checkLicense(this.isProPropertiesUsed);
                                }
                                if (isProgessMeasureOnly || settings.chartOptions.ganttChartType !== 'gantt' || JSONArray.taskName.length <= 1) {
                                    return false
                                }
                            }
                            return true;
                        } else {
                            if ((measureObj && measureObj.settings && measureObj.settings.numberFormatting && measureObj.settings.numberFormatting.showMeasureLabel)) {
                                if (!this.isProPropertiesUsed) {
                                    this.isProPropertiesUsed = true;
                                    instance.checkLicense(this.isProPropertiesUsed);
                                }
                                return true;
                            }
                            return false;
                        }
                    },
                    isVisible: () => {
                        return true;
                    }
                },
                {
                    name: "isEnableSemantingFormatting",
                    isVisible: () => instance.isGanttEnterprise
                },
                {
                    name: "negativeValueColor",
                    isVisible: (settings: VisualSettings) => settings.numberFormatting.isEnableSemantingFormatting
                },
                {
                    name: "negativeValueFormat",
                    isVisible: (settings: VisualSettings) => settings.numberFormatting.isEnableSemantingFormatting
                },
                {
                    name: "positiveValueColor",
                    isVisible: (settings: VisualSettings) => settings.numberFormatting.isEnableSemantingFormatting
                },
                {
                    name: "positiveValueFormat",
                    isVisible: (settings: VisualSettings) => settings.numberFormatting.isEnableSemantingFormatting
                }]
        };
    }

    private timeLine(instance) {
        const zoomLevels  = JSON.parse(instance.settings.editor.zoomLevels);
        const timeline = zoomLevels.timeline;
        return {
            name: 'timeline',
            isVisible: () => true,
            properties: [
                //ganttTopLevel
                ...this.ganttTopLevel(),
                ...this.ganttMidLevel(),
                ...this.ganttLowLevel(),
                {
                    name: 'ganttZoomUnit',
                    isVisible: (settings: VisualSettings) => settings.timeline.ganttzoomrangeenabled
                },
                {
                    name: 'ganttZoomRange',
                    isVisible: (settings: VisualSettings) => settings.timeline.ganttzoomrangeenabled
                },
                {
                    name: 'ganttZoomAnchor',
                    isVisible: (settings: VisualSettings) => settings.timeline.ganttzoomrangeenabled
                },
                {
                    name: 'ganttCustomDate',
                    isVisible: (settings: VisualSettings) => settings.timeline.ganttZoomAnchor == 'custom' && settings.timeline.ganttzoomrangeenabled
                },
                {
                    name: 'ganttscrollenable',
                    isVisible: (settings: VisualSettings) => !settings.timeline.ganttzoomrangeenabled
                },
                ...this.todayReference(),
                {
                    name: 'timelinePaddingStart',
                    isVisible: () => Object.keys(timeline).length === 0 || timeline?.startDateOptions === 'default'
                },
                {
                    name: 'timelinePaddingEnd',
                    isVisible: () => Object.keys(timeline).length === 0 || timeline?.endDateOptions === 'default'
                }
            ]
        };
    }

    private todayReference() {
        return [
            {
                name: 'todayReferenceLine',
                isVisible: () => false
            },
            {
                name: 'todayReferenceLineColor',
                isVisible: () => false
            },
            {
                name: 'todayReferenceLineType',
                isVisible: () => false
            },
            {
                name: 'todayReferenceText',
                isVisible: () => false
            },
            {
                name: 'todayReferenceTextValue',
                isVisible: () => false
            },
            {
                name: 'todayReferenceTextColor',
                isVisible: () => false
            },
            {
                name: 'todayReferenceTextPosition',
                isVisible: () => false
            },
            {
                name: 'todayReferenceTextRotation',
                isVisible: () => false
            },
            {
                name: 'todayReferenceTextXPosition',
                isVisible: () => false
            }
        ]
    }

    private milestone() {
        return {
            name: 'milestone',
            isVisible: () => false
        };
    }

    private ganttTopLevel() {
        return [
            {
                name: 'ganttTopLevelFillColor',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            },
            {
                name: 'ganttTopLevelTextColor',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            },
            {
                name: 'ganttTopLevelFontSize',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            },
            {
                name: 'ganttTopLevelHeaderHeight',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            },
            {
                name: 'ganttTopLevelBorderColor',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            },
            {
                name: 'ganttTopLevelBorderWidth',
                isVisible: (settings: VisualSettings) => settings.timeline.gantttoplevel
            }
        ]
    }

    private ganttMidLevel() {
        return [
            {
                name: 'ganttMidLevelFillColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            },
            {
                name: 'ganttMidLevelTextColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            },
            {
                name: 'ganttMidLevelTextSize',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            },
            {
                name: 'ganttMidLevelHeaderHeight',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            },
            {
                name: 'ganttMidLevelBorderColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            },
            {
                name: 'ganttMidLevelBorderWidth',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttmidlevel
            }
        ]
    }

    private ganttLowLevel() {
        return [
            {
                name: 'ganttLowLevelFillColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttlowlevel
            },
            {
                name: 'ganttLowLevelTextColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttlowlevel
            },
            {
                name: 'ganttLowLevelFontSize',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttlowlevel
            },
            {
                name: 'ganttLowLevelBorderColor',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttlowlevel
            },
            {
                name: 'ganttLowLevelBorderWidth',
                isVisible: (settings: VisualSettings) => settings.timeline.ganttlowlevel
            }
        ]
    }

    private chartOptions(JSONArray: JSONArrayDef, instance: GanttChart) {
        const { taskName, plannedStartDate, plannedEndDate, duration } = JSONArray;
        const isPlannedPresent = plannedStartDate.length > 0 && plannedEndDate.length > 0;
        return {
            name: 'chartOptions',
            isVisible: () => true,
            properties: [
                {
                    name: 'ganttCustomDate',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttdateformat == 'custom'
                }, {
                    name: 'displayindividualtask',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType !== 'gantt' && taskName.length > 2
                },
                {
                    name: 'zoomButtonColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.zoomOptions == 'button'
                },
                {
                    name: 'zoomButtonBackgroundColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.zoomOptions == 'button'
                },
                {
                    name: 'ganttRowHeight',
                    isVisible: () => true,
                    validValues: () => {
                        return {
                            numberRange: { min: 15, max: 150, }
                        };
                    }
                },
                {
                    name: 'headerHeight',
                    isVisible: () => true,
                    validValues: () => {
                        return {
                            numberRange: { min: 60, max: 180, }
                        };
                    }
                },
                {
                    name: 'durationUnit',
                    isVisible: () => duration.length > 0
                },
                {
                    name: 'ganttBarType',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'displayTotals',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'totalLabel',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == "gantt" && settings.chartOptions.displayTotals
                },
                {
                    name: 'ganttCustomDate',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttdateformat == 'custom' && instance.isGanttEnterprise
                }, {
                    name: 'filterBlank',
                    isVisible: () => false
                },
                {
                    name: 'ganttChartType',
                    isVisible: () => instance.isGanttEnterprise
                },
                {
                    name: 'weekStartDay',
                    isVisible: () => instance.isGanttEnterprise
                },
                {
                    name: 'fiscalYearStartMonth',
                    isVisible: () => instance.isGanttEnterprise
                },
                {
                    name: 'enableZoomButton',
                    isVisible: () => false
                }, {
                    name: 'zoomOptions',
                    isVisible: () => instance.isGanttEnterprise
                },
                {
                    name: 'plannedBarHeight',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && isPlannedPresent
                }, {
                    name: 'showPlannedTaskInParent',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && isPlannedPresent
                },
                {
                    name: 'equalBarHeight',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType === 'gantt' && !isPlannedPresent && taskName.length > 1
                }
            ]
        };
    }

    private dataGrid(JSONArray: JSONArrayDef, instance: GanttChart) {
        let taskNameLength = JSONArray.taskName.length;
        let isParentNodePresent = false, isRootNodePresent = false;
        if (instance.settings.chartOptions.ganttChartType != "gantt") {
            taskNameLength = taskNameLength - 1;
            if (!instance.settings.chartOptions.displayindividualtask) {
                taskNameLength = taskNameLength - 1;
            }
        }
        isRootNodePresent = taskNameLength > 1;
        isParentNodePresent = taskNameLength > 2;
        let customizationKey, showOnlyChild = false;
        if (isRootNodePresent && isParentNodePresent) {
            customizationKey = 'nodeCustomizationChildRoot';
        } else if (isRootNodePresent && !isParentNodePresent) {
            customizationKey = 'nodeCustomizationChildParent';
        } else {
            showOnlyChild = true;
        }
        return {
            name: 'dataGrid',
            isVisible: () => true,
            properties: [
                {
                    name: 'collapseAllNodes',
                    isVisible: () => isRootNodePresent && instance.isGanttEnterprise
                },
                {
                    name: 'expandTillLevel',
                    isVisible: (settings: VisualSettings) => settings.dataGrid.collapseAllNodes && isRootNodePresent
                },
                {
                    name: 'parentNodeStyle',
                    isVisible: () => false
                },
                {
                    name: 'splitterposition',
                    isVisible: (settings: VisualSettings) => !settings.dataGrid.autoSplitPosition
                },
                {
                    name: 'nodeCustomizationChildRoot',
                    isVisible: () => customizationKey == 'nodeCustomizationChildRoot'
                }, {
                    name: 'nodeCustomizationChildParent',
                    isVisible: () => customizationKey == 'nodeCustomizationChildParent'
                },
                {
                    name: 'datagridFontColor',
                    isVisible: (settings: VisualSettings) => (settings.dataGrid[customizationKey] == 'child') || showOnlyChild
                },
                {
                    name: 'datagridFontStyle',
                    isVisible: (settings: VisualSettings) => (settings.dataGrid[customizationKey] == 'child') || showOnlyChild
                },
                {
                    name: 'datagridFontSize',
                    isVisible: (settings: VisualSettings) => (settings.dataGrid[customizationKey] == 'child') || showOnlyChild
                },
                {
                    name: 'rootNodeFontStyle',
                    isVisible: (settings: VisualSettings) => isParentNodePresent && settings.dataGrid.nodeCustomizationChildRoot == 'parent'
                },
                {
                    name: 'rootNodeFontColor',
                    isVisible: (settings: VisualSettings) => isParentNodePresent && settings.dataGrid.nodeCustomizationChildRoot == 'parent'
                },
                {
                    name: 'rootNodeFontSizeGantt',
                    isVisible: (settings: VisualSettings) => isParentNodePresent && settings.dataGrid.nodeCustomizationChildRoot == 'parent'
                },
                {
                    name: 'parentNodeFontStyle',
                    isVisible: (settings: VisualSettings) => isRootNodePresent && (settings.dataGrid[customizationKey] == 'root')
                },
                {
                    name: 'parentNodeFontColor',
                    isVisible: (settings: VisualSettings) => isRootNodePresent && (settings.dataGrid[customizationKey] == 'root')
                },
                {
                    name: 'parentNodeFontSize',
                    isVisible: (settings: VisualSettings) => isRootNodePresent && (settings.dataGrid[customizationKey] == 'root')
                }]
        };
    }

    private dataColorsInteractionState(JSONArray: JSONArrayDef, instance: GanttChart) {
        const isPlannedPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0,
            connectorPresent1 = JSONArray.primaryConnectTo.length > 0 && JSONArray.primaryConnectorType.length > 0,
            connectorPresent2 = JSONArray.secondaryConnectTo.length > 0 && JSONArray.secondaryConnectorType.length > 0,
            connectorPresent = connectorPresent1 || connectorPresent2,
            task = JSONArray.taskName;
        let interactionState;
        if (connectorPresent && instance.settings.chartOptions.ganttChartType == 'gantt') {
            interactionState = 'interactionStateWithConnector';
        } else {
            interactionState = 'interactionStateWithoutConnector';
        }
        return [{
            name: 'interactionStateWithConnector',
            isVisible: () => interactionState == 'interactionStateWithConnector'
        },
        {
            name: 'interactionStateWithoutConnector',
            isVisible: () => interactionState == 'interactionStateWithoutConnector'
        },
        {
            name: 'interactionStateWithoutConnector',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'rowColor'
        }, {
            name: 'rowColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'rowColor'
        }, {
            name: 'alternativeRowColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'rowColor'
        }, {
            name: 'rowHoverColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'rowColor'
        }, {
            name: 'hideParentBorder',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'borderColor'
        }, {
            name: 'actualParentBorderColor',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && !settings.dataColors.hideParentBorder && task.length > 1 && settings.dataColors[interactionState] == 'borderColor'
        }, {
            name: 'actualChildBorderColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'borderColor' && !settings.dataColors.hideParentBorder
        }, {
            name: 'plannedBorderColor',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && isPlannedPresent && settings.dataColors[interactionState] == 'borderColor'
        }, {
            name: 'selectedRowColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'selection'
        }, {
            name: 'enableSelectedColor',
            isVisible: (settings: VisualSettings) => settings.dataColors[interactionState] == 'selection'
        }, {
            name: 'selectedFillColor',
            isVisible: (settings: VisualSettings) => settings.dataColors.enableSelectedColor && settings.dataColors[interactionState] == 'selection'
        }, {
            name: 'connectorLineColor',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && connectorPresent && settings.dataColors[interactionState] == 'connector'
        },
        {
            name: 'connectorArrowColor',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && connectorPresent && settings.dataColors[interactionState] == 'connector'
        },
        {
            name: 'connectorLineType',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && connectorPresent && settings.dataColors[interactionState] == 'connector'
        },
        {
            name: 'connectorLineStroke',
            isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && connectorPresent && settings.dataColors[interactionState] == 'connector'
        }]
    }


    private dataColorsAll(JSONArray: JSONArrayDef) {
        const isPlannedPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0,
            task = JSONArray.taskName;
        return {
            name: 'dataColors',
            isVisible: () => true,
            properties: [
                {
                    name: 'actualParentFillColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && task.length > 1
                },
                {
                    name: 'actualParentTrackColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && task.length > 1
                },
                {
                    name: 'actualChildFillColor',
                    isVisible: () => true
                },
                {
                    name: 'actualChildTrackColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt'
                },
                {
                    name: 'plannedFillColor',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && isPlannedPresent
                },
                {
                    name: 'configurationFieldParentChild',
                    isVisible: (settings: VisualSettings) => settings.dataColors.configurationType == "parentChild" && task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'configurationFiledParent',
                    isVisible: (settings: VisualSettings) => settings.dataColors.configurationType == "parent" && task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'configurationFieldChild',
                    isVisible: (settings: VisualSettings) => settings.dataColors.configurationTypeIndividual == "individual" && task.length == 1 && settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'configurationType',
                    isVisible: (settings: VisualSettings) => task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
                },
                {
                    name: 'configurationTypeIndividual',
                    isVisible: (settings: VisualSettings) => task.length == 1 || settings.chartOptions.ganttChartType !== "gantt"
                }
            ]
        };
    }

    private dataColorsIndividualProperties(task: any) {
        return [
            {
                name: 'configurationFieldParentChild',
                isVisible: (settings: VisualSettings) => settings.dataColors.configurationType == "parentChild" && task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
            },
            {
                name: 'configurationFiledParent',
                isVisible: (settings: VisualSettings) => settings.dataColors.configurationType == "parent" && task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
            },
            {
                name: 'configurationType',
                isVisible: (settings: VisualSettings) => task.length > 1 && settings.chartOptions.ganttChartType == "gantt"
            },
            {
                name: 'configurationTypeIndividual',
                isVisible: (settings: VisualSettings) => task.length == 1 || settings.chartOptions.ganttChartType !== "gantt"
            },
            {
                name: 'configurationFieldChild',
                isVisible: (settings: VisualSettings) => task.length == 1 && settings.chartOptions.ganttChartType == "gantt"
            }]
    }

    private dataColorsIndividual(JSONArray: JSONArrayDef) {
        const taskMembers = [], task = JSONArray.taskName;
        return {
            name: 'dataColors',
            isVisible: () => true,
            properties: [
                {
                    name: ['actualParentFillColor', 'actualParentTrackColor', 'actualChildFillColor', 'actualChildTrackColor', 'plannedFillColor'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.DIMENSION,
                    roles: ['Task'],
                    dimensionIndex: 0,
                    getDefaultValue: (settings, dimensionObject, propName, displayName, value) => {
                        return value == null ? settings.dataColors[propName] : value;
                    },
                    getIteratorText: (techName, memberName) => {
                        if (memberName == null || memberName === "") return 'Blank'
                        return memberName + '';
                    },
                    skipMergeProps: true,
                    isIteratorVisible: (settings: VisualSettings, memberObject, propertyName, memberIndex, dimensionMember) => {
                        if (settings.chartOptions.ganttChartType !== "gantt") {
                            if (propertyName === 'actualChildFillColor') {
                                if (taskMembers.indexOf(dimensionMember) === -1) {
                                    taskMembers.push(dimensionMember);
                                    return true;
                                }
                            }
                            return false;
                        }
                        if (task.length > 1) {
                            if (settings.dataColors.configurationType == "parentChild") {
                                if (settings.dataColors.configurationFieldParentChild === propertyName) {
                                    if (taskMembers.indexOf(dimensionMember) === -1) {
                                        taskMembers.push(dimensionMember);
                                        return true;
                                    }
                                    return false;
                                }
                            }
                            else if (settings.dataColors.configurationType == "parent") {
                                if (settings.dataColors.configurationFiledParent === propertyName) {
                                    if (taskMembers.indexOf(dimensionMember) === -1) {
                                        taskMembers.push(dimensionMember);
                                        return true;
                                    }
                                    return false;
                                }
                            }
                        } else {
                            if (settings.dataColors.configurationFieldChild === propertyName) {
                                return true;
                            }
                        }
                        return false;
                    },
                    isVisible: () => true
                },
                ... this.dataColorsIndividualProperties(task)
            ]
        };
    }

    private dataColors(instance: GanttChart, JSONArray: JSONArrayDef) {
        const task = JSONArray.taskName;
        let dataColors;
        if ((((task.length > 1 && instance.settings.dataColors.configurationType !== 'all')
            || (task.length == 1 && instance.settings.dataColors.configurationTypeIndividual !== 'all'))
            && instance.settings.chartOptions.ganttChartType == 'gantt')
            || (instance.settings.chartOptions.ganttChartType == 'gantt'
                && instance.settings.dataColors.configurationTypeIndividual !== 'all')) {
            dataColors = this.dataColorsIndividual(JSONArray);
        } else {
            dataColors = this.dataColorsAll(JSONArray);
        }
        dataColors.properties.push(...this.dataColorsInteractionState(JSONArray, instance));
        return dataColors
    }

    private legend(instance: GanttChart, JSONArray: JSONArrayDef) {
        const isMilestoneTypePresent = JSONArray.milestoneType.length > 0;
        const isMilestoneAdded = JSONArray.milestones.length > 0;
        const cfRules = instance.settings.editor.conditionalformatting;
        const filteredCF = cfRules != '' ? JSON.parse(cfRules).filter((cf) => cf.highlighedMeasure === JSONArray.duration?.[0]?.name 
            || cf.highlighedMeasure === JSONArray.progressBase?.[0]?.name 
            || cf.highlighedMeasure === JSONArray.progressValue?.[0]?.name 
            || JSONArray.displayMeasures?.some((c) => c?.name === cf.highlighedMeasure)) 
        : [];
        const isShowCfInLegend = filteredCF.length ? filteredCF.some((c) => c?.enabled && c?.showInLegend) : false;
        return {
            name: 'legend',
            isVisible: () => isShowCfInLegend || (instance.milestoneConfig.generalConfig.milestoneLegend && (isMilestoneTypePresent || isMilestoneAdded))
        }
    }

    private interaction(instance: GanttChart) {
        return {
            name: 'interaction',
            isVisible: () => instance.isGanttEnterprise,
            properties: [
                {
                    name: 'liveEditingIconColor',
                    isVisible: (settings: VisualSettings) => settings.interaction.show
                }, {
                    name: 'modifiedData',
                    isVisible: () => false
                }]
        }

    }

    private getJSONArrayTemplate() {
        return {
            taskID: [],
            taskName: [],
            displayColumn: [],
            actualStartDate: [],
            actualEndDate: [],
            plannedStartDate: [],
            plannedEndDate: [],
            primaryConnectTo: [],
            primaryConnectorType: [],
            secondaryConnectTo: [],
            secondaryConnectorType: [],
            milestones: [],
            milestoneType: [],
            tooltips: [],
            displayMeasures: [],
            progressBase: [],
            progressValue: [],
            dataLabel: [],
            duration: []
        }
    }

    private getSummaryTable() {
        return {
            name: 'summaryTable',
            isVisible: () => true,
            properties: [{
                name: 'stTheme',
                isVisible: () => false // Theme is removed and hidden
            }, {
                name: 'summaryTableIconBackground',
                isVisible: () => false
            }]
        };
    }

    private getMigration() {
        return {
            name: 'migration',
            isVisible: () => false,
            properties: [{
                name: 'isMigrated',
                isVisible: () => false
            }]
        };
    }

    private getMiscellaneous() {
        return {
            name: 'miscellaneous',
            isVisible: () => true,
            properties: [
                {
                    name: 'footerText',
                    isVisible: (settings: VisualSettings) => settings.miscellaneous.enableFooter
                },
                {
                    name: 'footerUrl',
                    isVisible: (settings: VisualSettings) => settings.miscellaneous.enableFooter
                },
                {
                    name: 'footerColor',
                    isVisible: () => false
                },
                {
                    name: 'footerFontSize',
                    isVisible: () => false
                },
                {
                    name: 'enablePngExport',
                    isVisible: () => false
                },
                {
                    name: 'noOfRowsAllowed',
                    isVisible: () => false
                },
                {
                    name: 'individualTooltip',
                    isVisible: () => true
                }]
        };
    }

    private customTooltip() {
        return {
            name: 'customTooltip',
            isVisible: (settings: VisualSettings) => settings.miscellaneous.tooltipType == 'customTooltip'
        };
    }



    private customizeTooltip(instance: GanttChart, JSONArray: JSONArrayDef) {
        const isPlannedPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0;
        return {
            name: 'customizeTooltip',
            properties: [
                {
                    name: 'taskNameText',
                    isVisible: (settings: VisualSettings) => settings.customizeTooltip.displayTaskName
                }, {
                    name: 'startDateText',
                    isVisible: (settings: VisualSettings) => settings.customizeTooltip.displayStartDate
                }, {
                    name: 'endDateText',
                    isVisible: (settings: VisualSettings) => settings.customizeTooltip.displayEndDate
                }, {
                    name: 'displayProgressValue',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && JSONArray.progressValue.length > 0
                }, {
                    name: 'progressValueText',
                    isVisible: (settings: VisualSettings) => settings.chartOptions.ganttChartType == 'gantt' && JSONArray.progressValue.length > 0 && settings.customizeTooltip.displayProgressValue
                }, {
                    name: 'displayPlannedStartDate',
                    isVisible: isPlannedPresent
                }, {
                    name: 'displayPlannedEndDate',
                    isVisible: isPlannedPresent
                }, {
                    name: 'plannedStartDateText',
                    isVisible: (settings: VisualSettings) => settings.customizeTooltip.displayPlannedStartDate && isPlannedPresent
                }, {
                    name: 'plannedEndDateText',
                    isVisible: (settings: VisualSettings) => settings.customizeTooltip.displayPlannedEndDate && isPlannedPresent
                },
                {
                    name: ['displayMilestoneTooltip'],
                    type: SettingsSchemaTypeDef.PropertyType.ITERATOR,
                    iteratorType: SettingsSchemaTypeDef.IteratorType.CATEGORY,
                    roles: ["milestone"],
                    getIteratorText: (techName, meaName) => {
                        if (techName === "displayMilestoneTooltip") {
                            return meaName + '';
                        }
                    },
                    defaultValue: [true],
                    isIteratorVisible: (settings, measureObj, propName) => {
                        if (propName === "displayMilestoneTooltip") {
                            return settings.chartOptions.ganttChartType === 'gantt' && instance.milestoneConfig.generalConfig.milestoneType === 'marker';
                        }
                        return false;
                    },
                    isVisible: true
                },
            ]
        };
    }

    private getUtilityMenuAction() {
        return {
            name: 'utilityMenuAction',
            isVisible: false
        };
    }

    private writeBack(instance: GanttChart) {
        return {
            name: 'writeBack',
            isVisible: () => instance.guid.indexOf('GanttWrite4C3653EFFFEB4E7DA5A699CE198391E2') >= 0
        };
    }

    private references(instance: GanttChart, JSONArray: JSONArrayDef) {
        const isReferenceStartDatePresent = JSONArray.referenceStartDate.length > 0;
        const isReferenceEndDatePresent = JSONArray.referenceStartDate.length > 0;
        return {
            name: 'reference',
            isVisible: isReferenceStartDatePresent,
            properties: [
                {
                    name: 'lineType',
                    isVisible: (settings: VisualSettings) => settings.reference.enableLineType
                }, {
                    name: 'lineStroke',
                    isVisible: (settings: VisualSettings) => settings.reference.enableLineType
                }, {
                    name: 'lineColor',
                    isVisible: (settings: VisualSettings) => settings.reference.enableLineType
                }, {
                    name: 'textWeight',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textColor',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textXPosition',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textYPosition',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textRotation',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textType',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType && isReferenceEndDatePresent
                }, {
                    name: 'textBackgroundColorShow',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType
                }, {
                    name: 'textBackgroundColor',
                    isVisible: (settings: VisualSettings) => settings.reference.enableTextType && settings.reference.textBackgroundColorShow
                }, {
                    name: 'rangePattern',
                    isVisible: isReferenceEndDatePresent
                }, {
                    name: 'rangeColor',
                    isVisible: isReferenceEndDatePresent
                }
            ]
        };
    }

    public getEnumerationConfiguration(instance) {
        let JSONArray;
        if (instance.JSONArray) JSONArray = instance.JSONArray;
        else {
            JSONArray = this.getJSONArrayTemplate();
        }
        if (!instance.settings) instance.settings = instance.visualSettings;
        this.enumerationConfig.push(this.dataLabel());
        this.enumerationConfig.push(this.numberFormatting(JSONArray, instance));
        this.enumerationConfig.push(this.timeLine(instance));
        this.enumerationConfig.push(this.chartOptions(JSONArray, instance));
        this.enumerationConfig.push(this.dataGrid(JSONArray, instance));
        this.enumerationConfig.push(this.editor());
        this.enumerationConfig.push(this.interaction(instance));
        this.enumerationConfig.push(this.statusFlag(instance));
        this.enumerationConfig.push(this.displayMeasure());
        this.enumerationConfig.push(this.displayColumn(instance, JSONArray));
        this.enumerationConfig.push(this.milestone());
        this.enumerationConfig.push(this.dataColors(instance, JSONArray));
        this.enumerationConfig.push(this.legend(instance, JSONArray));
        this.enumerationConfig.push(this.getSummaryTable());
        this.enumerationConfig.push(this.getMiscellaneous());
        this.enumerationConfig.push(this.getMigration());
        this.enumerationConfig.push(this.customTooltip());
        this.enumerationConfig.push(this.customizeTooltip(instance, JSONArray));
        this.enumerationConfig.push(this.writeBack(instance));
        this.enumerationConfig.push(this.references(instance, JSONArray));
        this.enumerationConfig.push(this.getUtilityMenuAction());
        return this.enumerationConfig;
    }
}
