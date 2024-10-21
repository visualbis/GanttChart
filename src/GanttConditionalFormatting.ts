import { DataSelection } from '@visualbi/bifrost-powerbi/dist/DataSelection';
import { d3SelectionUtils } from '@visualbi/bifrost-powerbi/dist/utils/d3SelectionUtils';
import * as moment from 'moment';
import { JSONArrayDef } from './interfaces';
import { HighContrastColors } from '@visualbi/bifrost-powerbi/dist/types/BifrostTypeDef';

export const IMAGE_URL = 'image-url';

export class GanttConditionalFormatting {
    private rules: any;
    private dataView: any;
    private colorScaleFunctionObj = {};
    private measureMinMax;
    private chartType;
    private cfAppliedMeasures = {};
    private statusFlagPresentMeasures = {};
    private isGanttEnterprise: boolean;
    private JSONArray: JSONArrayDef;
    private highContrast: HighContrastColors;
    constructor(rules, dataView, measureMinMax, chartType, JSONArray, isGanttEnterprise, highContrast) {
        this.rules = rules;
        this.dataView = dataView;
        this.measureMinMax = measureMinMax;
        this.chartType = chartType;
        this.isGanttEnterprise = isGanttEnterprise;
        this.JSONArray = JSONArray;
        this.highContrast = highContrast;
    }


    public ganttDataInterator(ganttData) {
        ganttData.forEach((data) => {
            if (data.children) {
                this.ganttDataInterator(data.children);
            }
            if (!data.isMilestone)
                this.applyConditionalFormatting(data);
        });
    }

    public applyConditionalFormatting(node) {
        this.rules.forEach((rule, index) => {
            if (!rule.enabled || (!this.isGanttEnterprise && index > 0) || !this.measureMinMax[rule.highlighedMeasure]) return;
            this.checkConditions(rule, node);
        });
    }

    public getCfAppliedMeasures() {
        return this.cfAppliedMeasures;
    }

    private applyToProgessBar(rule, node, color) {
        const selectedValue = rule.appliedSection;
        const progressColor = rule.progressColor == null ? 'track' : rule.progressColor;
        if ((selectedValue || []).some(option => option.value == 'progress')) {
            if (this.chartType == 'gantt') {
                if (['track', 'both'].indexOf(progressColor) > -1) {
                    node['progress'] = {
                        "fill": { "color": color }
                    };
                }
                if (['fill', 'both'].indexOf(progressColor) > -1) {
                    node['actual'] = { fill: color };
                    node['grouping-tasks'] = { fill: color };
                }
            } else {
                node['fill'] = {
                    "color": color
                };
            }
        }
        if (node.actualStart == node.actualEnd && node.milestone) {
            this.applyToMilestone(rule, node, color, true);
        }
        node['tooltipColor'] = color;
    }

    private evaluateMilestoneRule(rule, node, DataMileStone?): boolean {
        const isMilestoneSelected = rule?.milestoneField && rule.milestoneField.some((v) => (v?.value == node?.milestoneFieldName) || (v?.value == "allSelected"));
        const isRuleApplicable = isMilestoneSelected && (DataMileStone ? (rule?.ruleFor !== 'parent' || DataMileStone) : rule?.ruleFor !== 'parent');
        const selectedValue = rule.appliedSection;
        return isRuleApplicable && (selectedValue || []).some(option => option.value == 'milestone');
    }

    private applyToMilestone(rule, node, color, DataMileStone?) {      
        if (this.evaluateMilestoneRule(rule, node, DataMileStone)) {
            const isDefaultShape = rule.milestoneIconName !== 'default';
            const isCustomImageType = node.type !== IMAGE_URL;
            if (!rule.isCustomImage) {
                if (isDefaultShape) {
                    node.milestone.markerType = rule.milestoneIconName;
                    node.markerType = rule.milestoneIconName;
                    node.milestone.fill = color;
                    node.fill = color;
                    node.milestone.imageUrl = "";
                    node.stroke = node.defaultStroke;
                } else {
                    if (isCustomImageType) {
                        node.milestone.fill = color;
                        node.stroke = node.defaultStroke;
                        node.fill = color;
                    }
                }
            } else {
                if (rule.image) {
                    const imageSource = rule.image;
                    node.milestone.markerType = "image-url";
                    node.milestone.imageUrl = imageSource;
                    node.milestone.fill = { src: imageSource };
                    node.milestone.stroke = 'none';
                    node.markerType = "image-url";
                    node.imageUrl = imageSource;
                    node.fill = { src: imageSource };
                    node.stroke = 'none';
                } else {
                    if (isDefaultShape) {
                        node.milestone.markerType = rule.milestoneIconName;
                        node.markerType = rule.milestoneIconName;
                        node.milestone.fill = color;
                        node.fill = color;
                        node.milestone.imageUrl = "";
                        node.stroke = node.defaultStroke;
                    } else {
                        if (isCustomImageType) {
                            node.milestone.fill = color;
                            node.stroke = node.defaultStroke;
                            node.fill = color;
                        }
                    }
                }
            }
        }
    }

    private applyToMarker(rule, node, color) {       
        if (this.evaluateMilestoneRule(rule, node)) {
            const isDefaultShape = rule.milestoneIconName !== 'default';
            const isCustomImageType = node.type !== IMAGE_URL;
            if (!rule.isCustomImage) {
                if (isDefaultShape) {
                    node.type = rule.milestoneIconName;
                    node.fill = color;
                    node.imageSource = "";
                    node.stroke = node.defaultStroke;
                } else {
                    if (isCustomImageType) {
                        node.fill = color;
                        node.stroke = node.defaultStroke;
                    }
                }
            } else {
                if (rule.image) {
                    const imageSource = rule.image;
                    node.type = "image-url";
                    node.imageUrl = imageSource;
                    node.imageSource = imageSource;
                    node.fill = { src: imageSource };
                    node.stroke = 'none';
                } else {
                    if (isDefaultShape) {
                        node.type = rule.milestoneIconName;
                        node.fill = color;
                        node.imageSource = "";
                        node.stroke = node.defaultStroke;
                    } else {
                        if (isCustomImageType) {
                            node.fill = color;
                            node.stroke = node.defaultStroke;
                        }
                    }
                }
            }
        }
    }

    private isStatusFlagPresent(rule) {
        const selectedValue = rule.appliedSection;
        if ((selectedValue || []).some(option => option.value == 'statusFlag')) {
            this.statusFlagPresentMeasures[rule.highlighedMeasure] = true;
        }
    }

    public getStatusFlagPresentMeasures() {
        return this.statusFlagPresentMeasures;
    }

    private applyToSelectedColumn(rule, node, color) {
        const selectedValue = rule.appliedSection;
        if (!((selectedValue || []).some(option => option.value == 'dataGrid'))) return;
        const displayColumns = [...(node.displayColumnsMeasure || []), ...(node.displayColumns || [])];
        rule.selectedColumnsMeasures.forEach(selectedColumnMeasure => {
            if (selectedColumnMeasure.value == 'name') {
                node['taskNameCfColor'] = color;
            } else if (node.othersCfColor && selectedColumnMeasure.value == 'actualDurationInternal') {
                node.othersCfColor['actualDurationInternal'] = color;
            } else if (node.othersCfColor && selectedColumnMeasure.value == 'plannedDurationInternal') {
                node.othersCfColor['plannedDurationInternal'] = color;
            } else if (node.othersCfColor && selectedColumnMeasure.value == 'idInternal') {
                node.othersCfColor['idInternal'] = color;
            } else {
                const selectedColumn = displayColumns.find(displayColumn => displayColumn.name == selectedColumnMeasure.value);
                selectedColumn && (selectedColumn['cfColor'] = color);
            }
        });
    }

    private applyToStatusFlag(rule, node, color) {
        const selectedValue = rule.appliedSection;
        if (!(((selectedValue || []).some(option => option.value == 'statusFlag'))) || !node.displayMeasure) return;
        const displayMeasure = node.displayMeasure.find(displayMeasure => displayMeasure.id == rule.highlighedMeasure);
        if (!displayMeasure) return;
        displayMeasure['color'] = color;
        displayMeasure['icon'] = rule.icon == null ? '\uE7C1' : rule.icon;
    }



    private checkConditions(rule, node) {
        if (!(node.isMilestone || node.isMarker))
            if (rule.ruleFor == 'parent') {
                if (node.isChildren) return;
            } else if (rule.ruleFor == 'child') {
                if (!node.isChildren) return;
            }
        if (rule.conditions[0].ruleType == 'targetValue') {
            if (rule.conditions[0].enableCustom) {
                const color = this.highContrast.isHighContrast ? this.highContrast.foreground : this.applyTargetRule(rule, rule.conditions[0], node.cf[rule.highlighedMeasure]);
                node.cfColor[rule.highlighedMeasure] = color;
                this.cfAppliedMeasures[rule.highlighedMeasure] = true;
                if (node.isMilestone) {
                    this.applyToMilestone(rule, node, node.cfColor[rule.highlighedMeasure]);
                } else if (node.isMarker) {
                    this.applyToMarker(rule, node, node.cfColor[rule.highlighedMeasure]);
                } else {
                    this.applyToProgessBar(rule, node, color);
                }
                this.applyToSelectedColumn(rule, node, color);
                this.isStatusFlagPresent(rule);
                this.applyToStatusFlag(rule, node, color);
            } else {
                if (!this.colorScaleFunctionObj[rule.highlighedMeasure+rule.name])
                    this.applyColorScale(rule, rule.conditions[0]);
                node.cfColor[rule.highlighedMeasure] = this.colorScaleFunctionObj[rule.highlighedMeasure+rule.name](node.cf[rule.highlighedMeasure]);
                const ruleColor = this.highContrast.isHighContrast ? this.highContrast.foreground : node.cfColor[rule.highlighedMeasure];
                this.cfAppliedMeasures[rule.highlighedMeasure] = true;
                if (node.isMilestone) {
                    this.applyToMilestone(rule, node, ruleColor);
                } else if (node.isMarker) {
                    this.applyToMarker(rule, node, ruleColor);
                } else {
                    this.applyToProgessBar(rule, node, ruleColor);
                }
                this.applyToSelectedColumn(rule, node, ruleColor);
                this.isStatusFlagPresent(rule);
                this.applyToStatusFlag(rule, node, ruleColor);
            }
        } else {
            const conditionList = rule.conditions.map(condition => {
                if (Object.keys(node.cf).indexOf(condition.basedOn) == -1) {
                    return false;
                }
                const key = condition.basedOn,
                    value = node.cf[key],
                    formattedValues = node.cfFormattedValues[key];
                switch (condition.ruleType) {
                    case 'singleMeasure':
                        return this.checkSingleMeasure(condition, key, value, node);
                    case 'measureCalculation':
                        return this.checkMeasureCalculation(condition, key, value, node);
                    case 'dimension':
                        return this.checkDimension(condition, key, value, formattedValues);

                }
            });
            const ruleSatisfied = conditionList.reduce((previous, current) => {
                switch (rule.conditionalOperator) {
                    case 'or': return (previous || current);
                    case 'and': return (previous && current);
                    case 'not': return (previous && !current);
                }
            });
            if (ruleSatisfied) {
                const ruleColor = this.highContrast.isHighContrast ? this.highContrast.foreground : rule.color;
                node.cfColor[rule.highlighedMeasure] = ruleColor;
                node.cfIcon[rule.highlighedMeasure] = rule.icon;
                this.cfAppliedMeasures[rule.highlighedMeasure] = true;
                if (node.isMilestone) {
                    this.applyToMilestone(rule, node, node.cfColor[rule.highlighedMeasure]);
                } else if (node.isMarker) {
                    this.applyToMarker(rule, node, node.cfColor[rule.highlighedMeasure]);
                } else {
                    this.applyToProgessBar(rule, node, ruleColor);
                }
                this.applyToSelectedColumn(rule, node, ruleColor);
                this.isStatusFlagPresent(rule);
                this.applyToStatusFlag(rule, node, ruleColor);
            }

        }
    }

    private applyColorScale(rule, condition) {
        const minMax = this.measureMinMax[rule.highlighedMeasure], colors = condition.colorScheme.colors;
        this.colorScaleFunctionObj[rule.highlighedMeasure+rule.name] = d3SelectionUtils.QUANTILE().domain([minMax.min, minMax.max]).range(colors);
    }

    private applyTargetRule(rule, condition, value) {
        let color;
        rule.conditions[0].targetValue.forEach(range => {
            const from = <any>range.from === "" ? -Infinity : range.from;
            const to = <any>range.to === "" ? +Infinity : range.to;
            if (from <= to) {
                if (this.compare("<>", value, from, to)) {
                    color = range.color;
                }
            }
        });
        return color;
    }

    private checkSingleMeasure(rule: any, key, value, node): boolean {
        if (rule.operator === "<>") {
            if (rule.valueType === "value") {
                if (rule.fromMeasure && rule.toMeasure) {
                    const fromValue = node.cf[rule.fromMeasure];
                    const toValue = node.cf[rule.toMeasure];
                    if (fromValue && toValue && this.compare(rule.operator, value, <number>fromValue, <number>toValue)) {
                        return true;
                    }
                }
            } else if (rule.valueType === "static") {
                const from = <any>rule.from === "" ? -Infinity : rule.from;
                const to = <any>rule.to === "" ? +Infinity : rule.to;
                if (this.compare(rule.operator, value, from, to)) {
                    return true;
                }
            } else {
                let fromValue, toValue;
                if (rule.dynamicFrom) {
                    fromValue = this.getDataFromSelection(rule.dynamicFrom);
                } else {
                    fromValue = -Infinity
                }
                if (rule.dynamicTo) {
                    toValue = this.getDataFromSelection(rule.dynamicTo);
                } else {
                    toValue = +Infinity;
                }
                if (this.compare(rule.operator, value, fromValue, toValue)) {
                    return true;
                }
            }
        } else {
            if (rule.valueType === "static") {
                if (this.compare(rule.operator, value, rule.comparisonValue)) {
                    return true;
                }
            } else {
                if (rule.dynamicComparisonValue) {
                    const compareValue = this.getDataFromSelection(rule.dynamicComparisonValue);
                    if (this.compare(rule.operator, value, compareValue)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private checkMeasureCalculation(rule: any, key, value, node): boolean {
        let calculationMeasure1Data,
            calculationMeasure2Data;

        const calculationMeasureData = node.cf[rule.comparisionMeasure];

        if (rule.calculationType1 === 'measure') {
            calculationMeasure1Data = node.cf[rule.calculationMeasure1];
        } else if (rule.calculationType1 === 'selection') {
            if (Array.isArray(rule.calculationSelection1) && rule.calculationSelection1[0]) {
                calculationMeasure1Data = this.getDataFromSelection(rule.calculationSelection1);
            }
        } else {
            calculationMeasure1Data = rule.calculationValue1;
        }

        if (rule.calculationType2 === 'measure') {
            calculationMeasure2Data = node.cf[rule.calculationMeasure2];
        } else if (rule.calculationType2 === 'selection') {
            if (Array.isArray(rule.calculationSelection2) && rule.calculationSelection2[0]) {
                calculationMeasure2Data = this.getDataFromSelection(rule.calculationSelection2);
            }
        } else {
            calculationMeasure2Data = rule.calculationValue2;
        }

        if (calculationMeasure1Data !== undefined && calculationMeasure2Data !== undefined) {
            let calculationOperator = rule.calculationOperator;
            if (rule.calculationOperator === '.') {
                calculationMeasure2Data = 0;
                calculationOperator = '+';
            }
            const calculatedValue = this.calculate(calculationOperator, calculationMeasure1Data, calculationMeasure2Data);
            if (this.compare(rule.operator, calculationMeasureData, calculatedValue)) {
                return true;
            }
        }
        return false;
    }


    private checkDimension(rule: any, key, value, formattedValues) {
        if (!this.dataView.categorical.dimensions) {
            return;
        }
        const categories = this.dataView.metadata.dimensions.find(categories => categories.name == rule.dimension);
        const dimension = this.dataView.categorical.dimensions.find(categories => categories.name == rule.dimension);
        let categoryName = value;
        const formattedCategoryName = formattedValues;
        let notCondition = false;
        if (rule.aggregationType.indexOf("not") >= 0) {
            notCondition = true;
        }
        if (rule.aggregationType.indexOf("includes") >= 0) {
            let dimensionMembers = rule.dimensionMembers.map(member => member.key);
            if (categories && categories.format) {
                dimensionMembers = dimensionMembers.map(member => {
                    if (member && typeof member === 'string') {
                        return this.manualDateCheck(member);
                    }
                    return member;
                });
                if (typeof categoryName === 'string') {
                    categoryName = this.manualDateCheck(categoryName);
                }
            }
            if (categoryName !== undefined) {
                return this.checkIncludes(dimensionMembers, categoryName, notCondition);
            }
        } else if (rule.aggregationType.indexOf("startswith") >= 0) {
            if (categoryName !== undefined) {
                return this.checkStartsWith(categoryName, rule.comparisonText, notCondition) ||
                    this.checkStartsWith(formattedCategoryName, rule.comparisonText, notCondition);
            }
        } else if (rule.aggregationType.indexOf("endswith") >= 0) {
            if (categoryName !== undefined) {
                return this.checkEndsWith(categoryName, rule.comparisonText, notCondition) ||
                    this.checkEndsWith(formattedCategoryName, rule.comparisonText, notCondition);
            }
        } else if (rule.aggregationType.indexOf("contains") >= 0) {
            if (categoryName !== undefined) {
                return this.checkContains(categoryName, rule.comparisonText, notCondition) ||
                    this.checkContains(formattedCategoryName, rule.comparisonText, notCondition);
            }
        }

        else if (['>', '<', '==', '!='].indexOf(rule.aggregationType) != -1) {
            // const value2 = rule.dimensionAsMeasureComparsionSelectType == 'custom' ? moment(rule.dimensionAsMeasureComparsionDate).valueOf() : moment().valueOf();
            // return this.compareDimensionMeasure(rule.aggregationType, categoryName == 'current' ? moment().valueOf() : moment(categoryName).valueOf(), value2);
            const value2 = rule.dimensionAsMeasureComparsionSelectType == 'custom' ? this.getUTCTimeStamp(moment(rule.dimensionAsMeasureComparsionDate)) : this.getUTCTimeStamp(moment());
            return this.compareDimensionMeasure(rule.aggregationType, categoryName == 'current' ? this.getUTCTimeStamp(moment()) : this.getUTCTimeStamp(moment(categoryName)), value2);
        } else {
            let dimensionMembers, dimensionMembersCount;
            if (dimension && dimension.values) {
                dimensionMembers = dimension.values;
            }
            if (dimensionMembers) {
                if (rule.aggregationType === "count") {
                    dimensionMembersCount = dimensionMembers.length;
                } else {
                    dimensionMembersCount = this.getDistinctElement(dimensionMembers).length;
                }
                if (this.compare(rule.countOperator, dimensionMembersCount, rule.count)) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        return false;
    }

    getDistinctElement(inputArray) {
        if (Array.isArray(inputArray)) {
            return inputArray.filter((item, pos) => inputArray.indexOf(item) === pos);
        }
        return [];
    }

    manualDateCheck(value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return value;
        }
        return date.getTime();
    }

    checkContains(value, target, notCondition) {
        value = String(value).toLowerCase()
        target = String(target).toLowerCase();
        if (notCondition === false && value.indexOf(target) >= 0) {
            return true;
        }
        if (notCondition === true && value.indexOf(target) === -1) {
            return true;
        }
        return false;
    }

    checkIncludes(members, value, notCondition) {
        if (notCondition === false && members.indexOf(value) >= 0) {
            return true;
        }
        if (notCondition === true && members.indexOf(value) === -1) {
            return true;
        }
        return false;
    }

    checkEndsWith(value, target, notCondition) {
        value = String(value).toLowerCase()
        target = String(target).toLowerCase();

        if (notCondition === false && value.substr(-target.length) === target) {
            return true;
        }
        if (notCondition === true && value.substr(-target.length) !== target) {
            return true;
        }
        return false;
    }

    checkStartsWith(value, target, notCondition) {
        value = String(value).toLowerCase()
        target = String(target).toLowerCase();

        if (notCondition === false && value.indexOf(target) === 0) {
            return true;
        }
        if (notCondition === true && value.indexOf(target) !== 0) {
            return true;
        }
        return false;
    }

    private getDataFromSelection(selection: any) {
        if (!selection) {
            return null;
        }
        const selectionValue = DataSelection.GET_SELECTION_VALUE(this.dataView, selection, true);
        if (selectionValue && selectionValue[0] && selectionValue[0].measures &&
            selectionValue[0].measures[0]) {
            return selectionValue[0].measures[0].values[0];
        }
        return null;
    }

    private compareDimensionMeasure(operator: string, value: number, compare: number) {
        switch (operator) {
            case ">":
                return value > compare;
            case ">=":
                return value >= compare;
            case "<":
                return value < compare;
            case "<=":
                return value <= compare;
            case "==":
                return value === compare;
            case '!=':
                return value !== compare;
        }
    }

    private getUTCTimeStamp(dateObj: any): number {
        return Date.UTC(dateObj.year(), dateObj.month(), dateObj.date(), dateObj.hours(), dateObj.minutes(), dateObj.seconds());
    }

    private compare(operator: string, value: number, compare: number, compare2?: number): boolean {
        const decimalParts = String(compare).split(".")[1];
        let noOfDecimal = 2;
        if (decimalParts) {
            noOfDecimal = decimalParts.length;
        }
        value = Number(Number(value).toFixed(noOfDecimal));
        compare = Number(Number(compare).toFixed(noOfDecimal));
        compare2 = Number(Number(compare2).toFixed(noOfDecimal));
        switch (operator) {
            case ">":
                return value > compare;
            case ">=":
                return value >= compare;
            case "<":
                return value < compare;
            case "<=":
                return value <= compare;
            case "==":
                return value === compare;
            case '!=':
                return value !== compare;
            case "<>":
                return value >= compare && value <= compare2;
        }
        return;
    }

    private calculate(operator: string, value1: number, value2: number): number {
        switch (operator) {
            case '+':
                return value1 + value2;
            case '-':
                return value1 - value2;
            case '*':
                return value1 * value2;
            case '/':
                return value1 / value2;
        }
    }
}