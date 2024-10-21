import { IUtilityOptions } from '@visualbi/bifrost-powerbi/dist/types/UtilityMenu';
import { GanttChart } from './GanttChart';
import { VisualSettings } from "./settings";

export class UtilityMenu {
    public static GET_UTILITY_MENU_CONFIG(instance: GanttChart, settings: VisualSettings): IUtilityOptions[] {
        const utilityMenuConfig: IUtilityOptions[] = [];
        if (instance.settings.utilityMenu.isTooltip) {
            utilityMenuConfig.push(...UtilityMenu.GET_TOOLTIP_OPTIONS(instance, settings));
        }
        if (instance.settings.utilityMenu.isLevels) {
            utilityMenuConfig.push(...UtilityMenu.GET_LEVELS(instance));
        }

        return utilityMenuConfig;
    }

    public static GET_TOOLTIP_OPTIONS(instance: GanttChart, settings: VisualSettings): IUtilityOptions[] {
        return [
            {
                key: 'select',
                displayName: 'Enable/Disable Tooltip',
                icon: "",
                type: 'selectable',
                disabled: false,
                binding: {
                    sectionName: "utilityMenuAction",
                    propertyName: "isTooltipEnabled",
                },
                afterClick: () => {
                    const updatedValues = {
                        isTooltipEnabled: !settings.utilityMenuAction.isTooltipEnabled
                    };
                    if (!updatedValues.isTooltipEnabled) {
                        (<any>instance).host.tooltipService.hide({
                            isTouchEvent: instance._isPBIMobile,
                            immediately: true,
                        });
                    }
                    (<any>instance).host.persistProperties({
                        merge: [
                            {
                                objectName: 'utilityMenuAction',
                                properties: updatedValues
                            },
                        ],
                    });
                    return {
                        replaceIcon: false,
                        utilityAction: 'NONE',
                    };
                },
            },
        ];
    }

    public static GET_LEVELS(instance: GanttChart): IUtilityOptions[] {
        const hideParentBarOnCollapse = instance.settings.chartOptions.hideParentOnCollapse;
        const hideParentBarOnExpand =  instance.settings.chartOptions.hideParentOnExpand;                
        return [
            {
                key: 'levels',
                displayName: 'Levels',
                icon: 'icon icon--DOM',
                type: 'dropdown',
                children: [
                    {
                        key: 'collapse',
                        displayName: 'Collapse All',
                        icon: 'icon icon--CollapseAll',
                        type: 'clickable',
                        binding: {
                            sectionName: 'utilityMenu',
                            propertyName: 'isCollapse',
                        },
                        afterClick: () => {
                            this.CHECK_FOR_HIDE_PARENT(instance.chart, hideParentBarOnCollapse, hideParentBarOnExpand, true); 
                            instance.chart.collapseAll();
                            return {
                                replaceIcon: false,
                                utilityAction: 'NONE',
                            };
                        },
                    },
                    {
                        key: 'expand',
                        displayName: 'Expand All',
                        icon: 'icon icon--ExpandAll',
                        type: 'clickable',
                        binding: {
                            sectionName: 'utilityMenu',
                            propertyName: 'isExpand',
                        },
                        afterClick: () => {
                            this.CHECK_FOR_HIDE_PARENT(instance.chart, hideParentBarOnCollapse, hideParentBarOnExpand, false); 
                            instance.chart.expandAll();
                            return {
                                replaceIcon: false,
                                utilityAction: 'NONE',
                            };
                        },
                    },
                    {
                        key: 'default',
                        displayName: 'Revert to Default',
                        icon: 'icon icon--ArchiveUndo',
                        type: 'clickable',
                        binding: {
                            sectionName: 'utilityMenu',
                            propertyName: 'isDefault',
                        },
                        afterClick: () => {
                            if (instance.count > 0) {
                                instance.chart.collapseAll();
                                if (instance.settings.dataGrid.expandTillLevel !== 0) {
                                    instance.currentArray.forEach((key) => {
                                        instance.chart.expandTask(key);
                                    });
                                }
                            } else if (instance.count === 0 && instance.settings.dataGrid.expandTillLevel === 0) {
                                instance.chart.expandAll();
                            }
                            return {
                                replaceIcon: false,
                                utilityAction: 'NONE',
                            };
                        },
                    },
                ],
            },
        ];
    }

    public static CHECK_FOR_HIDE_PARENT (chart: any, hideParentBarOnCollapse: boolean, hideParentBarOnExpand: boolean, isCollapsedAll: boolean) {
        const parentTasks = chart.data().getChildren();
        
        if((hideParentBarOnCollapse && isCollapsedAll) || (hideParentBarOnExpand && !isCollapsedAll)){
            const minTime = chart.xScale().getTotalRange().min;
            const maxTime = chart.xScale().getTotalRange().max;
            chart.getTimeline().scale().minimum(minTime);
            chart.getTimeline().scale().maximum(maxTime);
            
            parentTasks.forEach((item) =>{
                item['actualStartBk'] = item.get('actualStart');
                item['actualEndBk'] = item.get('actualEnd');
                item.set('actualStart',0);
                item.set('actualEnd',0);
                item['isCollapses'] = true;
            });
        }
        else{
            parentTasks.forEach((item) =>{
                if(item['actualStartBk'] && item['actualEndBk']){
                    item.set('actualStart', item['actualStartBk']);
                    item.set('actualEnd', item['actualEndBk']);
                }
                item.set('isCollapses', false);
            });
        }
    }
}
