/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
import MigrationSettings from "./Migration/MigrationSettings";

export class VisualSettings extends DataViewObjectsParser {
    public bifrostSection = new BifrostSection();
    public license = new License();
    public chartOptions = new ChartOptions();
    public displayColumn = new DisplayColumn();
    public displayMeasure = new DisplayMeasure();
    public statusFlag = new StatusFlag();
    public dataGrid = new DataGrid();
    public timeline = new Timeline();
    public milestone = new Milestone();
    public legend = new Legend();
    public dataLabel = new DataLabel();
    public dataColors = new DataColors();
    public numberFormatting = new NumberFormatting();
    public reference = new Reference();
    public editor = new Editor();
    public summaryTable = new SummaryTable();
    public interaction = new Interaction();
    public miscellaneous = new Miscellaneous();
    public utilityMenu = new UtilityMenu();
    public utilityMenuAction = new UtilityMenuAction();
    public customizeTooltip = new customizeTooltip();
    public customTooltip = new CustomTooltip();
    public migration = new Migration();
    public writeBack = new WriteBack();
}

export class ChartOptions {
    public fontfamily: string = '"Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif';
    public ganttChartType: string = 'gantt';
    public ganttBarType: string = 'bar';
    public displayindividualtask: boolean = false;
    public durationUnit: string = 'days';
    public ganttRowHeight: number = 15;
    public actualBarHeight: number = 80;
    public equalBarHeight: boolean = true;
    public plannedBarHeight: number = 50;
    public headerHeight: number = 100;
    public weekStartDay: string = '0';
    public fiscalYearStartMonth: string = '1';
    public fiscalYearType: string = 'default';
    public ganttdateformat: string = 'DD-MM-YYYY';
    public ganttCustomDate: string = ' ';
    public displayTotals: boolean = false;
    public totalLabel: string = '';
    public filterBlank: boolean = false;
    public hideBlankGantt: string = 'none';
    public showPlannedTaskInParent: boolean = false;
    public chartBackgroundColor: string = '#ffffff';
    public hideParentOnCollapse: boolean = false;
    public hideParentOnExpand: boolean = false;
    public enableZoomButton: boolean = false;
    public zoomOptions: string = 'none';
    public zoomButtonColor: string = '#000000';
    public zoomButtonBackgroundColor: string = '#f2c80f';
    public showLicensePopUp: string = 'true';

}
export class UtilityMenu {
    public utilityMenuIconColor: string = '#212121';
    public isTooltip: boolean = true;
    public isLevels: boolean = false;
}
export class UtilityMenuAction {
    public isTooltipEnabled: boolean = true;
}
export class DisplayColumn {
    public categoryIndentation: number = 0;
    public columnIDEnabled: boolean = false;
    public columnIdType: string = 'none';
    public columnIdTitle: string = 'ID';
    public columnIdWidth: number = 30;
    public enableActualDuration: boolean = false;
    public taskDurationType: string = 'none';
    public actualDurationUnit: string = 'days';
    public actualDurationDecimalPlaces: number = 0;
    public actualDurationSuffix: string = ' ';
    public actualDurationTitle: string = 'Actual Duration';
    public actualDurationWidth: number = 50;
    public plannedDurationTitle: string = 'Planned Duration';
    public plannedDurationWidth: number = 50;
    public columnNameTitle: string = 'Name';
    public columnNameWidth: number = 200;
    public columnEnable: boolean = true;
    public columnTitle: string = ' ';
    public columnWidth: number = 100;
    public columnAggregationType: string = 'none';
}
export class DisplayMeasure {
    public aggregateValue: boolean = false;
    public columnEnable: boolean = true;
    public columnTitle: string = ' ';
    public columnWidth: number = 100;
}
export class StatusFlag {
    public sFTitle: string = '';
    public sFWidth: number = 100;
}
export class DataGrid {
    public headerBackgroungColor: string = '#ffffff';
    public headerFontColor: string = '#777777';
    public headerFontSize: number = 16;
    public nodeCustomizationChildParent: string = 'child';
    public nodeCustomizationChildRoot: string = 'child';
    public datagridFontStyle: string = 'default';
    public datagridFontColor: string = '#000000';
    public datagridFontSize: number = 12;
    public parentNodeFontStyle: string = 'default';
    public parentNodeFontColor: string = '#000000';
    public parentNodeFontSize: number = 12;
    public rootNodeFontStyle: string = 'default';
    public rootNodeFontColor: string = '#000000';
    public rootNodeFontSizeGantt: number = 12;
    public collapseAllNodes: boolean = false;
    public expandTillLevel: number = 0;
    public autoSplitPosition: boolean = true;
    public splitterposition: number = 170;
    public gridColor: string = '#cccccc';
    public gridWidth: number = 1;
    public parentNodeStyle: boolean = false;
}
export class Timeline {
    public ganttHeaderFormat: string = 'normal';
    public gantttoplevel: boolean = true;
    public ganttTopLevelFillColor: string = '#f7f7f7';
    public ganttTopLevelTextColor: string = '#000000';
    public ganttTopLevelFontSize: number = 12;
    public ganttTopLevelHeaderHeight: number = 33.3;
    public ganttTopLevelBorderColor: string = '#8f2b2b';
    public ganttTopLevelBorderWidth: number = 0;
    public ganttmidlevel: boolean = true;
    public ganttMidLevelFillColor: string = '#f7f7f7';
    public ganttMidLevelTextColor: string = '#000000';
    public ganttMidLevelTextSize: number = 12;
    public ganttMidLevelHeaderHeight: number = 33.3;
    public ganttMidLevelBorderColor: string = '#5c2c2c';
    public ganttMidLevelBorderWidth: number = 0;
    public ganttlowlevel: boolean = true;
    public ganttLowLevelFillColor: string = '#f7f7f7';
    public ganttLowLevelTextColor: string = '#000000';
    public ganttLowLevelFontSize: number = 12;
    public ganttLowLevelBorderColor: string = '#5e3232';
    public ganttLowLevelBorderWidth: number = 0;
    public timelinePaddingStart: number = 2;
    public timelinePaddingEnd: number = 10;
    public ganttzoomrangeenabled: boolean = false;
    public ganttZoomUnit: string = 'year';
    public ganttZoomRange: number = 0;
    public ganttZoomAnchor: string = 'first-date';
    public ganttCustomDate: string = ' ';
    public ganttscrollenable: boolean = false;
    public scrollBarColor: string = '#d5d5d5';
    public todayReferenceLine: boolean = false;
    public todayReferenceLineType: string = 'solid';
    public todayReferenceLineColor: string = '#000000';
    public todayReferenceText: boolean = false;
    public todayReferenceTextValue: string = '';
    public todayReferenceTextColor: string = '#000000';
    public todayReferenceTextXPosition: number = 0;
    public todayReferenceTextPosition: number = 0;
    public todayReferenceTextRotation: number = 0;
}
export class Milestone {
    public mileStoneFromData: boolean = true;
    public milestoneType: string = 'marker';
    public enablePreview: boolean = false;
    public configurationFrom: string = 'milestoneName';
    public configurationTypeMileStone: string = 'all';
    public configurationFiledMilestone: string = 'milestoneFillColor';
    public milestoneBorderColorData: string = '#000000';
    public milestoneFillColorData: string = '#000000';
    public milestoneShapeData: string = 'diamond';
    public milestoneBorderColor: string = '#383838';
    public milestoneFillColor: string = '#7ed321';
    public milestoneShape: string = '\uF133';
    public milestoneIconName: string = "diamond";
    public milestoneLegend: boolean = false;
}
export class Legend {
    public vpositionGantt: string = 'top';
    public hposition: string = 'left';
    public titleText: string = '';
    public color: string = '#000000';
    public legendFontSize: number = 12;
}
export class DataLabel {
    public show: boolean = true;
    public datalabeltextcolor: string = '#777777';
    public dlFontSize: number = 12;
    public datalabelfontsize: string = '12';
    public dataLabelBackgroundColorShow: boolean = true;
    public datalabelbackgroundcolor: string = '#e6e6e6';
    public transparency: number = 25;
    public dataLabelAlignment: string = 'right-center';
    public horizontaloffset: number = 0;
    public verticaloffset: number = 0;
    public enableAdaptiveLabel: boolean = false;
    public dataLabelStep: number = 0;
}
export class DataColors {
    public interactionStateWithConnector: string = 'rowColor';
    public interactionStateWithoutConnector: string = 'rowColor';
    public rowColor: string = '#f7f7f7';
    public alternativeRowColor: string = '#f7f7f7';
    public rowHoverColor: string = '#f7f7f7';
    public hideParentBorder: boolean = false;
    public actualParentBorderColor: string = '#000000';
    public actualChildBorderColor: string = '#000000';
    public plannedBorderColor: string = '#2a1e58';
    public selectedRowColor: string = '#ebf1f4';
    public enableSelectedColor: boolean = false;
    public selectedFillColor: string = '#e05324';
    public connectorLineColor: string = '#131313';
    public connectorArrowColor: string = '#1a1a1a';
    public connectorLineType: string = 'solid';
    public connectorLineStroke: number = 2;
    public configurationType: string = 'all';
    public configurationTypeIndividual: string = 'all';
    public configurationFieldParentChild: string = 'actualParentFillColor';
    public configurationFieldChild: string = 'actualChildFillColor';
    public configurationFiledParent: string = 'actualParentFillColor';
    public actualParentFillColor: string = '#455a64';
    public actualParentTrackColor: string = '#1c2529';
    public actualChildFillColor: string = '#64b5f6';
    public actualChildTrackColor: string = '#007bab';
    public plannedFillColor: string = '#241b52';
}
export class NumberFormatting {
    public aggregationType: string = 'sum';
    public showMeasureLabel: boolean = false;
    public noOfDecimal: number = null;
    public scalingFactor: string = 'auto';
    public prefix: string = '';
    public suffix: string = '';
    public isEnableSemantingFormatting: boolean = false;
    public negativeValueColor: string = '#db2828';
    public negativeValueFormat: string = '-x';
    public positiveValueColor: string = '#21ba45';
    public positiveValueFormat: string = 'x';
}

export class Reference {
    public enableLineType: boolean = true;
    public lineType: string = 'solid';
    public lineStroke: number = 2;
    public lineColor: string = '#000000';
    public enableTextType: boolean = true;
    public textWeight: string = 'bold';
    public textColor: string = '#000000';
    public textType: string = 'default';
    public textXPosition: number = 9;
    public textYPosition: number = 0;
    public textRotation: number = 90;
    public textBackgroundColorShow: boolean = true;
    public textBackgroundColor: string = '#E3E8E8';
    public rangePattern: string = 'none';
    public rangeColor: string = '#FF00FF';
}

export class Editor {
    public conditionalformatting: string = '';
    public customcss: string = '{}';
    public enableCustomCss: boolean = false;
    public enableCustomTheme: boolean = false;
    public componentName: string = 'ganttChart';
    public customSummaryTableConfig: string = '';
    public enableCustomSummaryTable: boolean = false;
    public markers: string = '[]';
    public enableZoomLevels: boolean = false;
    public zoomLevels: string =
        '{"zoomLevels":[{"name":"granularity001","granularity1":"quarter","granularity1Value":1,"granularity1Format":"","granularity2":"month","granularity2Value":1,"granularity2Format":"","granularity3":"day","granularity3Value":11,"granularity3Format":""},{"name":"granularity0.9772483996000536","granularity1":"month","granularity1Value":1,"granularity1Format":"","granularity2":"day","granularity2Value":2,"granularity2Format":"","granularity3":"hour","granularity3Value":12,"granularity3Format":""},{"name":"granularity0.5730343628200893","granularity1":"day","granularity1Value":1,"granularity1Format":"","granularity2":"hour","granularity2Value":8,"granularity2Format":"","granularity3":"minute","granularity3Value":30,"granularity3Format":""}],"isEnabled":false,"timeline": {}}';
    public webUrls: string = '[]';
    public milestones: string =
        '{"generalConfig":{"mileStoneFromData":true,"milestoneType":"marker","enablePreview":true,"configurationFrom":"milestoneName","configurationTypeMileStone":"all","milestoneLegend":false,"isCustomImage":false},"milestoneFieldConfig":{},"milestoneNameFieldConfig":{},"singleConfig":{"milestoneBorderColor":"#383838","milestoneFillColor":"#7ed321","milestoneShape":"\uF133","milestoneIconName":"diamond","image":"","imageName":""},"dataConfig":{"milestoneBorderColor":"#383838","milestoneFillColor":"#7ed321","milestoneShape":"\uF133","milestoneIconName":"diamond","image":"","imageName":""}}';
    public daysOff: string =
        '{"calendar":{"nonWorkingDays":[],"color":"rgba(255, 0, 255,0.5)","patternType": "horizontal"},"holiday":{"nonWorkingDays":[],"color":"rgba(245, 156, 66,0.5)","patternType": "horizontal"}}';
    public dataLabels: string = '{}';
}
export class SummaryTable {
    public show: boolean = true;
    public stTheme: string = 'ag-theme-balham';
    public summaryTableIconColor: string = '#666666';
    public summaryTableIconBackground: string = '#ffffff';
}
export class Interaction {
    public show: boolean = false;
    public liveEditingIconColor: string = '#000000';
    public modifiedData: string = '{}';
}
export class Miscellaneous {
    public noOfRowsAllowed: number = 1;
    public tooltipType: string = 'powerbi';
    public enableFooter: boolean = false;
    public footerUrl: string = 'https://xviz.com/';
    public footerText: string = 'Please visit xViz.com for licensing.';
    public footerColor: string = '#777777';
    public footerFontSize: number = 12;
    public enablePngExport: boolean = false;
    public individualTooltip: boolean = true;
}
export class CustomTooltip {
    public labelColor: string = '#c8c8c8';
    public customTooltipValueColor: string = '#eaeaea';
    public customTooltipFontSize: number = 12;
    public customTooltipBackgroundColor: string = '#000000';
    public customTooltipFontfamily: string = '"Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif';
}

export class customizeTooltip {
    public displayTaskName: boolean = true;
    public taskNameText: string = 'Name';
    public displayStartDate: boolean = true;
    public startDateText: string = 'Start Date';
    public displayEndDate: boolean = true;
    public endDateText: string = 'End Date';
    public displayProgressValue: boolean = true;
    public progressValueText: string = 'Progress';
    public displayPlannedStartDate: boolean = true;
    public plannedStartDateText: string = 'Planned Start Date';
    public displayPlannedEndDate: boolean = true;
    public plannedEndDateText: string = 'Planned End Date';
    public displayMilestoneTooltip: boolean = true;
}

export class Migration {
    public isMigrated: string = '{}';
    public migrationSettings: string = JSON.stringify(MigrationSettings);
}
export class WriteBack {
    public show: boolean = false;
    public fetchEndPoint: string = ' ';
    public updateEndPoint: string = ' ';
    public fetchUpdateDataType: string = 'json';
    public sendOnlyModifiedItem: boolean = false;
}
export class ValidValues {
    static sections = [
        {
            name: 'chartOptions',
            properties: [
                {
                    name: 'actualBarHeight',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 100,
                            },
                        },
                    },
                },
                {
                    name: 'plannedBarHeight',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 100,
                            },
                        },
                    },
                },
                {
                    name: 'headerHeight',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 1,
                                max: 60,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'displayColumn',
            properties: [
                {
                    name: 'actualDurationDecimalPlaces',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 10,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'dataGrid',
            properties: [
                {
                    name: 'headerFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
                {
                    name: 'datagridFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
                {
                    name: 'parentNodeFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 60,
                            },
                        },
                    },
                },
                {
                    name: 'rootNodeFontSizeGantt',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 60,
                            },
                        },
                    },
                },
                {
                    name: 'splitterposition',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 3000,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'timeline',
            properties: [
                {
                    name: 'ganttTopLevelFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
                {
                    name: 'ganttMidLevelTextSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
                {
                    name: 'ganttLowLevelFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'legend',
            properties: [
                {
                    name: 'legendFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 60,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'dataLabel',
            properties: [
                {
                    name: 'dlFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 60,
                            },
                        },
                    },
                },
                {
                    name: 'transparency',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 100,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'dataColors',
            properties: [
                {
                    name: 'connectorLineStroke',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 1,
                                max: 5,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'numberFormatting',
            properties: [
                {
                    name: 'noOfDecimal',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 0,
                                max: 10,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'miscellaneous',
            properties: [
                {
                    name: 'noOfRowsAllowed',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 1,
                                max: 10,
                            },
                        },
                    },
                },
                {
                    name: 'footerFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 60,
                            },
                        },
                    },
                },
            ],
        },
        {
            name: 'customTooltip',
            properties: [
                {
                    name: 'customTooltipFontSize',
                    configuration: {
                        validValues: {
                            numberRange: {
                                min: 8,
                                max: 30,
                            },
                        },
                    },
                },
            ],
        },
    ];
}
export class BifrostSection {
    public bifrost: string = '{}';
}
export class License {
    public key: string = '';
    public customer: string = '';
    public appSourceLicense: string = '';
}
