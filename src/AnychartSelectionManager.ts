import { SelectionIdBuilder } from '@visualbi/bifrost-powerbi/dist/SelectionIdBuilder';

export class AnychartSelectionManager {
    private selectedPointCount: number;
    private selectionIdBuilder: SelectionIdBuilder;
    private grouping: boolean;

    constructor(selectionIdBuilder: SelectionIdBuilder, isGrouping?: boolean) {
        this.selectedPointCount = 0;
        this.grouping = isGrouping === undefined ? true : isGrouping;
        this.selectionIdBuilder = selectionIdBuilder;
    }

    public select = (selctionId, isMultiple: boolean = false) => {
        if (!isMultiple)
            this.clearSelection(); // Clear selections since row deselection from anychart is not available
        this.selectionIdBuilder.select(selctionId, isMultiple);
        //     .then((ids: ISelectionId[]) => {
        //      console.log(ids);
        // });
    }

    public clearSelection = () => {
        this.selectionIdBuilder.clear();
    }


    public getSelectionIdsGanttResource(node, period, selectionIds) {
        if (period) {
            return period.selectionId;
        } else if (node.numChildren() > 0) {
            const childNodes = node.getChildren();
            for (let i = 0; i < childNodes.length; i++) {
                if ((childNodes[i].numChildren() > 0)) {
                    this.getSelectionIdsGanttResource(childNodes[i], period, selectionIds);
                } else {
                    childNodes[i]['get']('periods').forEach(period => {
                        selectionIds.push(period.selectionId);
                    });
                }
            }
            return selectionIds;
        } else if (node['get']('periods')) {
            return node['get']('periods').map(period => period.selectionId);
        }
    }

    public getSelectionIds(node, selectionIds) {
        if (!node)
            return [];
        if (node.numChildren() > 0) {
            const childNodes = node.getChildren();
            for (let i = 0; i < childNodes.length; i++) {
                if ((childNodes[i].numChildren() > 0)) {
                    this.getSelectionIds(childNodes[i], selectionIds);
                } else {
                    const selectionId = childNodes[i]['get']('selectionId');
                    selectionIds.push(selectionId);
                }
            }
            return selectionIds;
        } else {
            return node['get']('selectionId');
        }
    }
}