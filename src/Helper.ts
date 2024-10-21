import { Data } from '@visualbi/bifrost-powerbi/dist/types/DataTypeDef';
import { VisualSettings, NumberFormatting } from './settings';
import { HighContrastColors } from '@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef';
import { AnychartSelectionManager } from './AnychartSelectionManager';
import { applyFormattings } from '@visualbi/powerbi-common/dist/HighChartUtils/formatting';
import { HighchartsUtil } from '@visualbi/powerbi-common/dist/HighChartUtils/HighchartsUtil';
import * as moment from 'moment';
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import { GanttChart } from './GanttChart';
import { JSONArrayDef, Reference } from './interfaces';
import { SelectionIdBuilder } from '@visualbi/bifrost-powerbi/dist/SelectionIdBuilder';
import { Util } from './Util';

const escape = require('lodash.escape');
const anychartCustomBuildMinJs = require('@visualbi/powerbi-editor/dist/gantt/externalLib/anychart-custom-build.min.js');

let dataGridColumnSize, displayColumnSize, displayMeasureSize;
let zInFactor = 1;
let zOutFactor = 1;
let isZoomApplied = false;

export class Helper {
    static VALI_DATE_FIELDS(data: Data) {
        let isTaskName = false,
            isStartDate = false,
            isEndDate = false,
            status = false,
            isBaseValue = false,
            isBaseValueRequired = false,
            progress,
            msg;
        data.metadata.dimensions.forEach((dimension) => {
            if (dimension.role.Task) isTaskName = true;
            if (dimension.role.actualStart) isStartDate = true;
            if (dimension.role.actualEnd) isEndDate = true;
        });
        data.metadata.measures.forEach((measure) => {
            if (measure.role.duration || isEndDate) isEndDate = true;
            if (measure.role.progressValue) progress = measure;
            if (measure.role.progressBase) isBaseValue = true;
        });
        if (progress && progress.values) {
            isBaseValueRequired = !progress.values.every((value) => value >= 0 && value <= 100);
        }
        if (isTaskName && isStartDate && isEndDate) {
            status = true;
        } else if (!isTaskName) {
            msg = 'Task Name is Empty';
        } else if (!isStartDate) {
            msg = 'Start Date is Empty';
        } else if (!isEndDate) {
            msg = 'End Date is Empty';
        }
        if (isBaseValueRequired && !isBaseValue) {
            status = false;
            msg = 'Please add the base Value to calculate progess Percentage';
        }
        return { status: status, msg: msg };
    }

    static APPLY_SETTINGS(
        chart: any,
        settings: VisualSettings,
        instance: GanttChart,
        data: Data,
        JSONArray: any,
        highContrast: HighContrastColors,
        anychartSelectionManager: AnychartSelectionManager,
    ) {
        this.processDisplayColumn(chart, settings, data, JSONArray, highContrast, instance);
        this.dataGrid(chart, settings);
        this.daysOff(chart, settings);
        this.TIMELINE(chart, settings, instance, highContrast, JSONArray, data);
        this.tooltip(chart, settings, instance, JSONArray, anychartSelectionManager);
        this.dataLabel(chart, settings, instance, JSONArray, highContrast);
        this.dataColors(chart, settings, highContrast, instance);
        this.milestone(chart, settings, instance, highContrast);
        this.chartOptions(chart, settings, JSONArray);
    }

    private static ganttBarType(chart: any, settings: VisualSettings) {
        // a function for drawing custom elements
        const drawingFunction = function () {
            // get the shapes of the element
            const shapes = this['shapes'];
            // get the shape to be modified
            const path = shapes['path'];
            // get the bounds of the element
            const bounds = this['predictedBounds'];

            const h = bounds.height;
            const t = bounds.top;
            const l = bounds.left;
            const r = bounds.left + bounds.width;
            const h1 = bounds.top + bounds.height;
            const h4 = h / 4;
            const h2 = h / 2;

            // draw a rounded rectangle
            path.moveTo(l + h4, h1 - h4);
            path.arcTo(h4, h4, -270, 180);
            path.lineTo(r - h4, t + h4);
            path.arcTo(h4, h4, -90, 180);
            path.lineTo(l + h2, h1 - h4);
            path.close();
        };
        const timeline = chart.getTimeline();
        if (settings.chartOptions.ganttChartType == 'gantt') {
            const tasks = timeline.tasks();
            const baselines = timeline.baselines();
            const parentTasks = timeline.groupingTasks();
            const progress = timeline.tasks().progress();
            timeline.elements().height(settings.chartOptions.ganttRowHeight);
            tasks.rendering().drawer(drawingFunction);
            baselines.rendering().drawer(drawingFunction);
            parentTasks.rendering().drawer(drawingFunction);
            progress.rendering().drawer(drawingFunction);
        } else if (settings.chartOptions.ganttChartType == 'ganttresource') {
            const periods = timeline.periods();
            periods.height(settings.chartOptions.ganttRowHeight);
            periods.rendering().drawer(drawingFunction);
        }
    }

    private static daysOff(chart: any, settings: VisualSettings) {
        const daysOff = JSON.parse(settings.editor.daysOff);
        const timeline = chart.getTimeline();
        const calendar = timeline.scale().calendar();
        const daysOffCalendar = daysOff.calendar;
        if (daysOffCalendar.enabled) {
            const scheduleArray = [
                { from: 0, to: 24 },
                { from: 0, to: 24 },
                { from: 0, to: 24 },
                { from: 0, to: 24 },
                { from: 0, to: 24 },
                { from: 0, to: 24 },
                { from: 0, to: 24 },
            ];
            daysOffCalendar.nonWorkingDays.forEach((nowWorkingDay) => {
                scheduleArray[nowWorkingDay['value']] = null;
            });
            calendar.schedule(scheduleArray);
            const weekendsPattern = daysOffCalendar.patternType;
            const weekendsFillColor = daysOffCalendar.color;
            if (weekendsPattern == 'none') timeline.weekendsFill(weekendsFillColor);
            else if (['backward-diagonal', 'forward-diagonal', 'horizontal', 'vertical'].indexOf(weekendsPattern) != -1)
                timeline.weekendsFill(
                    anychartCustomBuildMinJs.graphics.hatchFill(weekendsPattern, weekendsFillColor, 2, 5),
                );
            else timeline.weekendsFill(anychartCustomBuildMinJs.graphics.hatchFill(weekendsPattern, weekendsFillColor));
        }
        const daysOffHoliday = daysOff.holiday;
        if (daysOffHoliday.enabled) {
            const holidays = daysOffHoliday.nonWorkingDays.map((nowWorkingDate) => {
                const momentObj = moment(nowWorkingDate, 'DD-MM-YYYY');
                if (momentObj.isValid()) {
                    return { month: momentObj.month(), day: momentObj.date(), year: momentObj.year() };
                }
            });
            calendar.holidays(holidays);
            const holidayPattern = daysOffHoliday.patternType;
            const holidayFillColor = daysOffHoliday.color;
            if (holidayPattern == 'none') timeline.holidaysFill(holidayFillColor);
            else if (['backward-diagonal', 'forward-diagonal', 'horizontal', 'vertical'].indexOf(holidayPattern) != -1)
                timeline.holidaysFill(
                    anychartCustomBuildMinJs.graphics.hatchFill(holidayPattern, holidayFillColor, 2, 5),
                );
            else timeline.holidaysFill(anychartCustomBuildMinJs.graphics.hatchFill(holidayPattern, holidayFillColor));
        }
    }

    private static milestone(chart: any, settings: VisualSettings, instance: GanttChart, highContrast: HighContrastColors) {
        // configure milestones
        const ganttRowHeight = settings.chartOptions.ganttRowHeight;
        const milestones = chart.getTimeline().milestones();
        const selectedFillColor = highContrast.isHighContrast ? highContrast.foregroundSelected : settings.dataColors.enableSelectedColor ? settings.dataColors.selectedFillColor : null;
        
        // selected color for milestone
        const { singleConfig, generalConfig } = instance.milestoneConfig;
        const { milestoneFillColor, milestoneBorderColor, milestoneIconName } = singleConfig;
        const { enablePreview } = generalConfig;

        milestones.normal().fill(milestoneFillColor);
        milestones.normal().stroke(milestoneBorderColor);
        milestones.selected().fill(selectedFillColor || milestoneFillColor);
        milestones.selected().stroke(selectedFillColor || milestoneBorderColor);
        milestones.markerType(milestoneIconName);
        
        milestones.preview({
            enabled: enablePreview,
            height: ganttRowHeight * 0.7,
            offset: ganttRowHeight / 10,
        })
    }

    private static displayIDHierarchical(column) {
        column.labels().format((event) => {
            return event.item['get']('hierarchyID');
        });
    }

    private static processDisplayColumn(
        chart: any,
        settings: VisualSettings,
        data: Data,
        JSONArray: JSONArrayDef,
        highContrast: HighContrastColors,
        instance: GanttChart,
    ) {
        displayColumnSize = 2;
        const column_1 = chart.dataGrid().column(0);
        column_1.enabled(settings.displayColumn.columnIdType != 'none');
        column_1.title(settings.displayColumn.columnIdTitle);
        column_1.width(settings.displayColumn.columnIdWidth);
        if (JSONArray.taskName.length > 1 && settings.displayColumn.columnIdType == 'hierarchical')
            this.displayIDHierarchical(column_1);
        const column_2 = chart.dataGrid().column(1);
        column_2.title(settings.displayColumn.columnNameTitle).width(settings.displayColumn.columnNameWidth);
        this.displayColumnDuration(chart, JSONArray, settings, highContrast);
        const displayColumns = JSONArray.displayColumn.filter((displayColumn) => {
            const displayColumnSettings = displayColumn.settings.displayColumn;
            if (
                (displayColumnSettings && displayColumnSettings.columnEnable) ||
                displayColumnSettings == undefined ||
                displayColumnSettings.columnEnable == undefined
            ) {
                return true;
            }
        });
        dataGridColumnSize = displayColumns.length;
        //construct columns
        for (let columnNumber = 2; columnNumber < dataGridColumnSize + 2; columnNumber++) {
            const displayColumn = displayColumns[columnNumber - 2];
            const displayColumnSettings = displayColumn.settings.displayColumn;
            let displayName = (displayColumnSettings && displayColumnSettings.columnTitle) || displayColumn.label;
            if (displayName == '_blank') displayName = '';
            const width = (displayColumnSettings && displayColumnSettings.columnWidth) || 100;
            const column = chart.dataGrid().column(displayColumnSize);
            displayColumnSize++;
            column.labels().useHtml(true);
            column.title(displayName).width(width);
            if (settings.chartOptions.ganttChartType == 'gantt') {
                this.labelOverriderFirstColumn(column_1, highContrast);
                if (instance._isMSBrowser) {
                    column.labelsOverrider((label, dataItem) => {
                        this.labelsOverriderGanttDisplayColumn(label, dataItem, displayColumn.name);
                    });
                } else {
                    column
                        .labels()
                        .format(this.ganttDisplayColumn.bind({ columnID: displayColumn.name, highContrast }));
                }
            } else {
                this.labelOverriderFirstColumnGanttResource(column_1);
                if (instance._isMSBrowser) {
                    column.labelsOverrider((label, dataItem) => {
                        this.labelsOverriderGanttResourceDisplayColumn(
                            label,
                            dataItem,
                            columnNumber - 2,
                            column,
                            settings,
                            this,
                        );
                    });
                } else {
                    column
                        .labels()
                        .format(
                            this.ganttResourceDisplayColumn.bind({ index: columnNumber - 2, column, highContrast, settings }),
                        );
                }
            }
        }
        this.processDisplayMeasure(chart, settings, data, JSONArray, highContrast, instance);
        this.processStatusFlag(chart, settings, data, highContrast, instance);
        if (settings.chartOptions.ganttChartType == 'gantt') {
            this.taskNameCfApplierGantt(column_2, settings, JSONArray, highContrast);
        } else {
            this.taskNameCfApplierGanttResource(column_2, settings, JSONArray, highContrast);
        }
    }

    private static labelsOverriderGanttResourceStatusFlag(
        label: any,
        dataItem: any,
        measureID: string,
        settings: VisualSettings,
    ) {
        const periods = dataItem['get']('periods'),
            maxOccurence = (colors) => {
                const obj = {};
                let maxCount = 0,
                    maxColor;
                colors.forEach((color) => {
                    if (color) {
                        obj[color] = obj[color] + 1;
                        maxColor ? '' : (maxColor = color);
                        if (obj[color] > maxCount) {
                            maxCount = obj[color];
                            maxColor = color;
                        }
                    }
                });
                return maxColor;
            };
        const colors = [],
            iconArray = [];
        if (periods) {
            periods.forEach((period) => {
                if (period.displayMeasure) {
                    const periodDisplayMeasure = period.displayMeasure.find((measure) => measure.id == measureID);
                    let color, icon;
                    if (periodDisplayMeasure) {
                        color = periodDisplayMeasure.color;
                        icon = periodDisplayMeasure.icon;
                    }
                    colors.push(color);
                    iconArray.push(icon);
                }
            });
        }
        let icons = '';
        const isFlagNotPresent = colors.every((color) => !color);
        if (isFlagNotPresent) return;
        colors.forEach((color, index) => {
            if (color) {
                icons = icons + iconArray[index];
            } else if (!isFlagNotPresent) {
                icons = icons + '\uF39B';
            }
        });
        const color = maxOccurence(colors);
        if (!color) return;
        label.fontColor(color);
        label.fontSize(settings.dataGrid.datagridFontSize).fontFamily('FabricMDL2Icons');
        label.format(icons);
    }

    private static labelsOverriderGanttStatusFlag(
        label: any,
        dataItem: any,
        measureID: string,
        settings: VisualSettings,
    ) {
        if (dataItem['get']('displayMeasure')) {
            const displayMeasureObj = dataItem['get']('displayMeasure').find((displayMeasure) => {
                return displayMeasure.id == measureID;
            });
            if (!displayMeasureObj) return;
            const color = displayMeasureObj.color;
            const icon = displayMeasureObj.icon;
            if (color) {
                label.fontColor(color);
                label.fontSize(settings.dataGrid.datagridFontSize).fontFamily('FabricMDL2Icons');
                label.format(icon ? icon : '\uE7C1');
            }
        }
    }

    private static labelOverriderFirstColumn(column: any, highContrast: HighContrastColors) {
        column.labelsOverrider((label, dataItem) => {
            const cfColor = dataItem['get']('othersCfColor')['idInternal'];
            if (cfColor) {
                label.fontColor(cfColor);
            } else if (highContrast.isHighContrast) {
                label.fontColor(highContrast.foreground);
            }
        });
    }

    private static labelsOverriderGanttDisplayMeasure(
        label: any,
        dataItem: any,
        currentMeasureIndex: number,
        column: any,
        settings: VisualSettings,
        instance: GanttChart,
        highContrast: HighContrastColors,
        autoScalingFactor: string
    ) {
        const displayColumnsMeasures = dataItem['get']('displayColumnsMeasure');
        let colValue = '',
            color;
        if (displayColumnsMeasures && displayColumnsMeasures[currentMeasureIndex]) {
            const displayColumnMeasure = displayColumnsMeasures[currentMeasureIndex];
            if (displayColumnMeasure.numberFormatting && displayColumnMeasure.numberFormatting.showMeasureLabel) {
                const numberFormatting = this.numberFormatting(
                    displayColumnMeasure.modifiedValues || displayColumnMeasure.value,
                    displayColumnMeasure.numberFormatting || settings.numberFormatting,
                    settings.numberFormatting,
                    autoScalingFactor
                );
                colValue = numberFormatting['formattedOutput'];
                color = numberFormatting['color'];
            } else {
                if (displayColumnMeasure.format) {
                    const iValueFormatter = valueFormatter.create({
                        format: displayColumnMeasure.format,
                    });
                    colValue = iValueFormatter.format(displayColumnMeasure.value);
                } else {
                    if (typeof displayColumnMeasure.value == 'number') {
                        if (String(displayColumnMeasure.value).indexOf('e') == -1) {
                            colValue = displayColumnMeasure.value.toFixed(2);
                        } else {
                            colValue = displayColumnMeasure.value.toExponential(2).toUpperCase();
                        }
                    } else {
                        colValue = displayColumnMeasure.value;
                    }
                }
            }
            if (displayColumnMeasure.cfColor) {
                color = displayColumnMeasure.cfColor;
            } else if (highContrast.isHighContrast) {
                color = highContrast.foreground;
            }
            if (color) {
                label.fontColor(color);
            }
        }
        label.format(colValue);
    }

    private static labelsOverriderGanttResourceDisplayMeasure(
        label: any,
        dataItem: any,
        currentMeasureIndex: number,
        column: any,
        settings: VisualSettings,
        instance: GanttChart,
        highContrast: HighContrastColors,
        autoScalingFactor: string
    ) {
        const periods = dataItem['get']('periods');
        const values = [],
            joiningString = ',',
            colors = [];
        let isHtmlRequired = false;
        if (periods) {
            periods.forEach((period) => {
                if (period.displayColumnsMeasure) {
                    const point = period.displayColumnsMeasure[currentMeasureIndex];
                    let value, color;
                    if (point.numberFormatting && point.numberFormatting.showMeasureLabel) {
                        isHtmlRequired = true;
                        const numberFormatting = this.numberFormatting(
                            point.modifiedValues || point.value,
                            point.numberFormatting || settings.numberFormatting,
                            settings.numberFormatting,
                            autoScalingFactor
                        );
                        value = numberFormatting['formattedOutput'];
                        color = numberFormatting['color'];
                    } else {
                        if (point.format) {
                            const iValueFormatter = valueFormatter.create({
                                format: point.format,
                            });
                            value = iValueFormatter.format(point.value);
                        } else {
                            if (typeof point.value == 'number') {
                                if (String(point.value).indexOf('e') == -1) {
                                    value = point.value.toFixed(2);
                                } else {
                                    value = point.value.toExponential(2).toUpperCase();
                                }
                            } else {
                                value = point.value;
                            }
                        }
                    }
                    if (point.cfColor) {
                        isHtmlRequired = true;
                        color = point.cfColor;
                    } else if (highContrast.isHighContrast) {
                        isHtmlRequired = true;
                        color = highContrast.foreground;
                    }
                    if (color) colors.push(color);
                    values.push(value);
                }
            });
        }
        if (isHtmlRequired) {
            const maxColor = this.maxOccurence(colors);
            maxColor ? label.fontColor(maxColor) : '';
        }
        label.format(values.join(joiningString));
    }

    private static labelsOverriderGanttDisplayColumn(label: any, dataItem: any, columnID: string) {
        const displayColumns = dataItem['get']('displayColumns');
        let colValue, format, color;
        const displayColumn = displayColumns && displayColumns.find((displayColumn) => displayColumn.id == columnID);
        if (displayColumn) {
            colValue = displayColumn.value;
            format = displayColumn.format;
            if (format) {
                const iValueFormatter = valueFormatter.create({
                    format: format,
                });
                colValue = iValueFormatter.format(colValue);
            }
            if (displayColumn.cfColor) color = displayColumn.cfColor;
        }
        if (color) {
            label.fontColor(color);
        }
        label.format(colValue);
    }

    private static labelsOverriderGanttResourceDisplayColumn(
        label: any,
        dataItem: any,
        currentMeasureIndex: number,
        column: any,
        settings: VisualSettings,
        instance: any,
    ) {
        const periods = dataItem['get']('periods');
        const value = [],
            colors = [];
        if (periods) {
            periods.forEach((period) => {
                if (period.displayColumns) {
                    const displayColumn = period.displayColumns[currentMeasureIndex];
                    if (!displayColumn) value.push('');
                    let colValue = displayColumn.value;
                    const format: any = displayColumn.format;
                    const color = displayColumn.cfColor;
                    if (format) {
                        const iValueFormatter = valueFormatter.create({
                            format: format,
                        });
                        colValue = iValueFormatter.format(colValue);
                    }
                    if (color) {
                        colors.push(color);
                    }
                    value.push(colValue);
                }
            });
        }
        const maxColor = instance.maxOccurence(colors);
        if (maxColor) label.fontColor(maxColor);
        label.format(value.join(','));
        value.join(',');
    }

    private static maxOccurence(colors: any[]) {
        const obj = {};
        let maxCount = 0,
            maxColor;
        colors.forEach((color) => {
            if (color) {
                obj[color] = obj[color] + 1;
                maxColor ? '' : (maxColor = color);
                if (obj[color] > maxCount) {
                    maxCount = obj[color];
                    maxColor = color;
                }
            }
        });
        return maxColor;
    }

    private static getDurationShortForm(unit: string) {
        const durationMapping = {
            year: 'Y',
            months: 'M',
            days: 'D',
            hours: 'H',
            minutes: 'm',
            seconds: 's',
        };
        return durationMapping[unit];
    }

    private static labelOverriderActualDuration(
        label: any,
        dataItem: any,
        settings: VisualSettings,
        highContrast: HighContrastColors,
    ) {
        const actualEnd = dataItem['get']('actualEnd');
        const actualStart = dataItem['get']('actualStart');
        const duration = this.calculateDateDiff(actualStart, actualEnd, settings);
        label.format(`${duration} ${settings.displayColumn.actualDurationSuffix}`);
        const cfColor = dataItem['get']('othersCfColor')['actualDurationInternal'];
        if (cfColor) {
            label.fontColor(cfColor);
        } else if (highContrast.isHighContrast) {
            label.fontColor(highContrast.foreground);
        }
    }

    private static calculateDateDiff(start: number, end: number, settings: VisualSettings) {
        if (start == null || end == null) return '';
        const endMoment = moment(end);
        const startMoment = moment(start);
        const diff = endMoment.diff(startMoment, <any>settings.displayColumn.actualDurationUnit, true);
        return diff.toFixed(settings.displayColumn.actualDurationDecimalPlaces);
    }

    private static labelOverriderPlannedDuration(
        label: any,
        dataItem: any,
        settings: VisualSettings,
        highContrast: HighContrastColors,
    ) {
        const baselineStart = dataItem['get']('baselineStart');
        const baselineEnd = dataItem['get']('baselineEnd');
        const duration = this.calculateDateDiff(baselineStart, baselineEnd, settings);
        label.format(`${duration} ${settings.displayColumn.actualDurationSuffix}`);
        const cfColor = dataItem['get']('othersCfColor')['plannedDurationInternal'];
        if (cfColor) {
            label.fontColor(cfColor);
        } else if (highContrast.isHighContrast) {
            label.fontColor(highContrast.foreground);
        }
    }

    private static displayColumnDuration(
        chart: any,
        JSONArray: JSONArrayDef,
        settings: VisualSettings,
        highContrast: HighContrastColors,
    ) {
        if (settings.chartOptions.ganttChartType != 'gantt') return;
        const isPlannedPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0;
        if (
            isPlannedPresent
                ? ['actual', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1
                : settings.displayColumn.enableActualDuration
        ) {
            const column = chart.dataGrid().column(displayColumnSize);
            column.title(settings.displayColumn.actualDurationTitle).width(settings.displayColumn.actualDurationWidth);
            column.labelsOverrider((label, dataItem) => {
                this.labelOverriderActualDuration(label, dataItem, settings, highContrast);
            });
            displayColumnSize++;
        }
        if (isPlannedPresent && ['planned', 'both'].indexOf(settings.displayColumn.taskDurationType) > -1) {
            const column = chart.dataGrid().column(displayColumnSize);
            column
                .title(settings.displayColumn.plannedDurationTitle)
                .width(settings.displayColumn.plannedDurationWidth);
            column.labelsOverrider((label, dataItem) => {
                this.labelOverriderPlannedDuration(label, dataItem, settings, highContrast);
            });
            displayColumnSize++;
        }
    }

    private static taskNameCfApplierGantt(
        column: any,
        settings: VisualSettings,
        JSONArray: JSONArrayDef,
        highContrast: HighContrastColors,
    ) {
        column.labelsOverrider((label, dataItem) => {
            const columnColor = dataItem['get']('taskNameCfColor');
            if (JSONArray.taskName.length > 1) {
                if (!dataItem.getParent()) {
                    label
                        .fontColor(
                            highContrast.isHighContrast
                                ? highContrast.foreground
                                : settings.dataGrid.parentNodeFontColor,
                        )
                        .fontSize(settings.dataGrid.parentNodeFontSize)
                        .fontStyle(settings.dataGrid.parentNodeFontStyle)
                        .fontDecoration(settings.dataGrid.parentNodeFontStyle)
                        .fontFamily(settings.chartOptions.fontfamily);
                    if (settings.dataGrid.parentNodeFontStyle == 'bold') label.fontWeight(600);
                } else if (!dataItem['get']('isChildren') && !dataItem['get']('isMilestone') && dataItem.getParent()) {
                    label
                        .fontColor(
                            highContrast.isHighContrast ? highContrast.foreground : settings.dataGrid.rootNodeFontColor,
                        )
                        .fontSize(settings.dataGrid.rootNodeFontSizeGantt)
                        .fontStyle(settings.dataGrid.rootNodeFontStyle)
                        .fontDecoration(settings.dataGrid.rootNodeFontStyle)
                        .fontFamily(settings.chartOptions.fontfamily);
                    if (settings.dataGrid.rootNodeFontStyle == 'bold') label.fontWeight(600);
                }
            }
            if (columnColor) {
                label.fontColor(columnColor);
            }
        });
    }

    private static labelOverriderFirstColumnGanttResource(column: any) {
        column.labelsOverrider((label, dataItem) => {
            const periods = dataItem['get']('periods'),
                colors = [];
            if (periods) {
                periods.forEach((period) => {
                    const idColor = period.othersCfColor['idInternal'];
                    if (idColor) colors.push(idColor);
                });
            }
            const maxColor = this.maxOccurence(colors);
            if (maxColor) label.fontColor(maxColor);
        });
    }

    private static taskNameCfApplierGanttResource(
        column: any,
        settings: VisualSettings,
        JSONArray: any,
        highContrast: HighContrastColors,
    ) {
        column.labelsOverrider((label, dataItem) => {
            const maxOccurence = (colors) => {
                const obj = {};
                let maxCount = 0,
                    maxColor;
                colors.forEach((color) => {
                    if (color) {
                        obj[color] = obj[color] + 1;
                        maxColor ? '' : (maxColor = color);
                        if (obj[color] > maxCount) {
                            maxCount = obj[color];
                            maxColor = color;
                        }
                    }
                });
                return maxColor;
            };
            const periods = dataItem['get']('periods');
            if (periods) {
                const color = maxOccurence(periods.map((period) => period.taskNameCfColor));
                if (!color) return;
                label.fontColor(color);
            } else {
                if (dataItem.meta('depth') == 0) {
                    label
                        .fontColor(
                            highContrast.isHighContrast
                                ? highContrast.foreground
                                : settings.dataGrid.parentNodeFontColor,
                        )
                        .fontSize(settings.dataGrid.parentNodeFontSize)
                        .fontStyle(settings.dataGrid.parentNodeFontStyle)
                        .fontDecoration(settings.dataGrid.parentNodeFontStyle)
                        .fontFamily(settings.chartOptions.fontfamily);
                    if (settings.dataGrid.parentNodeFontStyle == 'bold') label.fontWeight(600);
                    return;
                }
                label
                    .fontColor(
                        highContrast.isHighContrast ? highContrast.foreground : settings.dataGrid.rootNodeFontColor,
                    )
                    .fontSize(settings.dataGrid.rootNodeFontSizeGantt)
                    .fontStyle(settings.dataGrid.rootNodeFontStyle)
                    .fontDecoration(settings.dataGrid.rootNodeFontStyle)
                    .fontFamily(settings.chartOptions.fontfamily);
                if (settings.dataGrid.rootNodeFontStyle == 'bold') label.fontWeight(600);
                return;
            }
        });
    }

    private static ganttDisplayColumn(event: any) {
        const displayColumns = event.item['get']('displayColumns');
        let colValue,
            format,
            color,
            style = '',
            webUrlLink = '',
            webUrlHtml = '',
            displayIconOnly = false,
            webUrlIcon;
        const highContrast = this['highContrast'];
        const displayColumn =
            displayColumns && displayColumns.find((displayColumn) => displayColumn.id == this['columnID']);
        if (displayColumn) {
            colValue = displayColumn.value;
            color = displayColumn.defaultColor;
            format = displayColumn.format;
            if (format) {
                const iValueFormatter = valueFormatter.create({
                    format: format,
                });
                colValue = iValueFormatter.format(colValue);
            }

            if (displayColumn.linkedWebUrl) {
                webUrlLink = displayColumn.linkedWebUrl;
                if (displayColumn.isValiedWebUrl) {
                    style = 'text-decoration: underline;';
                    webUrlHtml = ` <span style="color: ${color}; ${style} display:none" >${
                        typeof webUrlLink == 'string' ? escape(webUrlLink) : webUrlLink
                    }</span>`;
                    webUrlIcon = displayColumn.webUrlIcon;
                    if (webUrlIcon) {
                        style = '';
                        displayIconOnly = true;
                        color = displayColumn.webUrlIconColor;
                    }
                }
            }

            if (highContrast.isHighContrast) {
                color = highContrast.foreground;
            }

            if (displayColumn.cfColor) color = displayColumn.cfColor;
        }

        if (colValue != undefined) {
            let colValueHtml;
            if (displayIconOnly) {
                colValueHtml = `<span style="font-family: FabricMDL2Icons;color: ${color}; ${style}">${webUrlIcon}</span>`;
            } else {
                colValueHtml = `<span style="color: ${color}; ${style}">${
                    typeof colValue == 'string' ? escape(colValue) : colValue
                }</span>`;
            }
            colValue = `
                ${colValueHtml}
                ${webUrlHtml}
               `;
        }
        return colValue;
    }

    private static ganttResourceDisplayColumn(event: any) {
        const periods = event.item['get']('periods');
        const value = [];
        let aggregateValue = '';
        if (periods) {
            periods.forEach((period) => {
                if (period.displayColumns) {
                    const displayColumn: any =
                        period.displayColumns[this['index']] && period.displayColumns[this['index']];
                    let colValue = displayColumn.value;
                    const format: any = displayColumn.format;
                    let color = displayColumn.defaultColor,
                        webUrlHtml = '',
                        style = '',
                        webUrlLink = '',
                        displayIconOnly = false,
                        webUrlIcon;
                    const highContrast = this['highContrast'];
                    const aggregationType = displayColumn?.displayColumn?.columnAggregationType;

                    if (displayColumn.linkedWebUrl) {
                        webUrlLink = displayColumn.linkedWebUrl;
                        if (displayColumn.isValiedWebUrl) {
                            style = 'text-decoration: underline;';
                            webUrlHtml = ` <span style="color: ${color}; ${style} display:none" >${
                                typeof webUrlLink == 'string' ? escape(webUrlLink) : webUrlLink
                            }</span>`;
                            webUrlIcon = displayColumn.webUrlIcon;
                            if (webUrlIcon) {
                                style = '';
                                displayIconOnly = true;
                                color = displayColumn.webUrlIconColor;
                            }
                        }
                    }

                    if (highContrast.isHighContrast) {
                        color = highContrast.foreground;
                    }

                    if (displayColumn.cfColor) color = displayColumn.cfColor;

                    if (format) {
                        const iValueFormatter = valueFormatter.create({
                            format: format,
                        });
                        colValue = iValueFormatter.format(colValue);
                    }

                    // Aggregation applied for Display Categories - Date type field for GanttResource
                    if (colValue !== undefined) {
                        const formattedValue = colValue ? Helper.GET_UTC_TIMESTAMP(moment(colValue)) : null;
                        const formattedAggValue = aggregateValue ? Helper.GET_UTC_TIMESTAMP(moment(aggregateValue)) : null;
                        switch (aggregationType) {
                            case 'max': {
                                if (formattedValue && (formattedValue > formattedAggValue)) {
                                    aggregateValue = colValue;
                                }
                                break;
                            }
                            case 'min': {
                                if ((!formattedAggValue && formattedValue) || (formattedValue && (formattedValue < formattedAggValue))) {
                                    aggregateValue = colValue;
                                }
                                break;
                            }
                            case 'current': {
                                if (!this['settings'].chartOptions.displayindividualtask) {
                                    const iValueFormatter = valueFormatter.create({
                                        format: format,
                                    });
                                    const todayDate = iValueFormatter.format(new Date());
                                    aggregateValue = todayDate;
                                } else {
                                    aggregateValue = colValue;
                                }
                                break;
                            }
                            case 'none':
                            default: {
                                let colValueHtml;
                                if (displayIconOnly) {
                                    colValueHtml = `<span style="font-family: FabricMDL2Icons;color: ${color}; ${style}">${webUrlIcon}</span>`;
                                } else {
                                    colValueHtml = `<span style="color: ${color}; ${style}">
                                        ${typeof colValue == 'string' ? escape(colValue) : colValue}</span>`;
                                }
                                colValue = `
                                ${colValueHtml}
                                ${webUrlHtml}
                                `;
                                value.push(colValue);
                            }
                        }
                    }
                }
            });
        }
        return value.length > 0 ? `${value.join(',')}` : aggregateValue;
    }

    private static ganttResourceDisplayMeasure(event: any) {
        const periods = event.item['get']('periods');
        const values = [];
        let isHtmlRequired = false,
            joiningString = ',';
        if (periods) {
            periods.forEach((period) => {
                if (period.displayColumnsMeasure) {
                    const point =
                        period.displayColumnsMeasure[this['index']] && period.displayColumnsMeasure[this['index']];
                    let value, color;
                    const settings = this['settings'],
                        helperInstance = this['helperInstance'],
                        highContrast = this['highContrast'],
                        ganttInstance = this['ganttInstance'];
                    if (point.numberFormatting && point.numberFormatting.showMeasureLabel) {
                        isHtmlRequired = true;
                        const numberFormatting = helperInstance.numberFormatting(
                            point.modifiedValues || point.value,
                            point.numberFormatting || settings.numberFormatting,
                            settings.numberFormatting,
                            ganttInstance,
                            point.scalingFactor
                        );
                        value = numberFormatting['formattedOutput'];
                        color = numberFormatting['color'];
                    } else {
                        if (point.format) {
                            const iValueFormatter = valueFormatter.create({
                                format: point.format,
                            });
                            value = iValueFormatter.format(point.value);
                        } else {
                            if (typeof point.value == 'number') {
                                if (String(point.value).indexOf('e') == -1) {
                                    value = point.value.toFixed(2);
                                } else {
                                    value = point.value.toExponential(2).toUpperCase();
                                }
                            } else {
                                value = point.value;
                            }
                        }
                    }

                    if (point.cfColor) {
                        isHtmlRequired = true;
                        color = point.cfColor;
                    } else if (highContrast.isHighContrast) {
                        isHtmlRequired = true;
                        color = highContrast.foreground;
                    }
                    value = typeof value == 'string' ? escape(value) : value;
                    if (isHtmlRequired) {
                        const html = `<span style="color: ${color};">${value}</span>`;
                        values.push(html);
                        joiningString = ' ';
                    } else {
                        values.push(value);
                    }
                }
            });
        }
        if (this['isAggregation'] && values.length > 1) {
            return values.reduce((acc, curr) => acc + parseInt(curr), 0);
        }
        return values.join(joiningString);
    }

    private static ganttDisplayMeasure(event: any) {
        const displayColumnsMeasures = event.item['get']('displayColumnsMeasure');
        let colValue = '',
            color;
        const settings = this['settings'],
            helperInstance = this['helperInstance'],
            highContrast = this['highContrast'],
            ganttInstance = this['ganttInstance'];
        if (displayColumnsMeasures && displayColumnsMeasures[this['index']]) {
            const displayColumnMeasure = displayColumnsMeasures[this['index']];
            if (displayColumnMeasure.numberFormatting && displayColumnMeasure.numberFormatting.showMeasureLabel) {
                const numberFormatting = helperInstance.numberFormatting(
                    displayColumnMeasure.modifiedValues || displayColumnMeasure.value,
                    displayColumnMeasure.numberFormatting || settings.numberFormatting,
                    settings.numberFormatting,
                    ganttInstance,
                    displayColumnMeasure.scalingFactor
                );
                colValue = numberFormatting['formattedOutput'];
                color = numberFormatting['color'];
            } else {
                if (displayColumnMeasure.format) {
                    const iValueFormatter = valueFormatter.create({
                        format: displayColumnMeasure.format,
                    });
                    colValue = iValueFormatter.format(displayColumnMeasure.value);
                } else {
                    if (typeof displayColumnMeasure.value == 'number') {
                        if (String(displayColumnMeasure.value).indexOf('e') == -1) {
                            colValue = displayColumnMeasure.value.toFixed(2);
                        } else {
                            colValue = displayColumnMeasure.value.toExponential(2).toUpperCase();
                        }
                    } else {
                        colValue = displayColumnMeasure.value;
                    }
                }
            }
            if (displayColumnMeasure.cfColor) {
                color = displayColumnMeasure.cfColor;
            } else if (highContrast.isHighContrast) {
                color = highContrast.foreground;
            }
            colValue = typeof colValue == 'string' ? escape(colValue) : colValue;
            if (color) {
                colValue = `<span style="color: ${color};">${colValue}</span>`;
            }
        }
        return colValue;
    }

    private static processDisplayMeasure(
        chart: any,
        settings: VisualSettings,
        data: Data,
        JSONArray: any,
        highContrast: HighContrastColors,
        instance: GanttChart,
    ) {
        //display column
        const displayColumnStartIndex = dataGridColumnSize,
            ganttResourceColorArray = [],
            displayMeasures = JSONArray.displayMeasures.filter((displayMeasure) => {
                const displayMeasureSettings = displayMeasure.settings.displayMeasure;
                if (
                    (displayMeasureSettings && displayMeasureSettings.columnEnable) ||
                    displayMeasureSettings == undefined ||
                    displayMeasureSettings.columnEnable == undefined
                ) {
                    ganttResourceColorArray.push(displayMeasure.columnColor);
                    return true;
                }
            });
        displayMeasureSize = displayMeasures.length;
        dataGridColumnSize = dataGridColumnSize + displayMeasureSize;
        for (
            let columnNumber = displayColumnStartIndex + 2, currentMeasureIndex = 0;
            columnNumber < dataGridColumnSize + 2;
            columnNumber++, currentMeasureIndex++
        ) {
            const column = chart.dataGrid().column(displayColumnSize);
            displayColumnSize++;
            const displayMeasure = displayMeasures[currentMeasureIndex];
            const displayMeasureSettings = displayMeasure.settings.displayMeasure;
            const isAggregation = displayMeasureSettings?.aggregateValue;
            let displayName = (displayMeasureSettings && displayMeasureSettings.columnTitle) || displayMeasure.label;
            if (displayName == '_blank') displayName = '';
            const width = (displayMeasureSettings && displayMeasureSettings.columnWidth) || 100;
            column.labels().useHtml(true);
            column.title(displayName).width(width);
            if (settings.chartOptions.ganttChartType == 'gantt') {
                if (instance._isMSBrowser) {
                    column.labelsOverrider((label, dataItem) => {
                        this.labelsOverriderGanttDisplayMeasure(
                            label,
                            dataItem,
                            currentMeasureIndex,
                            column,
                            settings,
                            instance,
                            highContrast,
                            displayMeasure.scalingFactor
                        );
                    });
                } else {
                    column
                        .labels()
                        .format(
                            this.ganttDisplayMeasure.bind({
                                index: currentMeasureIndex,
                                column,
                                settings,
                                ganttInstance: instance,
                                helperInstance: this,
                                highContrast,
                            }),
                        );
                }
            } else {
                if (instance._isMSBrowser) {
                    column.labelsOverrider((label, dataItem) => {
                        this.labelsOverriderGanttResourceDisplayMeasure(
                            label,
                            dataItem,
                            currentMeasureIndex,
                            column,
                            settings,
                            instance,
                            highContrast,
                            displayMeasure.scalingFactor
                        );
                    });
                } else {
                    column
                        .labels()
                        .format(
                            this.ganttResourceDisplayMeasure.bind({
                                index: currentMeasureIndex,
                                column,
                                settings,
                                ganttInstance: instance,
                                helperInstance: this,
                                highContrast,
                                isAggregation,
                            }),
                        );
                }
            }
        }
    }

    private static processStatusFlag(
        chart: any,
        settings: VisualSettings,
        data: Data,
        highContrast: HighContrastColors,
        instance: GanttChart,
    ) {
        data.categorical.objects.measures.forEach((measure) => {
            const statusFlagObject = measure.settings && measure.settings.statusFlag;
            const currentMeasure = data.categorical.measures.find((catMeasure) => {
                return catMeasure.name == measure.name;
            });
            const isCfApplied = currentMeasure && instance.cfAppliedMeasures[currentMeasure.name];
            const isPresentInCurrentMeasure =
                currentMeasure &&
                currentMeasure.role &&
                (currentMeasure.role.displayMeasures ||
                    currentMeasure.role.progressValue ||
                    currentMeasure.role.duration ||
                    currentMeasure.role.progressBase);
            const showStatusFlag = currentMeasure && instance.statusFlagPresentMeasures[currentMeasure.name];
            if (isPresentInCurrentMeasure && isCfApplied && showStatusFlag) {
                let displayName = statusFlagObject && statusFlagObject.sFTitle,
                    width = 50;
                const categoricalMeasure = data.categorical.measures.find((categoricalMeasure) => {
                    return measure.name == categoricalMeasure.name;
                });
                if (!displayName || displayName == '') {
                    displayName = categoricalMeasure && categoricalMeasure.label;
                }
                if (statusFlagObject && statusFlagObject.sFWidth) width = statusFlagObject.sFWidth;
                const column = chart.dataGrid().column(displayColumnSize);
                displayColumnSize++;
                if (displayName == '_blank') displayName = '';
                column.title(displayName).width(width);
                if (settings.chartOptions.ganttChartType == 'gantt') {
                    if (instance._isMSBrowser) {
                        column.labelsOverrider((label, dataItem) => {
                            this.labelsOverriderGanttStatusFlag(label, dataItem, measure.name, settings);
                        });
                    } else {
                        column.labels().format(this.customColumnFormat.bind({ measureID: measure.name }));
                    }
                } else {
                    if (instance._isMSBrowser) {
                        column.labelsOverrider((label, dataItem) => {
                            this.labelsOverriderGanttResourceStatusFlag(label, dataItem, measure.name, settings);
                        });
                    } else {
                        column.labels().format(this.ganttResourceStatusFlag.bind({ measureID: measure.name }));
                    }
                }
                column.labels().useHtml(true);
                dataGridColumnSize++;
            }
        });
    }

    private static customColumnFormat(event: any) {
        if (event.item['get']('displayMeasure')) {
            const displayMeasureObj = event.item['get']('displayMeasure').find((displayMeasure) => {
                return displayMeasure.id == this['measureID'];
            });
            if (!displayMeasureObj) return;
            const color = displayMeasureObj.color,
                icon = displayMeasureObj.icon;
            if (color) {
                return `<span style="font-family: FabricMDL2Icons; color: ${color};">${icon}</span>`;
            }
        }
    }

    private static ganttResourceStatusFlag(event: any) {
        const periods = event.item['get']('periods');
        const colors = [],
            icons = [];
        if (periods) {
            periods.forEach((period) => {
                if (period.displayMeasure) {
                    const periodDisplayMeasure = period.displayMeasure.find(
                        (measure) => measure.id == this['measureID'],
                    );
                    let color, icon;
                    if (periodDisplayMeasure) {
                        (color = periodDisplayMeasure.color), (icon = periodDisplayMeasure.icon);
                    }
                    colors.push(color);
                    icons.push(icon);
                }
            });
        }
        const spanHTML = [];
        const isFlagPresent = colors.every((color) => !color);
        colors.forEach((color, index) => {
            if (color) {
                const spanTemplate = `<span style="font-family: FabricMDL2Icons; color: ${color};">${icons[index]}</span>`;
                spanHTML.push(spanTemplate);
            } else if (!isFlagPresent) {
                const spanTemplate = `<span style="font-family: FabricMDL2Icons;">\uF39B</span>`;
                spanHTML.push(spanTemplate);
            }
        });
        return spanHTML.join(' ');
    }

    private static chartOptions(chart: any, settings: VisualSettings, JSONArray: any) {
        const { splitterposition, autoSplitPosition } = settings.dataGrid;
        const isPlannedTaskPresent = JSONArray.plannedStartDate.length > 0 && JSONArray.plannedEndDate.length > 0;
        const {
            headerHeight,
            ganttRowHeight,
            fiscalYearStartMonth,
            ganttChartType,
            showPlannedTaskInParent,
            chartBackgroundColor,
            plannedBarHeight,
            actualBarHeight,
            equalBarHeight
        } = settings.chartOptions;
        const timeline = chart.getTimeline();
        const splitterPosition = autoSplitPosition ? this.autoSplitPositionCalculation(chart, settings) : splitterposition;
        chart.splitterPosition(splitterPosition);
        chart.headerHeight(headerHeight);
        chart.defaultRowHeight(ganttRowHeight);
        chart.getTimeline().scale().fiscalYearStartMonth(Number(fiscalYearStartMonth));
        if (ganttChartType === 'gantt') {
            timeline.baselines().height(plannedBarHeight + '%');
            timeline.tasks().height(actualBarHeight + '%');
            if (equalBarHeight) {
                if (showPlannedTaskInParent || isPlannedTaskPresent) {
                    timeline.groupingTasks().height(actualBarHeight + '%');
                } else {
                    timeline.groupingTasks().height((actualBarHeight * 2) + '%');
                    timeline.groupingTasks().anchor('center');
                }
            } else {
                timeline.groupingTasks().height(actualBarHeight + '%');
            }
        } else {
            chart.getTimeline().periods().height(actualBarHeight + '%');
        }
        //set background color
        chart.background().fill(chartBackgroundColor);
    }

    private static dataGrid(chart: any, settings: VisualSettings) {
        const dataGrid = chart.dataGrid();
        dataGrid.headerFill(settings.dataGrid.headerBackgroungColor);
        for (let column = 0; column < displayColumnSize; column++) {
            this.applyDataGridSetting(chart, settings, column);
        }
        //this.buttonStyle(chart, settings)
    }

    private static buttonStyle(chart: any) {
        const buttons = chart.dataGrid().buttons();
        buttons.fontWeight(600);
        buttons.fontSize(15);
        buttons.fontFamily('FabricMDL2Icons');
        buttons.background().fill(null);
        buttons.background().stroke(null);
        buttons.width(25);
        buttons.cursor('default');
        buttons.normal().content('\uF164');
        buttons.selected().content('\uF166');
    }

    private static autoSplitPositionCalculation(chart: any, settings: VisualSettings) {
        let totalLength = 0;
        for (let columnIndex = 0; columnIndex < displayColumnSize; columnIndex++) {
            const column = chart.dataGrid().column(columnIndex);
            if (column.enabled()) totalLength = totalLength + column.width() + settings.dataGrid.gridWidth;
        }
        return totalLength;
    }

    private static applyDataGridSetting(chart: any, settings: VisualSettings, colIndex: number) {
        const column = chart.dataGrid().column(colIndex);
        //datagrid header
        const columnTitle = column.title();
        columnTitle.fontColor(settings.dataGrid.headerFontColor);
        columnTitle.fontSize(settings.dataGrid.headerFontSize);
        columnTitle.fontFamily(settings.chartOptions.fontfamily);
        //datagrid labels
        const columnLabel = column.labels();
        columnLabel.fontColor(settings.dataGrid.datagridFontColor);
        columnLabel.fontSize(settings.dataGrid.datagridFontSize);
        columnLabel.fontFamily(settings.chartOptions.fontfamily);
        columnLabel.fontStyle(settings.dataGrid.datagridFontStyle);
        columnLabel.fontDecoration(settings.dataGrid.datagridFontStyle);
        if (settings.dataGrid.datagridFontStyle === 'bold') columnLabel.fontWeight(600);
    }

    public static TIMELINE(
        chart: any,
        settings: VisualSettings,
        instance: GanttChart,
        highContrast: HighContrastColors,
        JSONArray: JSONArrayDef,
        data: Data
    ) {
        const timelineheader = chart.getTimeline().header(),
            lowLevel = timelineheader.level(0),
            midLevel = timelineheader.level(1),
            topLevel = timelineheader.level(2);
        topLevel.enabled(settings.timeline.gantttoplevel);
        midLevel.enabled(settings.timeline.ganttmidlevel);
        lowLevel.enabled(settings.timeline.ganttlowlevel);
        this.zoomSettings(chart, settings, instance, JSONArray, data, highContrast);
        this.commonHeaderSettings(chart, settings, timelineheader);
        if (settings.timeline.ganttHeaderFormat === 'normal') {
            this.formatLevelHeaders(chart, settings);
        }
        if (settings.timeline.ganttlowlevel) this.setTimelineHeaderStyle(settings, lowLevel, 0);
        if (settings.timeline.ganttmidlevel) this.setTimelineHeaderStyle(settings, midLevel, 1);
        if (settings.timeline.gantttoplevel) this.setTimelineHeaderStyle(settings, topLevel, 2);
        Helper.setScrollBarColor(chart, settings, highContrast);
        const markerIndexs = this.markers(chart, settings, highContrast, instance);
        this.dynamicMarkers(chart, settings, highContrast, instance, JSONArray, markerIndexs);
    }

    private static setScrollBarColor(chart: any, settings: VisualSettings, highContrast: HighContrastColors) {
        const scrollBarColor = highContrast.isHighContrast ? highContrast.foreground : settings.timeline.scrollBarColor;
        chart.getTimeline().horizontalScrollBar().sliderFill(scrollBarColor);
        chart.getTimeline().horizontalScrollBar().backgroundFill(scrollBarColor);
        chart.getTimeline().verticalScrollBar().sliderFill(scrollBarColor);
        chart.getTimeline().verticalScrollBar().backgroundFill(scrollBarColor);
        chart.dataGrid().horizontalScrollBar().sliderFill(scrollBarColor);
        chart.dataGrid().horizontalScrollBar().backgroundFill(scrollBarColor);
    }

    private static drawDynamicMarkers(
        chart: any,
        markerIndexes: {
            lineIndex: number;
            textIndex: number;
            rangeIndex: number;
        },
        markerDetails: {
            startDate: string;
            endDate: string;
            text: string;
        },
        settings: VisualSettings,
        highContrast: HighContrastColors
    ) {
        const {
            lineColor,
            lineStroke,
            lineType,
            enableLineType,
            enableTextType,
            textXPosition,
            textYPosition,
            textRotation,
            textColor,
            textBackgroundColorShow,
            textBackgroundColor,
            textWeight,
            rangeColor,
            rangePattern,
            textType,
        } = settings.reference;

        const endDate = markerDetails.endDate ? Helper.GET_UTC_TIMESTAMP(moment(markerDetails.endDate)) : null;
        const startDate = Helper.GET_UTC_TIMESTAMP(moment(markerDetails.startDate));
        if (startDate) {
            if (enableLineType) {
                this.createLineMarker(chart.getTimeline().lineMarker(markerIndexes.lineIndex), {
                    type: lineType,
                    color: highContrast.isHighContrast ? highContrast.foreground : lineColor,
                    date: startDate,
                    stroke: lineStroke,
                });
                markerIndexes.lineIndex++;
            }
            if (enableTextType) {
                const label = markerDetails.text ? markerDetails.text : `Reference ${markerIndexes.textIndex}`;
                this.createTextMarker(chart.getTimeline().textMarker(markerIndexes.textIndex), {
                    text: label,
                    color: highContrast.isHighContrast ? highContrast.foreground : textColor,
                    date: endDate && textType === 'marker' ? (startDate + endDate) / 2 : startDate,
                    hAlign: textXPosition,
                    vAlign: textYPosition,
                    rotation: textRotation,
                    backgroundColor: highContrast.isHighContrast ? highContrast.background : textBackgroundColor,
                    enableBackgroundColor: textBackgroundColorShow,
                    fontWeight: textWeight,
                });
                markerIndexes.textIndex++;
            }
            if (endDate) {
                this.createRangeMarker(chart.getTimeline().rangeMarker(markerIndexes.rangeIndex), {
                    dateFrom: startDate,
                    dateTo: endDate,
                    color: highContrast.isHighContrast ? highContrast.foreground : rangeColor,
                    patternType: rangePattern,
                });
                markerIndexes.rangeIndex++;
            }
        }
    }

    private static parseDate(date: string) {
        try {
            return JSON.parse(date);
        } catch {
            return [date];
        }
    }

    private static dynamicMarkers(
        chart: any,
        settings: VisualSettings,
        highContrast: HighContrastColors,
        instance: GanttChart,
        JSONArray: JSONArrayDef,
        markerIndexes: {
            lineIndex: number;
            textIndex: number;
            rangeIndex: number;
        },
    ) {
        const {
            referenceStartDate: [referenceStartDate],
            referenceEndDate: [referenceEndDate],
            referenceText: [referenceText],
        } = JSONArray;

        referenceStartDate &&
            referenceStartDate.values.forEach((date: string, index: number) => {
                const startDates = Helper.parseDate(date);
                const endDates = Helper.parseDate(referenceEndDate && referenceEndDate.values[index]);
                const textDates = Helper.parseDate(referenceText && referenceText.values[index]);
                try {
                    startDates &&
                        startDates.forEach((startDate, parsedIndex) => {
                            Helper.drawDynamicMarkers(
                                chart,
                                markerIndexes,
                                {
                                    startDate: startDate,
                                    endDate: endDates[parsedIndex],
                                    text: textDates[parsedIndex],
                                },
                                settings,
                                highContrast
                            );
                        });
                } catch (err) {
                    // console.log(err);
                }
            });
    }

    private static commonHeaderSettings(chart: any, settings: VisualSettings, header: any) {
        header.format(function () {
            let value = this.value;
            let endValue = this.endValue;
            if (
                this.unit === 'year' &&
                Number(settings.chartOptions.fiscalYearStartMonth) !== 1 &&
                settings.chartOptions.fiscalYearType === 'fiscal'
            ) {
                value = Number(value) + 1;
                endValue = Number(endValue) + 1;
            }
            if (settings.timeline.ganttHeaderFormat == 'days') {
                const duration = (this.end - this.tickValue) / 1000 / 3600 / 24;
                value = this.value + ': ' + duration + ' days';
            } else if (settings.timeline.ganttHeaderFormat == 'combined') {
                value = `${value}-${endValue}`;
            }
            return value;
        });
        const scale = chart.xScale();
        scale.minimumGap(settings.timeline.timelinePaddingStart / 100);
        scale.maximumGap(settings.timeline.timelinePaddingEnd / 100);
    }

    private static formatLevelHeaders(chart: any, settings: VisualSettings) {

        const timelineheader = chart.getTimeline().header(),
            lowLevelHeader = timelineheader.level(0),
            midLevelHeader = timelineheader.level(1),
            topLevelHeader = timelineheader.level(2);

        const { zoomLevels, isEnabled } = JSON.parse(settings.editor.zoomLevels);

        if (!isEnabled) return;

        let topLevelHeaderFormat: string, midLevelHeaderFormat: string, lowLevelHeaderFormat: string;

        if (!isZoomApplied) {
            [topLevelHeaderFormat, midLevelHeaderFormat, lowLevelHeaderFormat] = zoomLevels.map(level => [
                level.granularity1Format,
                level.granularity2Format,
                level.granularity3Format
            ])[0];
        }

        const formatHeader = (header: any, format: string) => {
            header.format(function () {
                let updatedFormat = format;
                if (isZoomApplied) {
                    const currentZoomLevel = Helper.getCurrentZoomLevels(this.scale, settings);
                    if (header.Ad === 2) {
                        updatedFormat = currentZoomLevel.granularity1Format;
                    } else if (header.Ad === 1) {
                        updatedFormat = currentZoomLevel.granularity2Format;
                    } else if (header.Ad === 0) {
                        updatedFormat = currentZoomLevel.granularity3Format;
                    }
                }
                return Helper.formatTimelineLevelHeaders(this, updatedFormat);
            });
        };

        formatHeader(topLevelHeader, topLevelHeaderFormat);
        formatHeader(midLevelHeader, midLevelHeaderFormat);
        formatHeader(lowLevelHeader, lowLevelHeaderFormat);

    }

    private static formatTimelineLevelHeaders(instance: any, format: string) {
        const { tickValue, value } = instance;
        const validTokens = ['YYYY', 'YY', 'MMMM', 'MMM', 'MM', 'M', 'Q', 'w', 'ww', 'D', 'DD', 'ddd', 'dddd', 'h', 'hh', 'H', 'HH', 'mm', 'm', 's', 'ss'];
        let formattedValue = ''

        if (format) {
            const formatTokens = format.split(/(".*?"|[^"]+)/).filter(Boolean);
            formatTokens.forEach((token) => {
                if (token.startsWith('"') && token.endsWith('"')) {
                    formattedValue += token.slice(1, -1); // Add the text inside quotes
                } else if (validTokens.includes(token)) {
                    const momentObj = moment(tickValue);
                    formattedValue += momentObj.format(token);
                } else {
                    formattedValue += token; // Add any other text
                }
            });
        } else {
            formattedValue = value;
        }

        return formattedValue;
    }

    private static getTodayTime(sign, hour, minutes) {
        const signValue = sign == '+' ? 1 : -1;
        return (
            this.GET_UTC_TIMESTAMP(moment.utc()) +
            parseInt(hour || 0) * 3600000 * signValue +
            parseInt(minutes || 0) * 60000 * signValue
        );
    }

    private static createLineMarker(lineMarkerInstance, markerOptions) {
        lineMarkerInstance.value(markerOptions.date);
        lineMarkerInstance.stroke(this.strokeLineType(markerOptions.type, markerOptions.color, markerOptions.stroke));
    }

    private static createTextMarker(textMarkerInstance, markerOptions) {
        textMarkerInstance.value(markerOptions.date);
        textMarkerInstance.text(markerOptions.text);
        textMarkerInstance.fontColor(markerOptions.color);
        textMarkerInstance.fontWeight(markerOptions.fontWeight);
        textMarkerInstance.offsetX(markerOptions.hAlign);
        textMarkerInstance.offsetY(markerOptions.vAlign + '%');
        textMarkerInstance.rotation(markerOptions.rotation);
        textMarkerInstance.background().enabled(markerOptions.enableBackgroundColor);
        textMarkerInstance.background().fill(markerOptions.backgroundColor);
        textMarkerInstance.background().stroke(`0 ${markerOptions.backgroundColor}`);
    }

    private static createRangeMarker(rangeMarkerInstance, markerOptions) {
        rangeMarkerInstance.from(markerOptions.dateFrom);
        rangeMarkerInstance.to(markerOptions.dateTo);
        const pattern = markerOptions.patternType;
        if (pattern == undefined || pattern == 'none') rangeMarkerInstance.fill(`${markerOptions.color} 0.4`);
        else if (['backward-diagonal', 'forward-diagonal', 'horizontal', 'vertical'].indexOf(pattern) != -1)
            rangeMarkerInstance.fill(anychartCustomBuildMinJs.graphics.hatchFill(pattern, markerOptions.color, 2, 5));
        else rangeMarkerInstance.fill(anychartCustomBuildMinJs.graphics.hatchFill(pattern, markerOptions.color));
    }

    private static markers(
        chart: any,
        settings: VisualSettings,
        highContrast: HighContrastColors,
        instance: GanttChart,
    ) {
        const markers = JSON.parse(settings.editor.markers);
        let lineIndex = 0,
            textIndex = 0,
            rangeIndex = 0;
        markers.forEach((marker: Reference, index) => {
            if (!marker.enabled || (!instance.isGanttEnterprise && index > 0)) return;
            const { label, dateType, date1Custom, date2Custom,  backgroundColor,
                enableBackgroundColor, enableMarkerText, textFontWeight, displayOptions, lineType,
                lineStroke, hAlign, vAlign, rotation, patternType,
                textColor, bgRangeTextEnabled, rangeMarkerTextColor, rangeColor,
                utcSign,utcHour, utcMin } = marker;
            let { date1Type, date2Type, color } = marker;
            color = highContrast.isHighContrast ? highContrast.foreground : color;
            if (dateType == 'range') {
                date1Type = <any>(date1Type == 'custom' ? this.GET_UTC_TIMESTAMP(moment(date1Custom)) : date1Type);
                date2Type = <any>(date2Type == 'custom' ? this.GET_UTC_TIMESTAMP(moment(date2Custom)) : date2Type);
                date1Type = <any>(date1Type == 'current' ? this.getTodayTime(utcSign, utcHour, utcMin) : date1Type);
                date2Type = <any>(date2Type == 'current' ? this.getTodayTime(utcSign, utcHour, utcMin) : date2Type);

                this.createRangeMarker(chart.getTimeline().rangeMarker(rangeIndex), {
                    dateFrom: date1Type,
                    dateTo: date2Type,
                    color: highContrast.isHighContrast ? highContrast.foreground : rangeColor,
                    patternType,
                });
                if (enableMarkerText) {
                    if (date1Type == 'start' || date2Type == 'end') {
                        const minMaxDate = instance.minMaxDate;
                        date1Type = date1Type == 'start' ? minMaxDate.min : date1Type;
                        date2Type = date2Type == 'end' ? minMaxDate.max : date2Type;
                    }

                    this.createTextMarker(chart.getTimeline().textMarker(textIndex), {
                        text: label,
                        color: highContrast.isHighContrast ? highContrast.foreground : rangeMarkerTextColor,
                        date: (<any>date1Type + <any>date2Type) / 2,
                        hAlign,
                        vAlign,
                        rotation,
                        backgroundColor: highContrast.isHighContrast ? highContrast.background : backgroundColor,
                        enableBackgroundColor: bgRangeTextEnabled,
                        fontWeight: textFontWeight,
                    });
                    textIndex++;
                }
                rangeIndex++;
            } else {
                let date = dateType == 'custom' ? this.GET_UTC_TIMESTAMP(moment(date1Custom)) : dateType;
                if (dateType == 'current') {
                    date = this.getTodayTime(utcSign, utcHour, utcMin);
                }
                if (displayOptions.line) {
                    this.createLineMarker(chart.getTimeline().lineMarker(lineIndex), {
                        type: lineType,
                        color,
                        date,
                        stroke: lineStroke,
                    });
                    lineIndex++;
                }
                if (displayOptions.text) {
                    this.createTextMarker(chart.getTimeline().textMarker(textIndex), {
                        text: label,
                        color: highContrast.isHighContrast ? highContrast.foreground : textColor,
                        date,
                        hAlign,
                        vAlign,
                        rotation,
                        backgroundColor: highContrast.isHighContrast ? highContrast.background : backgroundColor,
                        enableBackgroundColor,
                        fontWeight: textFontWeight,
                    });
                    textIndex++;
                }
            }
        });
        return {
            lineIndex,
            textIndex,
            rangeIndex,
        };
    }

    private static strokeLineType(lineType: string, lineColor: string, lineStroke: number) {
        lineStroke = lineStroke > 1 ? lineStroke : 1;
        if (lineType == 'dotted')
            return {
                color: lineColor,
                thickness: lineStroke,
                dash: '1 3',
                lineCap: 'round',
            };
        if (lineType == 'dashed')
            return {
                color: lineColor,
                thickness: lineStroke,
                dash: '6 4',
            };
        if (lineType == 'solid')
            return {
                color: lineColor,
                thickness: lineStroke,
                dash: '0 0',
            };
        if (lineType == 'dashedDotted')
            return {
                color: lineColor,
                thickness: lineStroke,
                dash: '1 3 6 4',
            };
    }

    private static setTimelineHeaderStyle(settings: VisualSettings, timelineheader: any, level: number) {
        let fontColor, fontSize, fillColor, borderWidth, borderColor, height;
        switch (level) {
            case 0:
                fontColor = settings.timeline.ganttLowLevelTextColor;
                fillColor = settings.timeline.ganttLowLevelFillColor;
                fontSize = settings.timeline.ganttLowLevelFontSize;
                //hAlign = settings.timeline.ganttLowLevelTextAlignment;
                borderWidth = settings.timeline.ganttLowLevelBorderWidth;
                borderColor = settings.timeline.ganttLowLevelBorderColor;
                break;
            case 1:
                fontColor = settings.timeline.ganttMidLevelTextColor;
                fillColor = settings.timeline.ganttMidLevelFillColor;
                fontSize = settings.timeline.ganttMidLevelTextSize;
                // hAlign = settings.timeline.ganttMidLevelTextAlignment;
                borderWidth = settings.timeline.ganttMidLevelBorderWidth;
                borderColor = settings.timeline.ganttMidLevelBorderColor;
                height = settings.timeline.ganttMidLevelHeaderHeight;
                break;
            case 2:
                fontColor = settings.timeline.ganttTopLevelTextColor;
                fillColor = settings.timeline.ganttTopLevelFillColor;
                fontSize = settings.timeline.ganttTopLevelFontSize;
                // hAlign = settings.timeline.ganttTopLevelTextAlignment;
                borderWidth = settings.timeline.ganttTopLevelBorderWidth;
                borderColor = settings.timeline.ganttTopLevelBorderColor;
                height = settings.timeline.ganttTopLevelHeaderHeight;
                break;
            default:
                fontColor = '#111111';
                fillColor = '#f4f4f4';
        }
        timelineheader.background().stroke(borderWidth + ' ' + borderColor);
        timelineheader.fontSize(fontSize + 'px');
        timelineheader.fontFamily(settings.chartOptions.fontfamily);
        timelineheader.fontColor(fontColor);
        timelineheader.fill(fillColor);
        if (height) {
            timelineheader.height(height + '%');
        }
    }

    private static zoomSettings(chart: any, settings: any, instance: GanttChart, JSONArray: JSONArrayDef, data: Data, highContrast: HighContrastColors) {
        const { zoomOptions, ganttdateformat, ganttCustomDate} = settings.chartOptions;
        const timeline = chart.getTimeline();
        timeline.zoomOnMouseWheel(zoomOptions === 'mouseWheel');
        if (zoomOptions === 'mouseWheel') isZoomApplied = true;
        this.zoomButton(chart, settings, instance, highContrast);
        this.divGanttControls(chart, settings, instance, JSONArray, highContrast);
        this.zoomLevels(chart, settings);
        this.timelineDates(chart, settings, instance, data);
        if (!settings.timeline.ganttzoomrangeenabled && !settings.timeline.ganttscrollenable) {
            chart.listenOnce('chartDraw', () => {
                chart.fitAll();
            });
            return;
        }
        const unit = settings.timeline.ganttZoomUnit,
            count = settings.timeline.ganttZoomRange,
            anchor = settings.timeline.ganttZoomAnchor;
        if ((anchor === 'custom' || anchor === 'today') && count != 0) {
            let chartDateFormat;
            let startUnix, endUnix;
            if (anchor === 'today') {
                startUnix = this.GET_UTC_TIMESTAMP(moment());
                endUnix = this.GET_UTC_TIMESTAMP(moment().add(count, unit + 's'));
            } else {
                chartDateFormat = Helper.GANTT_DATE_FORMAT_WRAPPER(
                    ganttdateformat,
                    ganttCustomDate,
                );
                const dateEntered = settings.timeline.ganttCustomDate;
                const startMoment = moment(dateEntered, chartDateFormat);
                startUnix = this.GET_UTC_TIMESTAMP(startMoment);
                endUnix = this.GET_UTC_TIMESTAMP(startMoment.add(count, unit + 's'));
            }
            chart.zoomTo(startUnix, endUnix);
        } else {
            chart.zoomTo(unit, count, anchor);
        }
    }

    private static zoomLevels(chart, settings) {
        const { isEnabled } = JSON.parse(settings.editor.zoomLevels);
        let { zoomLevels } = JSON.parse(settings.editor.zoomLevels);
        if (zoomLevels.length > 0 && isEnabled) {
            zoomLevels = zoomLevels.map((value) => {
                return [
                    { unit: value.granularity3, count: value.granularity3Value },
                    { unit: value.granularity2, count: value.granularity2Value },
                    { unit: value.granularity1, count: value.granularity1Value },
                ];
            });
            chart.getTimeline().scale().zoomLevels(zoomLevels);
        }
    }

    private static zoomButton(chart: any, settings: VisualSettings, instance: GanttChart, highContrast: HighContrastColors): void {
        const zoomButtonDiv = document.createElement('div');
        zoomButtonDiv.className = 'zoomButtonDiv';
        if ((<any>instance).options.viewMode == 0) {
            zoomButtonDiv.style.top = '2em';
        }
        const plusInputButton = document.createElement('input');
        plusInputButton.type = 'button';
        plusInputButton.id = 'plusInputButtonNew';
        plusInputButton.value = '\uE8A3';
        plusInputButton.style.fontFamily = 'FabricMDL2Icons';
        plusInputButton.style.color = highContrast.isHighContrast ? highContrast.foreground : settings.chartOptions.zoomButtonColor;
        plusInputButton.style.background = highContrast.isHighContrast ? highContrast.background : settings.chartOptions.zoomButtonBackgroundColor;
        const minusInputButton = document.createElement('input');
        minusInputButton.type = 'button';
        minusInputButton.id = 'minusInputButtonNew';
        minusInputButton.value = '\uE71F';
        minusInputButton.style.fontFamily = 'FabricMDL2Icons';
        minusInputButton.style.color = highContrast.isHighContrast ? highContrast.foreground : settings.chartOptions.zoomButtonColor;
        minusInputButton.style.background = highContrast.isHighContrast ? highContrast.background : settings.chartOptions.zoomButtonBackgroundColor;
        minusInputButton.onclick = () => {
            chart.zoomOut(zOutFactor);
            isZoomApplied = true;
            zOutFactor = zOutFactor + 0.1;
            zInFactor = 1;
        };
        plusInputButton.onclick = () => {
            chart.zoomIn(zInFactor);
            isZoomApplied = true;
            zInFactor = zInFactor + 0.1;
            zOutFactor = 1;
        };
        if (settings.chartOptions.zoomOptions == 'button') {
            zoomButtonDiv.appendChild(plusInputButton);
            zoomButtonDiv.appendChild(minusInputButton);
        }
        instance.zoomButtonDiv = zoomButtonDiv;
    }

    private static getCurrentZoomLevels(scale: any, settings: VisualSettings) {
        const reversedZoomLevels = JSON.parse(settings.editor.zoomLevels).zoomLevels.reverse();
        const getTotalRange = scale.sj();
        const range = (getTotalRange.max - getTotalRange.min) / 20;
        const zoomLevels = scale.jd;

        let currentIndex;
        const lastIndex = zoomLevels.length - 1;
        let currentZoomLevel;
        for (let index = 0; index < lastIndex; index++) {
            if (range <= zoomLevels[index].range) {
                currentZoomLevel = zoomLevels[index];
                currentIndex = index;
                break;
            }
        }
        currentZoomLevel || (currentZoomLevel = zoomLevels[lastIndex]);
        if (currentIndex === undefined || currentIndex === null) {
            currentIndex = lastIndex;
        }

        return reversedZoomLevels[currentIndex];
    }

    private static showErrorMessages(instance: GanttChart) {
        const popContainer = document.getElementById('info-popup-container');
        if (!popContainer || !instance.isErrorInWritingData) return null;
        popContainer.classList.remove('hideElement');
        setTimeout(() => {
            popContainer.classList.add('hideElement');
            instance.isErrorInWritingData = false;
        }, 5000);
    }

    private static divGanttControls(chart: any, settings: VisualSettings, instance: GanttChart, JSONArray: JSONArrayDef, highContrast: HighContrastColors) {
        this.showErrorMessages(instance);
        const divGanttControls = instance.divGanttControls || document.createElement('div');
        Util.EMPTYNODE(divGanttControls);
        divGanttControls.className = 'gantt-controls';
        divGanttControls.id = 'header-div';
        const divRightControls = document.createElement('div');
        divRightControls.className = 'right-controls';
        divGanttControls.appendChild(divRightControls);
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        divRightControls.appendChild(buttonGroup);
        //data modified indicator
        const dataModifiedIndicator = document.createElement('span');
        dataModifiedIndicator.className = 'buttonIndicator icon icon--Reset';
        dataModifiedIndicator.title = 'click here to reset to original data';
        dataModifiedIndicator.style.fontFamily = 'FabricMDL2Icons';
        dataModifiedIndicator.style.color = highContrast.isHighContrast ? highContrast.foreground : settings.interaction.liveEditingIconColor;
        const isModifiedDataPresent = settings.writeBack.sendOnlyModifiedItem
            ? instance.isDataForUpdatePresent
            : Object.keys(instance.modifiedData).length > 0;
        if (settings.interaction.show && instance.isGanttEnterprise && isModifiedDataPresent) {
            buttonGroup.appendChild(dataModifiedIndicator);
        }
        //push button
        const pushButton = document.createElement('span');
        pushButton.className = 'buttonIndicator icon icon--PublishContent';
        pushButton.title = 'Push changes to end point';
        pushButton.style.color = settings.interaction.liveEditingIconColor;
        if ( settings.writeBack.show && instance.isGanttEnterprise && settings.writeBack.sendOnlyModifiedItem && instance.isDataForUpdatePresent)
            buttonGroup.appendChild(pushButton);
        //png download icon
        const pngIcon = document.createElement('input');
        pngIcon.type = 'button';
        pngIcon.id = 'pngIcon';
        pngIcon.value = '\uF522';
        pngIcon.title = 'Download png';
        pngIcon.style.fontFamily = 'FabricMDL2Icons';
        pngIcon.style.color = settings.interaction.liveEditingIconColor;
        if (settings.miscellaneous.enablePngExport) buttonGroup.appendChild(pngIcon);
        pngIcon.onclick = () => {
            chart.saveAsPng();
        };
        pushButton.onclick = async () => {
            await instance.pushToEndPoint();
            Helper.divGanttControls(chart, settings, instance, JSONArray, highContrast);
            const updateProperties = [];
            updateProperties.push({
                objectName: 'interaction',
                properties: {
                    modifiedData: JSON.stringify(instance.modifiedData),
                },
            });
            const peristObj = {
                merge: updateProperties,
            };
            (<any>this).host.persistProperties(peristObj);
        };
        dataModifiedIndicator.onclick = () => {
            const updateProperties = [];
            const content = {};
            const changedDataObject = instance.modifiedData;
            const changedDataObjectKeys = Object.keys(changedDataObject);
            if (settings.writeBack.sendOnlyModifiedItem) {
                // revert only recently changed items
                changedDataObjectKeys.forEach((key) => {
                    if (!changedDataObject[key].isRecentlyModified) {
                        content[key] = changedDataObject[key];
                    }
                    changedDataObject[key].isRecentlyModified = false;
                });
            }
            if (Object.keys(content).length !== changedDataObjectKeys.length) {
                instance.forceRender = true;
            }
            updateProperties.push({
                objectName: 'interaction',
                properties: {
                    modifiedData: JSON.stringify(content),
                },
            });
            const peristObj = {
                merge: updateProperties,
            };
            (<any>instance).host.persistProperties(peristObj);
            instance.isDataForUpdatePresent = false;
        };

        divGanttControls.style.margin = '8px 0px';
        divGanttControls.style.paddingRight = (settings.summaryTable.show && (settings.utilityMenu.isLevels || settings.utilityMenu.isTooltip)) ? '60px' : ((settings.summaryTable.show || (settings.utilityMenu.isLevels || settings.utilityMenu.isTooltip)) ? '30px' : '0px');

        instance.divGanttControls = divGanttControls;
    }

    private static timelineDates(chart: any, settings: any, instance: any, data: Data) {
        const zoomLevels  = JSON.parse(settings.editor.zoomLevels);
        const timeline = zoomLevels.timeline;
        if (!timeline) return;
        if (Object.keys(timeline).length === 0) return;

        const { option } = instance;
        let updated = false;
        let restDefault = false;
        const startDateMeasure = data.categorical.measures.find(measure => measure.name === timeline.startDateMeasure);
        const endDateMeasure = data.categorical.measures.find(measure => measure.name === timeline.endDateMeasure);
        const startValid = timeline.startDateOptions === 'data' && startDateMeasure && startDateMeasure['type']?.dateTime;
        const endValid = timeline.endDateOptions === 'data' && endDateMeasure && endDateMeasure['type']?.dateTime

        function handleDateOptions(dateOptions: string, dateValue: string, measureValue: string, isMinDate: boolean) {
            const scaleMethod = isMinDate ? 'minimum' : 'maximum';
            if (dateOptions === 'static-date' && dateValue !== '') {
                const timestamp = instance.getUnixTimeStamp(timeline[dateValue]);
                chart.getTimeline().scale()[scaleMethod](timestamp);
            } else if (dateOptions === 'data' && measureValue !== '') {
                chart.getTimeline().scale()[scaleMethod](measureValue);
            }
            // Commented the default scenario since the value will be reset by anyChart
            // else if (dateOptions === 'default') {
            //     chart.getTimeline().scale()[scaleMethod](instance.minMaxDate[isMinDate ? 'min' : 'max']);
            // }
        }

        //dynamic timeline update when on change
        if(option.hasData && option.changedProperties?.data && option.dataUpdated && [2, 8].includes(option.updateType)){
            if(startValid){
                const newEarliest = [];
                const validEarliest = startDateMeasure.formattedValues.filter(Boolean);
                validEarliest.forEach(value => newEarliest.push(value));

                const newEarliestDate = newEarliest.reduce((minDate, currentDate) => {
                    return currentDate < minDate ? currentDate : minDate;
                }, newEarliest[0]);

                if(newEarliestDate){
                    updated = true;
                    timeline.startDateValue = newEarliestDate;
                }
            } else {
                updated = true;
                timeline.startDateValue = undefined;
            }

            if(endValid){
                const newLatest = [];
                const validLatest = endDateMeasure.formattedValues.filter(Boolean);
                validLatest.forEach(value => newLatest.push(value));

                const newLatestDate = newLatest.reduce((maxDate, currentDate) => {
                    return currentDate < maxDate ? maxDate : currentDate;
                }, newLatest[0]);

                if(newLatestDate){
                    updated = true;
                    timeline.endDateValue = newLatestDate;
                }
            } else {
                updated = true;
                timeline.endDateValue = undefined;
            }
        }

        const startCompare = timeline.startDateOptions === 'default' ? instance.minMaxDate.min : timeline.startDateOptions === 'static-date' ? this.GET_UTC_TIMESTAMP(moment(timeline.startDate)) : startValid ? this.GET_UTC_TIMESTAMP(moment(timeline.startDateValue)) : false;
        const endCompare = timeline.endDateOptions === 'default' ? instance.minMaxDate.max : timeline.endDateOptions === 'static-date' ? this.GET_UTC_TIMESTAMP(moment(timeline.endDate)) : endValid ? this.GET_UTC_TIMESTAMP(moment(timeline.endDateValue)) : false;


        if((timeline.startDateOptions !== 'default' || timeline.endDateOptions !== 'default')){
            //reset to deafult for invalid date on data
            restDefault = this.getTimelineDateMeasures(data, timeline, startValid, endValid, restDefault, startCompare, endCompare);
        }

        handleDateOptions(timeline.startDateOptions, 'startDate', timeline.startDateValue, true);
        handleDateOptions(timeline.endDateOptions, 'endDate', timeline.endDateValue, false);

        if (updated || restDefault) {
            zoomLevels.timeline = timeline;
            (<any>instance).host.persistProperties({
                merge: [
                    {
                        objectName: 'editor',
                        selector: null,
                        properties: {
                            zoomLevels: JSON.stringify(zoomLevels)
                        }
                    }
                ]
            });
        }
    }

    private static getTimelineDateMeasures(dataView, timeline, startValid, endValid, restDefault, startCompare, endCompare) {
        const timelineDateMeasures = dataView.categorical.measures
            .filter(measure => measure.role.timelineDate);
        if ((timelineDateMeasures.length === 0 && (timeline.startDateOptions === 'data' || timeline.endDateOptions === 'data')) || (!endValid && !startValid && (timeline.startDateOptions === 'data' && timeline.endDateOptions === 'data')) || (startCompare >= endCompare)) {
            //reset both to default when date field is empty or both date not valid or start > end in DYNAMIC UPDATE
            restDefault = true;
            timeline.startDateOptions = 'default';
            timeline.endDateOptions = 'default';
        } else if (!startValid && timeline.startDateOptions !== 'static-date' ) {
            restDefault = true;
            timeline.startDateOptions = 'default';
        } else if (!endValid && timeline.endDateOptions !== 'static-date') {
            restDefault = true;
            timeline.endDateOptions = 'default';
        } else {
            restDefault = false;
        }
        return restDefault;
    }

    private static tooltip(chart: any, settings: VisualSettings, instance: GanttChart, JSONArray: JSONArrayDef, anychartSelectionManager: AnychartSelectionManager) {
        const helperInstance = this.anychartTooltipFormatter;
        const { tooltipType, individualTooltip } = settings.miscellaneous;
        if (tooltipType == 'powerbi') {
            // Disable the default tooltips for the data grid and timeline
            chart.dataGrid().tooltip().enabled(false);
            chart.getTimeline().tooltip(false);
            // Handle row mouseover event to show Power BI tooltip
            chart.listen('rowMouseOver', (event) => {
                try {
                    // Format tooltip data
                    const tooltipDataItems = individualTooltip ?
                        this.milestoneTooltipFormatter(event, settings, JSONArray, instance) :
                        this.anychartTooltipFormatter(event, settings, JSONArray, instance);
                    const chartType = settings.chartOptions.ganttChartType;
                    const selectionId = chartType === 'gantt' ? event.item?.['get']('selectionId') :
                        anychartSelectionManager.getSelectionIdsGanttResource(event.item, event?.['period'], []);
                    // Show tooltip if there are data items to display
                    if (tooltipDataItems.length > 0) {
                        this.tooltipService(
                            tooltipDataItems,
                            (<any>instance).host,
                            event,
                            selectionId,
                            instance,
                        );
                    }
                } catch (err) {
                    // console.log(err);
                }
            });
            // Handle row mouseout event to hide Power BI tooltip
            chart.listen('rowMouseOut', () => {
                if (instance.settings.utilityMenuAction.isTooltipEnabled)
                    (<any>instance).host.tooltipService.hide({
                        isTouchEvent: instance._isPBIMobile,
                    });
            });
        } else {
            // Custom tooltip configuration
            chart.getTimeline().tooltip().useHtml(true);
            chart.dataGrid().tooltip().enabled(false);
            // Customize appearance of custom tooltip
            const { customTooltipValueColor, labelColor, customTooltipFontSize, customTooltipFontfamily, customTooltipBackgroundColor } = settings.customTooltip;
            const timelineTooltip = chart.getTimeline().tooltip();
            timelineTooltip.title().enabled(false);
            timelineTooltip.background().fill(customTooltipBackgroundColor);
            timelineTooltip.fontSize(customTooltipFontSize);
            timelineTooltip.fontFamily(customTooltipFontfamily);
            let tooltipElement;
            const createTooltipElement = (point) => {
                const icon = point.color === 'rgba(0,0,0,0)' ? '\uF39B' : '\uE827';
                const indicator = `<span style="font-family: FabricMDL2Icons;color: ${point.color};">${icon}</span>`;
                const value = `<span style="color: ${customTooltipValueColor};padding-left:2px;">${escape(point.value)}</span>`;
                const label = `<span style="color: ${labelColor};padding-right:2px;">${escape(point.displayName)}</span>`;
                return `<span style="font-size:${customTooltipFontSize + 'px'};
                        font-family: ${customTooltipFontfamily};
                        background-color:${customTooltipBackgroundColor}">
                        ${indicator} ${label}:${value}</span><br>`;
            };
            if (!individualTooltip) {
                chart.getTimeline().tooltip().format(function () {
                    const tooltipPoints = helperInstance(this, settings, JSONArray, instance);
                    return tooltipPoints.map(point => createTooltipElement(point)).join('');
                });
            } else {
                // Handle row mouseover event to generate custom tooltip content
                chart.listen('rowMouseOver', (event) => {
                    try {
                        const tooltipPoints = this.milestoneTooltipFormatter(event, settings, JSONArray, instance);
                        tooltipElement = [];
                        tooltipPoints.map(point => {
                            const displayElement = createTooltipElement(point);
                            tooltipElement.push(displayElement)
                        });
                        timelineTooltip.enabled(tooltipElement.length > 0);
                    } catch (err) {
                        // console.log(err);
                    }
                });
                // Handle row mouseout event to re-enable custom tooltip
                chart.listen('rowMouseOut', () => {
                    timelineTooltip.enabled(true);
                });
                // Format the custom tooltip content
                timelineTooltip.format(() => tooltipElement.length > 0 ? tooltipElement.join('') : '');
            }
        }
    }

    private static milestoneTooltipFormatter(event: any, settings: VisualSettings, JSONArray: JSONArrayDef, instance: GanttChart) {
        let tooltipDataItems = [];
        const { originalEvent, rowType, elementType, item } = event;
        // Check if the event is a marker element
        const isMarkerElement = originalEvent?.markerIndex !== undefined && originalEvent?.markerIndex !== null;
        const isGanttChartType = settings.chartOptions.ganttChartType === 'gantt';
        const validTypes = ['tasks', 'grouping-tasks', 'baselines', 'milestones', 'periods'];
        // Helper function to check if a type is valid
        const isValidType = (type: string) => validTypes.includes(type);

        // Handling marker elements for milestones in the Gantt chart
        if (isMarkerElement && isValidType(rowType) && isGanttChartType) {
            // Get the marker index and the corresponding marker
            const markerIndex = originalEvent.markerIndex;
            const marker = instance.markerItems[markerIndex];
            // Get the date/time value of the marker
            const value = Helper.getDateTime(marker.value, settings);
            const { displayTaskName, taskNameText } = settings.customizeTooltip
            // Adding task name to tooltip if available and enabled
            if (item['get']('name') !== undefined && displayTaskName)
                tooltipDataItems.push({ displayName: taskNameText, value: '' + item['get']('name') || '(Blank)', color: 'rgba(0,0,0,0)' });
            // Adding marker information to tooltip if value is valid and showInTooltip is enabled
            if (value !== 'Invalid date')
                marker.showInTooltip &&
                    tooltipDataItems.push({ displayName: marker.name, value: '' + value, color: 'rgba(0,0,0,0)' });
        } else if (isGanttChartType && !isMarkerElement && isValidType(rowType) && validTypes.concat('milestones-preview').includes(elementType)) {
            // Handling non-marker elements in the Gantt chart
            tooltipDataItems = this.anychartTooltipFormatter(event, settings, JSONArray, instance);
        } else if (isValidType(rowType) && isValidType(elementType)) {
            tooltipDataItems = this.anychartTooltipFormatter(event, settings, JSONArray, instance);
        }
        return tooltipDataItems;
    }

    private static numberFormatting(value: any, pointNumberFormatting: any, numberFormatting: NumberFormatting, autoScalingFactor: string) {
        const formattingOptions = {};
        formattingOptions['enabledDefaultFormat'] = false;
        formattingOptions['semanticFormatting'] = false;
        formattingOptions['enabled'] = true;
        formattingOptions['thousandSeperator'] = ',';
        formattingOptions['decimalSeperator'] = '.';
        formattingOptions['noOfDecimal'] = pointNumberFormatting.noOfDecimal || 2;
        if (
            pointNumberFormatting.noOfDecimal == 0 ||
            pointNumberFormatting.noOfDecimal < 0 ||
            pointNumberFormatting.noOfDecimal > 10
        ) {
            if (pointNumberFormatting.noOfDecimal == 0) formattingOptions['noOfDecimal'] = 0;
            else {
                if (pointNumberFormatting.noOfDecimal < 0) formattingOptions['noOfDecimal'] = 0;
                else formattingOptions['noOfDecimal'] = 10;
            }
        }
        formattingOptions['prefix'] = pointNumberFormatting.prefix || '';
        formattingOptions['suffix'] = pointNumberFormatting.suffix || '';
        formattingOptions['scalingFactor'] = pointNumberFormatting.scalingFactor;
        formattingOptions['semanticFormatting'] = numberFormatting.isEnableSemantingFormatting;
        formattingOptions['negativeValueFormat'] = numberFormatting.negativeValueFormat;
        formattingOptions['negativeValueColor'] = numberFormatting.negativeValueColor;
        formattingOptions['positiveValueFormat'] = numberFormatting.positiveValueFormat;
        formattingOptions['positiveValueColor'] = numberFormatting.positiveValueColor;
        if (autoScalingFactor === '' && pointNumberFormatting.scalingFactor === 'auto') {
            autoScalingFactor = Helper.getScalingFactor(value);
        }
        return applyFormattings(formattingOptions, value, '', false, 'auto', autoScalingFactor);
    }

    private static getScalingFactor(value) {
        try {
            value = Math.abs(value);
            if (value >= 1e12) return 'T';
            if (value >= 1e9) return 'B';
            if (value >= 1e6) return 'M';
            if (value >= 1e3) return 'K';
            return '';
        } catch (e) {
            return '';
        }
    }

    private static markerTooltipPoints(
        event: any,
        tooltipDataItems: any[],
        settings: VisualSettings
    ) {
        const markers = <any>Array.from(new Set(event.item['get']('markers')));
        if (!markers) return;
        markers.forEach((marker) => {
            if (!marker.value) return;
            const value = Helper.getDateTime(marker.value, settings);
            if (value !== 'Invalid date')
                marker.showInTooltip &&
                    tooltipDataItems.push({ displayName: marker.name, value: '' + value, color: 'rgba(0,0,0,0)' });
        });
    }

    private static parentMilestonePoints(
        event: any,
        tooltipDataItems: any[],
        settings: VisualSettings
    ) {
        const milestoneArray = event.item['get']('milestoneArray');
        if (!milestoneArray || milestoneArray.length == 0) return;
        milestoneArray.forEach((milestone) => {
            const value = Helper.getDateTime(milestone.date, settings);
            if (value !== 'Invalid date')
                tooltipDataItems.push({ displayName: milestone.name, value: '' + value, color: 'rgba(0,0,0,0)' });
        });
    }

    private static progressValueTooltip(
        event: any,
        settings: VisualSettings,
        tooltipDataItems: any,
        JSONArray: JSONArrayDef,
    ) {
        const { customizeTooltip } = settings;
        const progressValueNumberFormatting =
            JSONArray.progressValue &&
            JSONArray.progressValue[0] &&
            JSONArray.progressValue[0].settings.numberFormatting;
        const progressValue = event.item['get']('progressValue');
        let progressValueOriginal;
        if (
            (progressValue || progressValue == 0) &&
            progressValueNumberFormatting &&
            progressValueNumberFormatting.showMeasureLabel
        ) {
            progressValueOriginal = progressValue * 100;
            const numberFormatting = this.numberFormatting(
                progressValueOriginal,
                progressValueNumberFormatting || settings.numberFormatting,
                settings.numberFormatting,
                JSONArray.progressValue[0].scalingFactor
            );
            const value = numberFormatting['formattedOutput'];
            let color = numberFormatting['color'];
            if (progressValueOriginal == 0 && settings.numberFormatting.isEnableSemantingFormatting) {
                color = settings.numberFormatting.positiveValueColor;
            }
            color = event.item['get']('tooltipColor') ? event.item['get']('tooltipColor') : color;
            if (!color) {
                color = 'rgba(0,0,0,0)';
            }
            customizeTooltip.displayProgressValue &&
                tooltipDataItems.push({
                    displayName: customizeTooltip.progressValueText,
                    value: value + '',
                    color: color,
                });
        } else {
            const color = event.item['get']('tooltipColor') ? event.item['get']('tooltipColor') : 'rgba(0,0,0,0)';
            if (progressValue || progressValue == 0)
                customizeTooltip.displayProgressValue &&
                    tooltipDataItems.push({
                        displayName: customizeTooltip.progressValueText,
                        value: '' + (progressValue * 100).toFixed(2) + '%',
                        color: color,
                    });
        }
    }

    private static getTooltipFormatterDates(
        event: any,
        tooltipDataItems: any[],
        settings: VisualSettings
    ) {
        const { customizeTooltip } = settings;
        if (event.item['get']('actualStart')) {
            if (event.item['get']('actualStart') !== event.item['get']('actualEnd')) {
                if (event.item['get']('actualStart') && customizeTooltip.displayStartDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value: '' + Helper.getDateTime(event.item['get']('actualStart'), settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
                if (event.item['get']('actualEnd') && customizeTooltip.displayEndDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.endDateText,
                        value: '' + Helper.getDateTime(event.item['get']('actualEnd'), settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
            } else {
                if (event.item['get']('actualStart') && customizeTooltip.displayStartDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value: '' + Helper.getDateTime(event.item['get']('actualStart'), settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
            }
        } else {
            if (event.item['meta']('autoStart') && customizeTooltip.displayStartDate) {
                tooltipDataItems.push({
                    displayName: customizeTooltip.startDateText,
                    value: '' + Helper.getDateTime(event.item['meta']('autoStart'), settings),
                    color: 'rgba(0,0,0,0)',
                });
            }
            if (event.item['meta']('autoEnd') && customizeTooltip.displayEndDate) {
                tooltipDataItems.push({
                    displayName: customizeTooltip.endDateText,
                    value: '' + Helper.getDateTime(event.item['meta']('autoEnd'), settings),
                    color: 'rgba(0,0,0,0)',
                });
            }
        }
        if (event.item['get']('baselineStart') && customizeTooltip.displayPlannedStartDate) {
            tooltipDataItems.push({
                displayName: customizeTooltip.plannedStartDateText,
                value: '' + Helper.getDateTime(event.item['get']('baselineStart'), settings),
                color: 'rgba(0,0,0,0)',
            });
        }
        if (event.item['get']('baselineEnd') && customizeTooltip.displayPlannedEndDate) {
            tooltipDataItems.push({
                displayName: customizeTooltip.plannedEndDateText,
                value: '' + Helper.getDateTime(event.item['get']('baselineEnd'), settings),
                color: 'rgba(0,0,0,0)',
            });
        }
    }

    private static getTooltipFormatterDatesGanttResource(
        event: any,
        tooltipDataItems: any[],
        periodIndex: number,
        settings: VisualSettings
    ) {
        const { customizeTooltip } = settings;
        if (event.item['get']('periods')) {
            if (periodIndex != -1) {
                customizeTooltip.displayStartDate &&
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value:
                            '' +
                            Helper.getDateTime(event.item['get']('periods')[periodIndex].start, settings),
                        color: 'rgba(0,0,0,0)',
                    });
                if (event.item['get']('periods')[periodIndex].end != undefined)
                    customizeTooltip.displayEndDate &&
                        tooltipDataItems.push({
                            displayName: customizeTooltip.endDateText,
                            value:
                                '' +
                                Helper.getDateTime(event.item['get']('periods')[periodIndex].end, settings),
                            color: 'rgba(0,0,0,0)',
                        });
            } else {
                let minStart = Infinity,
                    MaxEnd = -Infinity;
                event.item['get']('periods').forEach((period) => {
                    if (period.start < minStart) minStart = period.start;
                    if (period.end > MaxEnd) MaxEnd = period.end;
                });
                customizeTooltip.displayStartDate &&
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value: '' + Helper.getDateTime(minStart, settings),
                        color: 'rgba(0,0,0,0)',
                    });
                customizeTooltip.displayEndDate &&
                    tooltipDataItems.push({
                        displayName: customizeTooltip.endDateText,
                        value: '' + Helper.getDateTime(MaxEnd, settings),
                        color: 'rgba(0,0,0,0)',
                    });
            }
        }
    }

    private static getMilestoneTooltipFormatterDates(event: any, tooltipDataItems: any[], settings: VisualSettings) {
        const { customizeTooltip } = settings;
        function getTooltipItemData(item, key, method = 'get') {
            return item[method](key);
        }
        const { tooltipItem } = event;
        const actualStart = getTooltipItemData(tooltipItem, 'actualStart');
        const actualEnd = getTooltipItemData(tooltipItem, 'actualEnd');
        const autoStart = getTooltipItemData(tooltipItem, 'autoStart', 'meta');
        const autoEnd = getTooltipItemData(tooltipItem, 'autoEnd', 'meta');
        const baselineStart = getTooltipItemData(tooltipItem, 'baselineStart');
        const baselineEnd = getTooltipItemData(tooltipItem, 'baselineEnd');

        // Check if actual start date exists
        if (actualStart) {
            // If actual start date and actual end date are different, add both to the tooltip
            if (actualStart !== actualEnd) {
                if (actualStart && customizeTooltip.displayStartDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value: '' + Helper.getDateTime(actualStart, settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
                if (actualEnd && customizeTooltip.displayEndDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.endDateText,
                        value: '' + Helper.getDateTime(actualEnd, settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
            } else {
                // If only one date exists, add it to the tooltip
                if (actualStart && customizeTooltip.displayStartDate) {
                    tooltipDataItems.push({
                        displayName: customizeTooltip.startDateText,
                        value: '' + Helper.getDateTime(actualStart, settings),
                        color: 'rgba(0,0,0,0)',
                    });
                }
            }
        } else {
            // If actual start date doesn't exist, add auto start and auto end dates if available
            if (autoStart && customizeTooltip.displayStartDate) {
                tooltipDataItems.push({
                    displayName: customizeTooltip.startDateText,
                    value: '' + Helper.getDateTime(autoStart, settings),
                    color: 'rgba(0,0,0,0)',
                });
            }
            if (autoEnd && customizeTooltip.displayEndDate) {
                tooltipDataItems.push({
                    displayName: customizeTooltip.endDateText,
                    value: '' + Helper.getDateTime(autoEnd, settings),
                    color: 'rgba(0,0,0,0)',
                });
            }
        }
        // Add baseline start and end dates if available and enabled in settings
        if (baselineStart && customizeTooltip.displayPlannedStartDate) {
            tooltipDataItems.push({
                displayName: customizeTooltip.plannedStartDateText,
                value: '' + Helper.getDateTime(baselineStart, settings),
                color: 'rgba(0,0,0,0)',
            });
        }
        if (baselineEnd && customizeTooltip.displayPlannedEndDate) {
            tooltipDataItems.push({
                displayName: customizeTooltip.plannedEndDateText,
                value: '' + Helper.getDateTime(baselineEnd, settings),
                color: 'rgba(0,0,0,0)',
            });
        }
    }

    private static anychartTooltipFormatter(event: any, settings: VisualSettings, JSONArray: JSONArrayDef, instance: GanttChart) {
        const { customizeTooltip } = settings;
        let periodIndex = -1;
        const tooltipDataItems = [];
        const individualTooltip = settings.miscellaneous.individualTooltip;

        // Format Task Name and add task name to tooltip
        if (event['period']) {
            periodIndex = event['periodIndex'];
            const period = event.item['get']('periods')[periodIndex];
            let name;
            if (period.isMilestone) {
                name = period.name;
            } else {
                const parentName = period.parent;
                name = parentName.split('~!~').pop();
                name = name ? name : parentName;
                name = name == 'null' ? '' : name;
            }
            customizeTooltip.displayTaskName &&
                tooltipDataItems.push({ displayName: customizeTooltip.taskNameText, value: name, color: 'rgba(0,0,0,0)' });
        } else {
            if (event.item['get']('name') !== undefined && customizeTooltip.displayTaskName)
                tooltipDataItems.push({ displayName: customizeTooltip.taskNameText, value: '' + event.item['get']('name') || '(Blank)', color: 'rgba(0,0,0,0)' });
        }

        if (individualTooltip && event.tooltipItem) {
            Helper.getMilestoneTooltipFormatterDates(event, tooltipDataItems, settings);
        } else {
            Helper.getTooltipFormatterDates(event, tooltipDataItems, settings);
        }

        // Progess value formatting
        if (JSONArray.progressValue[0]) {
            if (individualTooltip && event.elementType !== "milestones") {
                Helper.progressValueTooltip(event, settings, tooltipDataItems, JSONArray);
            } else {
                Helper.progressValueTooltip(event, settings, tooltipDataItems, JSONArray);
            }
        }

        //gantt resource tooltip
        Helper.getTooltipFormatterDatesGanttResource(event, tooltipDataItems, periodIndex, settings);

        // Marker tooltip
        if (event.item['get']('isChildren')) Helper.markerTooltipPoints(event, tooltipDataItems, settings);

        // Add parent milestone to tooltip
        if (instance.milestoneConfig.generalConfig.enablePreview)
            Helper.parentMilestonePoints(event, tooltipDataItems, settings);

        // Get point-specific tooltip data and format it
        let pointTooltipData;
        if (settings.chartOptions.ganttChartType == 'gantt') {
            pointTooltipData = event.item['get']('tooltips');
        } else {
            pointTooltipData = event.item['get']('periods') && event.item['get']('periods')[periodIndex] && event.item['get']('periods')[periodIndex].tooltips;
        }
        if (pointTooltipData) {
            pointTooltipData = Helper.formatPointTooltipData(pointTooltipData, settings);
        }

        Array.prototype.push.apply(tooltipDataItems, pointTooltipData);
        return tooltipDataItems;
    }

    private static formatPointTooltipData(pointTooltipData: any[], settings: VisualSettings) {
        return pointTooltipData.map((point) => {
            if (point.value == null || point.value === '') return;
            let value, color;
            if (!isNaN(point.value) && point.value != null && point.value !== '') {
                if (point.numberFormatting && point.numberFormatting.showMeasureLabel) {
                    const numberFormatting = Helper.numberFormatting(
                        point.modifiedValues || point.value,
                        point.numberFormatting || settings.numberFormatting,
                        settings.numberFormatting,
                        point.scalingFactor
                    );
                    value = numberFormatting['formattedOutput'];
                    color = numberFormatting['color'];
                    if (point.value == 0 && settings.numberFormatting.isEnableSemantingFormatting) {
                        color = settings.numberFormatting.positiveValueColor;
                    }
                } else {
                    if (point.format) {
                        const iValueFormatter = valueFormatter.create({
                            format: point.format,
                        });
                        value = iValueFormatter.format(point.value);
                    } else {
                        if (typeof point.value == 'number') {
                            if (String(point.value).indexOf('e') == -1) {
                                value = point.value.toFixed(2);
                            } else {
                                value = point.value.toExponential(2).toUpperCase();
                            }
                        } else {
                            value = point.value;
                        }
                    }
                    color = 'rgba(0,0,0,0)';
                }
            } else {
                value = point.value;
                color = 'rgba(0,0,0,0)';
            }
            if (!settings.numberFormatting.isEnableSemantingFormatting) {
                color = 'rgba(0,0,0,0)';
            }
            return {
                displayName: point.name,
                value: '' + value,
                color: color,
            };
        });
    }

    private static tooltipService(
        tooltipDataItems: any,
        host: any,
        event: any,
        selectionId: any,
        instance: GanttChart,
    ) {
        if (instance.settings.utilityMenuAction.isTooltipEnabled)
            host.tooltipService.show({
                coordinates: [event.originalEvent.clientX, event.originalEvent.clientY],
                isTouchEvent: instance._isPBIMobile,
                dataItems: tooltipDataItems,
                identities: [selectionId],
            });
    }

    private static dataLabel(
        chart: any,
        settings: VisualSettings,
        instance: GanttChart,
        JSONArray: JSONArrayDef,
        highContrast: HighContrastColors,
    ) {
        const periodLabels = chart.getTimeline().labels();
        periodLabels
            .enabled(settings.dataLabel.show)
            .fontColor(settings.dataLabel.datalabeltextcolor)
            .fontSize(settings.dataLabel.dlFontSize)
            .fontFamily(settings.chartOptions.fontfamily);
        const periodLabelsBackground = periodLabels.background();
        periodLabels.offsetX(settings.dataLabel.horizontaloffset);
        periodLabels.offsetY(settings.dataLabel.verticaloffset);
        periodLabels.useHtml(true);
        periodLabelsBackground
            .enabled(settings.dataLabel.dataLabelBackgroundColorShow)
            .fill(
                HighchartsUtil.CONVERTHEXTORGB(
                    settings.dataLabel.datalabelbackgroundcolor,
                    settings.dataLabel.transparency,
                ),
            );
        chart.getTimeline().labels().position(settings.dataLabel.dataLabelAlignment);
        this.dataLabelFormatter(JSONArray, periodLabels, settings, highContrast, chart, instance);
    }

    private static dataLabelFormatter(
        JSONArray: JSONArrayDef,
        periodLabels: any,
        settings: VisualSettings,
        highContrast: HighContrastColors,
        chart: any,
        instance: GanttChart,
    ) {
        const adaptiveDataLabelFormatter = Helper.ADAPTIVE_DATALABEL_FORMATTER;
        const numberFormatting = this.numberFormatting;
        if (settings.chartOptions.ganttChartType === 'ganttresource') {
            if (JSONArray.dataLabel.length == 0) {
                if (settings.chartOptions.displayindividualtask) {
                    periodLabels.format(function () {
                        if (!this.period) return;
                        if (this.period.isMilestone) {
                            return adaptiveDataLabelFormatter(
                                this,
                                numberFormatting,
                                '',
                                settings,
                                highContrast,
                                true,
                                instance,
                            );
                        }
                        return adaptiveDataLabelFormatter(
                            this,
                            numberFormatting,
                            this.name,
                            settings,
                            highContrast,
                            false,
                            instance,
                        );
                    });
                } else {
                    periodLabels.format(function () {
                        if (!this.period) return;
                        if (this.period.isMilestone) {
                            return adaptiveDataLabelFormatter(
                                this,
                                numberFormatting,
                                '',
                                settings,
                                highContrast,
                                true,
                                instance,
                            );
                        }
                        let name = this.period.parent.split('~!~').pop();
                        name = name ? name : this.period.parent;
                        return adaptiveDataLabelFormatter(
                            this,
                            numberFormatting,
                            name,
                            settings,
                            highContrast,
                            false,
                            instance,
                        );
                    });
                }
            } else {
                periodLabels.format(function () {
                    if (settings.chartOptions.ganttChartType == 'ganttresource') {
                        return adaptiveDataLabelFormatter(
                            this,
                            numberFormatting,
                            '',
                            settings,
                            highContrast,
                            true,
                            instance,
                        );
                    }
                });
            }
        } else if (settings.chartOptions.ganttChartType === 'gantt') {
            this.dataLabelFormatterGantt(periodLabels, settings, numberFormatting, highContrast, JSONArray);
        }
    }

    private static dataLabelFormatterGantt( periodLabels: any, settings: VisualSettings, applyNumberFormatting: any, highContrast: HighContrastColors, JSONArray: JSONArrayDef) {
        periodLabels.format(function () {
            if (this.getData('dataLabel')) {
                const { value, modifiedValue, format, numberFormatting, scalingFactor } = this.getData('dataLabel');
                let finalValue,
                    color = settings.dataLabel.datalabeltextcolor;
                if (typeof value == 'number') {
                    if (numberFormatting && numberFormatting.showMeasureLabel) {
                        const numberFormatOutput: any = applyNumberFormatting(
                            modifiedValue,
                            numberFormatting || settings.numberFormatting,
                            settings.numberFormatting,
                            scalingFactor
                        );
                        color = numberFormatOutput.color;
                        finalValue = numberFormatOutput.formattedOutput;
                    } else {
                        if (format) {
                            const iValueFormatter = valueFormatter.create({
                                format: format,
                            });
                            finalValue = iValueFormatter.format(value);
                        } else {
                            if (String(modifiedValue).indexOf('e') == -1 && modifiedValue) {
                                finalValue = modifiedValue.toFixed(2);
                            } else {
                                finalValue = modifiedValue ? modifiedValue.toExponential(2).toUpperCase() : "";
                            }
                        }
                    }
                } else {
                    if (format) {
                        const iValueFormatter = valueFormatter.create({
                            format: format,
                        });
                        finalValue = iValueFormatter.format(value);
                    } else {
                        finalValue = modifiedValue;
                    }
                }
                typeof finalValue == 'string' ? (finalValue = escape(finalValue)) : finalValue;
                if (highContrast.isHighContrast) {
                    color = highContrast.foreground;
                }
                return `<span style="color: ${color};">${finalValue}</span>`;
            } else {
                if (JSONArray.dataLabel.length > 0) return '';
                const progressValue = JSONArray.progressValue[0];
                let numberFormatting;
                if ( progressValue && progressValue.settings && progressValue.settings.numberFormatting && progressValue.settings.numberFormatting.showMeasureLabel) {
                    numberFormatting = progressValue.settings.numberFormatting;
                    if (isNaN(this.progress) || this.rowType == 'milestones' || this.item['get']('progressValue') == undefined)
                        return '';
                    const numberFormatOutput: any = applyNumberFormatting(this.progress * 100, numberFormatting || settings.numberFormatting, settings.numberFormatting, progressValue.scalingFactor);
                    if (highContrast.isHighContrast) {
                        numberFormatOutput.color = highContrast.foreground;
                    }
                    if (this.start !== this.end) {
                        return `<span style='color:${numberFormatOutput.color}'>${escape(
                            numberFormatOutput.formattedOutput,
                        )}</span>`;
                    } else {
                        return typeof this.name == 'string' ? escape(this.name) : this.name;
                    }
                } else {
                    if (progressValue) {
                        if (!this.mileStoneFromData && this.actualStart && !this.actualEnd) return '';
                        else {
                            const progressValue = this.item['get']('progressValue');
                            if (typeof progressValue == 'number' && !isNaN(progressValue))
                                return (progressValue * 100).toFixed(2) + '%';
                            else return '';
                        }
                    } else {
                        return this.name;
                    }
                }
            }
        });
    }

    private static defaultDataLabelFormatter(periodLabels: any) {
        periodLabels.format(function () {
            if (!this.mileStoneFromData && this.actualStart && !this.actualEnd) return '';
            else {
                const progressValue = this.item['get']('progressValue');
                if (typeof progressValue == 'number' && !isNaN(progressValue))
                    return (progressValue * 100).toFixed(2) + '%';
                else return '';
            }
        });
    }

    private static defaultDataLabelFormatterNoProgress(periodLabels: any) {
        periodLabels.format(function () {
            return this.name;
        });
    }

    private static adaptiveLabelFormaterMeasureHandler(
        settings: VisualSettings,
        instance: any,
        value: number,
        modifiedValue: number,
        format: string | undefined,
        numberFormatting: any,
        highContrast: HighContrastColors,
        helperInstance: any,
        ganttInstance: any,
        autoScalingFactor: string
    ) {
        let finalValue, color;
        if (numberFormatting && numberFormatting.showMeasureLabel) {
            const numberFormatOutput: any = helperInstance(
                modifiedValue,
                numberFormatting || settings.numberFormatting,
                settings.numberFormatting,
                ganttInstance,
                autoScalingFactor
            );
            color = numberFormatOutput.color;
            finalValue = numberFormatOutput.formattedOutput;
        } else {
            if (format) {
                const iValueFormatter = valueFormatter.create({
                    format: format,
                });
                finalValue = iValueFormatter.format(value);
            } else {
                if (String(modifiedValue).indexOf('e') == -1 && modifiedValue) {
                    finalValue = modifiedValue.toFixed(2);
                } else {
                    finalValue = modifiedValue ? modifiedValue.toExponential(2).toUpperCase() : "";
                }
            }
        }
        typeof finalValue == 'string' ? (finalValue = escape(finalValue)) : finalValue;
        if (highContrast.isHighContrast) {
            color = highContrast.foreground;
        }
        if (color) {
            return `<span style="color: ${color};">${finalValue}</span>`;
        } else {
            return finalValue;
        }
    }

    public static ADAPTIVE_DATALABEL_FORMATTER(
        instance: any,
        helperInstance,
        text: string,
        settings: VisualSettings,
        highContrast: HighContrastColors,
        isDataLabel: boolean,
        ganttInstance: GanttChart,
    ) {
        if ((text == null || text == 'null' || text == '') && !isDataLabel) return '';
        let value, modifiedValue, format, numberFormatting, finalValue, scalingFactor;
        if (isDataLabel) {
            if (instance.period && instance.period.dataLabel) {
                value = instance.period.dataLabel.value;
                modifiedValue = instance.period.dataLabel.modifiedValue;
                format = instance.period.dataLabel.format;
                numberFormatting = instance.period.dataLabel.numberFormatting;
                scalingFactor = instance.period.dataLabel.scalingFactor;
            } else {
                return;
            }
        } else {
            value = text;
            modifiedValue = text;
        }
        if (typeof value == 'number') {
            return Helper.adaptiveLabelFormaterMeasureHandler(
                settings,
                instance,
                value,
                modifiedValue,
                format,
                numberFormatting,
                highContrast,
                helperInstance,
                ganttInstance,
                scalingFactor
            );
        } else {
            if (format) {
                const iValueFormatter = valueFormatter.create({
                    format: format,
                });
                finalValue = iValueFormatter.format(value);
            } else {
                finalValue = modifiedValue;
            }
        }
        if (typeof finalValue == 'string') {
            finalValue = escape(finalValue);
            if (!settings.dataLabel.enableAdaptiveLabel) return finalValue;
            let shortText;
            if (finalValue)
                shortText = finalValue
                    .split(' ')
                    .map((item) => {
                        return item[0];
                    })
                    .join('.');
            const label = instance.label;
            if (!label) return;
            const barBounds = instance.barBounds;
            const labelBounds = label.measureWithText(finalValue);
            let barBoundsWidth;
            if (settings.chartOptions.displayindividualtask) {
                barBoundsWidth = Math.abs(barBounds.width);
            } else {
                barBoundsWidth = barBounds.width;
            }
            if (barBoundsWidth < labelBounds.width) {
                return shortText;
            } else {
                return finalValue;
            }
        } else {
            return finalValue;
        }
    }

    private static dataColors( chart: any, settings: VisualSettings, highContrast: HighContrastColors, instance: GanttChart) {
        // configure tasks
        const tasks = chart.getTimeline().tasks();
        const timeline = chart.getTimeline();
        const datagrid = chart.dataGrid();
        const selectedFillColor: string = highContrast.isHighContrast ? highContrast.foregroundSelected : settings.dataColors.enableSelectedColor ? settings.dataColors.selectedFillColor : null;
        const selectedRowColor: string = highContrast.isHighContrast ? highContrast.background : settings.dataColors.selectedRowColor;
        tasks.normal().fill(settings.dataColors.actualChildFillColor);
        tasks.normal().stroke(settings.dataColors.actualChildBorderColor);
        if(instance?.JSONArray?.progressValue?.length){
            tasks.progress().normal().fill(settings.dataColors.actualChildTrackColor);
            tasks.progress().normal().stroke(settings.dataColors.actualChildBorderColor);
        }
        //selected color
        tasks.selected().fill(selectedFillColor || settings.dataColors.actualChildFillColor);
        tasks.selected().stroke(selectedFillColor || settings.dataColors.actualChildBorderColor);
        tasks.progress().selected().fill(selectedFillColor || settings.dataColors.actualChildTrackColor);
        tasks.progress().selected().stroke(selectedFillColor || settings.dataColors.actualChildBorderColor);

        //depth padding
        chart.dataGrid().column(1).depthPaddingMultiplier(15 + settings.displayColumn.categoryIndentation);

        //bullet bar
        if (settings.chartOptions.ganttBarType == 'bullet') {
            timeline.groupingTasks().height('65%');
            timeline.elements().height('65%');
            timeline.tasks().progress().height('50%');
        }
        
        // configure parent tasks
        const parentTasks = chart.getTimeline().groupingTasks();
        parentTasks.normal().fill(settings.dataColors.actualParentFillColor);
        parentTasks.normal().stroke(settings.dataColors.actualParentBorderColor);
        if(instance?.JSONArray?.progressValue?.length){
            parentTasks.progress().normal().fill(settings.dataColors.actualParentTrackColor);
            parentTasks.progress().normal().stroke(settings.dataColors.actualParentBorderColor);
        }
        //parent selected color
        parentTasks.selected().fill(selectedFillColor || settings.dataColors.actualParentFillColor);
        parentTasks.selected().stroke(selectedFillColor || settings.dataColors.actualParentBorderColor);
        parentTasks.progress().selected().fill(selectedFillColor || settings.dataColors.actualParentTrackColor);
        parentTasks.progress().selected().strokeselectedFillColor || settings.dataColors.actualParentBorderColor;

        //configure baseline
        //timeline.baselineFill(settings.dataColors.plannedFillColor);
        //timeline.baselineStroke(settings.dataColors.plannedBorderColor);
        timeline.baselines().fill(settings.dataColors.plannedFillColor);
        timeline.baselines().stroke(settings.dataColors.plannedBorderColor);
        timeline.baselines().selected().fill(settings.dataColors.plannedFillColor);
        timeline.baselines().selected().stroke(settings.dataColors.plannedBorderColor);

        // configure connectors
        const connectors = chart.getTimeline().connectors();
        connectors.normal().fill(settings.dataColors.connectorArrowColor);
        connectors.normal().stroke(this.strokeLineType(settings.dataColors.connectorLineType, settings.dataColors.connectorLineColor, settings.dataColors.connectorLineStroke));
        //configure connectors selected
        connectors.selected().fill(selectedFillColor || settings.dataColors.connectorArrowColor);
        connectors.selected().stroke(this.strokeLineType(settings.dataColors.connectorLineType, selectedFillColor || settings.dataColors.connectorLineColor, settings.dataColors.connectorLineStroke));

        //rowcolor timeline
        timeline.rowEvenFill(settings.dataColors.rowColor);
        timeline.rowOddFill(settings.dataColors.alternativeRowColor);
        timeline.rowHoverFill(settings.dataColors.rowHoverColor);
        timeline.rowSelectedFill(selectedRowColor);

        //rowcolor datagrid
        datagrid.rowEvenFill(settings.dataColors.rowColor);
        datagrid.rowOddFill(settings.dataColors.alternativeRowColor);
        datagrid.rowHoverFill(settings.dataColors.rowHoverColor);
        datagrid.rowSelectedFill(selectedRowColor);

        //tableline color timeline and datagrid
        timeline.rowStroke(settings.dataGrid.gridWidth + ' ' + settings.dataGrid.gridColor);
        timeline.columnStroke(settings.dataGrid.gridWidth + ' ' + settings.dataGrid.gridColor);
        datagrid.rowStroke(settings.dataGrid.gridWidth + ' ' + settings.dataGrid.gridColor);
        datagrid.columnStroke(settings.dataGrid.gridWidth + ' ' + settings.dataGrid.gridColor);

        //ganttResource
        // configure periods
        const periods = chart.getTimeline().periods();
        periods.normal().fill(settings.dataColors.actualChildFillColor);
        periods.normal().stroke(settings.dataColors.actualChildBorderColor);
        //configure period selected
        periods.selected().fill(selectedFillColor || settings.dataColors.actualChildFillColor);
        periods.selected().stroke(selectedFillColor || settings.dataColors.actualChildBorderColor);

        if (settings.interaction.show && instance.isGanttEnterprise) {
            this.editModeStyling(timeline, highContrast);
        }
    }

    private static editModeStyling(timeline: any, highContrast: HighContrastColors) {
        timeline.elements().edit().fill('black 0.2').stroke('3 blue 0.8');

        // set task progress settings
        timeline.tasks().progress().edit().fill('yellow').stroke('2 black');

        // set the appearance control edit to start connector
        timeline.elements().edit().start().connectorThumb().type('triangleleft').size(15).horizontalOffset(1);

        // set the appearance control edit to finish connector
        timeline.elements().edit().end().connectorThumb().type('triangleright').size(15).horizontalOffset(-1);

        if (highContrast.isHighContrast) {
            timeline.elements().edit().thumbs().fill('yellow').stroke('black').size(10);

            timeline.elements().edit().connectorThumbs().fill('yellow').stroke('#090');
        } else {
            timeline.elements().edit().thumbs().fill('red').stroke('black').size(10);

            timeline.elements().edit().connectorThumbs().fill('#9f9').stroke('#090');
        }
    }

    private static getDateTime(unix: number, settings: VisualSettings) {
        const dateFormat = this.GANTT_DATE_FORMAT_WRAPPER(
            settings.chartOptions.ganttdateformat,
            settings.chartOptions.ganttCustomDate,
        );
        // return moment(unix - instance.dateTimeDeviation).format(dateFormat); //PBX-15404
        return moment(unix).utc().format(dateFormat);
    }

    static APPLY_HIGHCONTRAST(highContrast: HighContrastColors, chart: any, settings: VisualSettings) {
        if (!highContrast.isHighContrast) return;
        const foregroundColor = highContrast.foreground,
            backgroundColor = highContrast.background,
            foregroundSelectedColor = highContrast.foregroundSelected;
        const gridWidth = settings.dataGrid.gridWidth,
            { ganttLowLevelBorderWidth, ganttMidLevelBorderWidth, ganttTopLevelBorderWidth } = settings.timeline,
            { connectorLineType, connectorLineStroke } = settings.dataColors;
        // Timeline
        const timeline = chart.getTimeline();
        timeline.backgroundFill(backgroundColor);
        timeline.rowFill(backgroundColor);
        timeline.rowOddFill(backgroundColor);
        timeline.rowEvenFill(backgroundColor);
        timeline.rowHoverFill(backgroundColor, 0.4);
        timeline.rowSelectedFill(backgroundColor);
        timeline.columnStroke(`${gridWidth} ${foregroundColor}`);
        timeline.rowStroke(`${gridWidth} ${foregroundColor}`);
        // Timeline Header
        const timelineheader = timeline.header();
        const lowLevel = timelineheader.level(0);
        const midLevel = timelineheader.level(1);
        const topLevel = timelineheader.level(2);
        lowLevel.fontColor(foregroundColor);
        lowLevel.stroke(foregroundColor);
        lowLevel.fill(backgroundColor);
        lowLevel.background().stroke(`${ganttLowLevelBorderWidth} ${foregroundColor}`);
        midLevel.fontColor(foregroundColor);
        midLevel.stroke(foregroundColor);
        midLevel.fill(backgroundColor);
        midLevel.background().stroke(`${ganttMidLevelBorderWidth} ${foregroundColor}`);
        topLevel.fontColor(foregroundColor);
        topLevel.stroke(foregroundColor);
        topLevel.fill(backgroundColor);
        topLevel.background().stroke(`${ganttTopLevelBorderWidth} ${foregroundColor}`);
        // Timeline Parent
        // configure parent tasks
        const parentTasks = chart.getTimeline().groupingTasks();
        parentTasks.normal().fill(foregroundColor, 0.5);
        parentTasks.normal().stroke(foregroundColor);
        parentTasks.progress().normal().fill(foregroundColor);
        parentTasks.progress().normal().stroke(foregroundColor);
        //timeline elements
        const elements = timeline.elements();
        elements.fill(foregroundColor);
        elements.stroke(foregroundColor);
        //timeline tasks
        const tasks = timeline.tasks();
        tasks.fill(HighchartsUtil.CONVERTHEXTORGB(foregroundColor, 50));
        tasks.stroke(foregroundColor);
        tasks.progress().stroke(foregroundColor);
        // configure milestones
        const milestones = timeline.milestones();
        milestones.normal().fill(foregroundColor);
        milestones.normal().stroke(foregroundColor);
        //dataLabel BackgroundColor
        const periodLabels = chart.getTimeline().labels();
        periodLabels.fontColor(foregroundColor);
        const periodLabelsBackground = periodLabels.background();
        periodLabelsBackground.fill(backgroundColor).stroke(foregroundColor);
        // Baselines
        const baselines = timeline.baselines();
        baselines.fill(HighchartsUtil.CONVERTHEXTORGB(foregroundColor, 50));
        baselines.stroke(foregroundColor);
        // Get connectors.
        const connectors = timeline.connectors();
        connectors.fill(foregroundColor);
        connectors.stroke({ color: foregroundColor, thickness: 1, dash: '0', lineJoin: 'round' });
        const normal = connectors.normal();
        normal.fill(foregroundColor);
        normal.stroke(this.strokeLineType(connectorLineType, foregroundColor, connectorLineStroke));
        //progress
        const progress = tasks.progress();
        progress.normal().fill(foregroundColor);
        progress.selected().fill(foregroundSelectedColor);
        //ganttResource
        //configure periods
        const periods = chart.getTimeline().periods();
        periods.normal().fill(foregroundColor);
        periods.normal().stroke(foregroundColor);
        periods.labels().fontColor(foregroundColor);
        //datagrid
        const dataGrid = chart.dataGrid();
        dataGrid.headerFill(backgroundColor);
        dataGrid.backgroundFill(backgroundColor);
        dataGrid.rowFill(backgroundColor);
        dataGrid.rowOddFill(backgroundColor);
        dataGrid.rowEvenFill(backgroundColor);
        dataGrid.rowHoverFill(backgroundColor, 0.5);
        dataGrid.rowSelectedFill(backgroundColor);
        dataGrid.columnStroke(`${gridWidth} ${foregroundColor}`);
        dataGrid.rowStroke(`${gridWidth} ${foregroundColor}`);
        for (let i = 0; i < dataGridColumnSize + 2; i++) {
            const column = dataGrid.column(i);
            const title = column.title();
            title.fontColor(foregroundColor);
            column.labels().fontColor(foregroundColor);
            title.background(backgroundColor);
        }
    }

    static IS_SAME_ROW_SELECTED_AGAIN(prevSelectionIds: any[], currentSelectionids: any[]) {
        try {
            if (!prevSelectionIds || prevSelectionIds.length !== currentSelectionids.length) {
                return false;
            } else {
                const prevSelectionObj = {};
                prevSelectionIds.forEach((selection) => {
                    prevSelectionObj[selection.key] = true;
                });
                for (let index = 0; index < currentSelectionids.length; index++) {
                    if (!prevSelectionObj[currentSelectionids[index].key]) {
                        return false;
                    }
                }
            }
            return true;
        } catch (e) {
            // console.log(e);
        }
    }

    static APPLYLISTENERS(
        chart: any,
        selectionIdBuilder: SelectionIdBuilder,
        anychartSelectionManager: AnychartSelectionManager,
        settings: VisualSettings,
        instance: GanttChart,
        highContrast: HighContrastColors
    ) {
        chart.listen('rowClick', (e: any) => {
            if (e.period || e.item) {
                let selectionIds;
                const dataColors = settings.dataColors;
                if (settings.chartOptions.ganttChartType == 'gantt') {
                    selectionIds = anychartSelectionManager.getSelectionIds(e.item, []);
                } else {
                    selectionIds = anychartSelectionManager.getSelectionIdsGanttResource(e.item, e.period, []);
                }
                const currentSelectionids = Array.isArray(selectionIds) ? selectionIds : [selectionIds];
                if (Helper.IS_SAME_ROW_SELECTED_AGAIN(instance.prevSelectionIds, currentSelectionids)) {
                    anychartSelectionManager.clearSelection();
                    instance.prevSelectionIds = null;
                    // handled row unselection
                    e.item.meta('selected', false);
                    e.preventDefault();
                    chart.rowSelectedFill(highContrast.isHighContrast ? highContrast.background : ((e.index % 2) != 0) ? dataColors.rowColor : dataColors.alternativeRowColor);
                } else {
                    const isSummaryTableOpen = document.getElementById('summary_table_open');
                    if(isSummaryTableOpen){
                        instance.summaryTableOnClick(instance.option.data,true);
                    }
                    chart.rowSelectedFill(highContrast.isHighContrast ? highContrast.background : dataColors.selectedRowColor);
                    anychartSelectionManager.select(selectionIds);
                    instance.prevSelectionIds = currentSelectionids;
                }
            } else {
                anychartSelectionManager.clearSelection();
            }
        });
        chart.listen('rowDblClick', (e: any) => {
            e.preventDefault();
            if (e.period || e.item) {
                let selectionIds;
                if (settings.chartOptions.ganttChartType == 'gantt') {
                    selectionIds = e.item['get']('selectionId');
                } else {
                    selectionIds = anychartSelectionManager.getSelectionIdsGanttResource(e.item, e.period, []);
                }
                selectionIdBuilder.showContextMenu(selectionIds, e.originalEvent.clientX, e.originalEvent.clientY);
            }
        });
    }

    public static IS_VALID_URL(url: string): { isValiedURL: boolean; url: string } {
        const validURL = (str) => {
            const pattern = new RegExp(
                '^(https?:\\/\\/)?' +
                    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
                    '((\\d{1,3}\\.){3}\\d{1,3}))' +
                    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
                    '(\\?[;&a-z\\d%_.~+=-]*)?' +
                    '(\\#[-a-z\\d_]*)?$',
                'i',
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

    public static GANTT_DATE_FORMAT_WRAPPER(dateFormat, customDate) {
        return dateFormat == 'custom' ? customDate : dateFormat;
    }

    public static GET_UTC_TIMESTAMP(dateObj: any): number {
        return Date.UTC(
            dateObj.year(),
            dateObj.month(),
            dateObj.date(),
            dateObj.hours(),
            dateObj.minutes(),
            dateObj.seconds(),
        );
    }
}

export class settingsHelper {
    private settings: VisualSettings;
    private defaultSettings: VisualSettings;
    private isGanttEnterprise: boolean;
    constructor(settings, defaultSettings, isGanttChartEnterprise) {
        this.settings = settings;
        this.defaultSettings = defaultSettings;
        this.isGanttEnterprise = isGanttChartEnterprise;
    }
    public getSetting(sectionName: string, propertyName: string) {
        if (this.isGanttEnterprise) {
            return this.settings[sectionName][propertyName];
        } else {
            return this.defaultSettings[sectionName][propertyName];
        }
    }
}
