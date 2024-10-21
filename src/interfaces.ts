

export interface Color {
    fill: string;
}
export interface Task {
    id: number | string;
    name: string;
    actualStart: string;
    actualEnd: string;
    parent: string;
    children: string[];
    progressValue: string;
    actualKey: string;
    rowHeight: number;
    progress: Color;
    dimensionKey: any;
}
export interface Data {
    name: string;
    data: any[];
    // data: PrimitiveValue[];
    key: string;
    conditionalFormatting: any;
}
export interface GroupedTask {
    id: number;
    name: string;
    tasks: Task[];
}
export interface GanttViewModel {
    dataView: DataView;
    tasks: Task[];
    isDurationFilled: boolean;
}

export interface JSONArrayDef {
    taskName: any[],
    actualStartDate: any[],
    actualEndDate: any[],
    duration: any[],
    progressValue: any[],
    progressBase: any[],
    plannedStartDate: any[],
    plannedEndDate: any[],
    primaryConnectTo: any[],
    primaryConnectorType: any[],
    secondaryConnectTo: any[],
    secondaryConnectorType: any[],
    displayColumn: any[],
    displayMeasures: any[],
    milestones: any[],
    milestoneType: any[],
    dataLabel: any[],
    tooltips: any[],
    referenceStartDate: any[],
    referenceEndDate: any[],
    referenceText: any[],
    taskID: any[]
}

export interface MilestoneConfig {
    generalConfig: {
        mileStoneFromData: boolean,
        milestoneType: string,
        enablePreview: boolean,
        configurationFrom: string,
        configurationTypeMileStone: string,
        milestoneLegend: boolean,
        milestoneName: string,
        isCustomImage: boolean
    },
    singleConfig: {
        milestoneBorderColor: string,
        milestoneFillColor: string,
        milestoneShape: string,
        milestoneIconName: string,
        image: string,
        imageName: string
    },
    dataLabelConfig: {
        isEnabled: boolean,
        configureBasedOn: string,
        dataLabels: any;
    },
    milestoneNameFieldConfig: any,
    milestoneFieldConfig: any,
    isMigrated: boolean
}

export interface DynamicSummaryTableField {
    actualStart: number[],
    actualEnd: number[],
    baselineStart: number[],
    baselineEnd: number[],
    progressValue: number[]
}

export interface Reference {
    name: string,
    enabled: boolean,
    label: string,
    dateType: string,
    date1Type: string,
    date2Type: string,
    date1Custom: string,
    date2Custom: string,
    color: string,
    enableBackgroundColor: boolean,
    enableMarkerText: boolean,
    backgroundColor: '#e3e8e8',
    textFontWeight: boolean,
    displayOptions: {
        line: boolean,
        text: boolean,
    },
    lineType: string,
    lineStroke: number,
    hAlign: number,
    vAlign: number,
    rotation: number,
    patternType: string,
    textColor: string,
    bgRangeTextEnabled: boolean,
    rangeMarkerTextColor: string,
    rangeColor: string,
    utcSign: string,
    utcHour: string,
    utcMin: string
}