export const ProProperties = () => [
    getShowProProperty()
];


function getShowProProperty() {
    return {
        "section": 'chartOptions',
        "name": 'showLicensePopUp',
        "checkUsage": (value: string) => {
            if (value === 'true') return true;
            return false;
        }
    }
}