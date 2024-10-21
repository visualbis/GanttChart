import powerbiVisualsApi from "powerbi-visuals-api";
import { VisualSettings } from "../settings";
import FabricIconsLists from "@visualbi/bifrost-editor-rx/dist/components/iconpicker/MilestoneIcons.json";
import DataView = powerbiVisualsApi.DataView;

export enum MigrationVersions {
    v3_1_0 = "v3_1_0",
    v3_2_0_x = "v3_2_0_x", // Handling flexible versions like v3.2.0.x
}

type IMigrationHandler = Record<string, IMigrationSection>;
type TProperty = string | boolean | number;
type IMigrationSection<T = any> = Record<keyof T, (property: TProperty, settings?: VisualSettings, data?: DataView[]) => TProperty>;
type IMigrationHandlerCollection = Record<MigrationVersions, IMigrationHandler>;

export default class MigrationHandlers {

    static GET_HANDLERS(): IMigrationHandlerCollection {
        return {
            [MigrationVersions.v3_1_0]: MigrationHandlers.GET_MIGRATION_HANDLER_SETTING(),
            [MigrationVersions.v3_2_0_x]: MigrationHandlers.HANDLE_MIGRATION_SETTINGS(),
        };
    }

    static GET_MIGRATION_HANDLER_SETTING(): IMigrationHandler {
        const FabricIconsList = FabricIconsLists;
        const icons = FabricIconsList.icons;
        return {
            editor: <IMigrationSection<any>>{
                milestones: (settings: string, visualSettings: VisualSettings) => {
                    if (!visualSettings.editor.milestones) {
                        return;
                    }
                    const milestoneConfig = JSON.parse(visualSettings.editor.milestones);
                    const milestoneShape = milestoneConfig.singleConfig.milestoneShape;
                    const milestoneIcon = icons.find(icon => icon.name === milestoneShape);
                    if (!milestoneIcon) {
                        return;
                    }

                    function replaceMilestoneShape(obj) {
                        for (const [key, value] of Object.entries(obj)) {
                            if (typeof value === "object" && value !== null) {
                                // If the value is an object, recursively call the function
                                replaceMilestoneShape(value);
                            } else if (key === "milestoneShape") {
                                const milestoneIconList = icons.find(icon => icon.name === value);

                                // If the key is 'milestoneShape', replace the value with 'unicode' & add 'IconName'
                                obj[key] = milestoneIconList.unicode;
                                obj['milestoneIconName'] = milestoneIconList.name;
                            }
                        }
                    }

                    replaceMilestoneShape(milestoneConfig);
                    return JSON.stringify(milestoneConfig);
                },
                conditionalformatting: (settings: string, visualSettings: VisualSettings, data: DataView[]) => {
                    if (!visualSettings.editor.conditionalformatting) {
                        return;
                    }
                    const rules = JSON.parse(visualSettings.editor.conditionalformatting);

                    const actualStart = data[0].categorical.categories.filter(values => values.source.roles.actualStart).map(val => val.values)[0];
                    const actualEnd = data[0].categorical.categories.filter(values => values.source.roles.actualEnd).map(val => val.values)[0];
                    let isMilestoneInData = undefined;
                    if (actualStart && actualEnd) {
                        for (let index = 0; index < actualStart.length; index++) {
                            if (actualEnd[index] == actualStart[index]) {
                                isMilestoneInData = true;
                            }
                        }
                    }

                    rules.forEach(rule => {
                        rule['showInLegend'] = rule['showInLegend'] ? rule['showInLegend'] : false;
                        const milestoneShape = rule.milestoneShape;
                        const milestoneIcon = icons.find(icon => icon.name === milestoneShape);
                        const appliedSectionValues = rule.appliedSection.length > 0 ? rule.appliedSection.map((v) => v.value) : [];
                        rule.milestoneIconName = milestoneIcon?.name;
                        if (milestoneIcon?.unicode) {
                            rule.milestoneShape = milestoneIcon.unicode;
                        } else {
                            rule.milestoneShape = "\uF133";
                        }

                        if (isMilestoneInData && !appliedSectionValues?.includes('milestone')) {
                            rule.appliedSection.push({
                                value: 'milestone',
                                label: 'Milestone',
                            });
                        }
                    });
                    return JSON.stringify(rules);
                },
            },
        };
    }

    static HANDLE_MIGRATION_SETTINGS(): IMigrationHandler {
        const getMigrationSettingsLength = (visualSettings: VisualSettings): number => {
            const migrationSettings = JSON.parse(visualSettings.migration.migrationSettings);
            return Object.keys(migrationSettings).length;
        };
        return {
            chartOptions: <IMigrationSection<any>>{
                equalBarHeight: (propertyValue: boolean, visualSettings: VisualSettings) => {
                    const equalBarHeight = visualSettings.chartOptions.equalBarHeight;
                    const migrationSettingsLength = getMigrationSettingsLength(visualSettings);
                    return migrationSettingsLength > 1 ? equalBarHeight : false;
                },
            },
            miscellaneous: <IMigrationSection<any>>{
                individualTooltip: (propertyValue: boolean, visualSettings: VisualSettings) => {
                    const individualTooltip = visualSettings.miscellaneous.individualTooltip;
                    const migrationSettingsLength = getMigrationSettingsLength(visualSettings);
                    return migrationSettingsLength > 1 ? individualTooltip : false;
                },
            },
        };
    }

}
