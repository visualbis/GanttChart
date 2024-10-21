export class Util { 

    static GETSAMPLEDATA() {
        return [
            {
                id: 1,
                name: 'Phase 1 - Strategic Plan',
                progressValue: 0.14,
                actualStart: '2000-02-24',
                actualEnd: '2000-03-28T09:00'
            },
            {
                id: 2,
                name: 'Self-Assessment',
                parent: 1,
                progressValue: 0.25,
                actualStart: '2000-02-24',
                actualEnd: '2000-03-02T08:00'
            },
            {
                id: 3,
                name: 'Define business vision',
                parent: 2,
                progressValue: 0,
                actualStart: '2000-02-24T24:00',
                actualEnd: '2000-02-25T09:00',
                connectTo: 4,
                connectorType: 'finish-start'
            },
            {
                id: 4,
                name: 'Identify available skills, information and support',
                parent: 2,
                progressValue: 0,
                actualStart: '2000-02-26T00:00',
                actualEnd: '2000-02-26T09:00',
                connectTo: 5,
                connectorType: 'finish-start'
            },
            {
                id: 5,
                name: 'Decide whether to proceed',
                parent: 2,
                progressValue: 0,
                actualStart: '2000-02-29T00:00',
                actualEnd: '2000-02-29T09:00',
                connectTo: '7',
                connectorType: 'finish-start'
            },
            {
                id: 6,
                name: 'Define the Opportunity',
                parent: 1,
                progressValue: 0.27,
                actualStart: '2000-02-29',
                actualEnd: '2000-03-14T08:00'
            },
            {
                id: 7,
                name: 'Research the market and competition',
                parent: 6,
                progressValue: 0,
                actualStart: '2000-03-01T00:00',
                actualEnd: '2000-03-01T09:00'
            }
        ];
    }

    static RENDERLANDINGPAGE(chartContainer, anychart) {
        Util.EMPTYNODE(chartContainer);
        const achart: any = anychart.ganttProject();
        achart.data(Util.GETSAMPLEDATA(), "as-table");
        achart.container(chartContainer);
        // Disable datagrid
        const dataGrid = achart.dataGrid();
        dataGrid.enabled(false);
        // remove timeline header
        const timeline = achart.getTimeline();
        const header = timeline.header();
        header.level(0).enabled(false);
        header.level(1).enabled(false);
        header.level(2).enabled(false);
        // change progress color to grey scale
        const tasks = timeline.tasks();
        const progress = tasks.progress();
        progress.normal().fill("#929497");
        progress.parent().fill("#929497");
        progress.parent().stroke("#929497");
        progress.parent().stroke("#929497");
        progress.normal().fontColor("#929497");
        // disable credits
        anychart.licenseKey("visualbi-c452c63-54b6c31f"); // set licenseKey
        achart.credits().enabled(false);
        // Move splitter position to starting point
        achart.splitterPosition('0%');
        // Disable labels.
        const labels = timeline.labels();
        labels.enabled(false);
        // Disable tooltips.
        const tlTooltip = timeline.tooltip();
        tlTooltip.enabled(false);
        achart.draw();
        achart.fitAll();
        // Disable mouse events
        achart.listen("rowClick", (event) => {
            event.preventDefault();
        });
        achart.listen("rowMouseOver", (event) => {
            event.preventDefault();
        });

    }
    
    static EMPTYNODE(node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.firstChild);
        }
    }
}