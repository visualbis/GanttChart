import { MigrationVersions } from "./MigrationHandlers";
import { VisualSettings } from '../settings'

type IMigrationSetting = Partial<Record<keyof VisualSettings, {
    isResolved: boolean,
}>>

export type IMigrationSettings = Record<MigrationVersions, IMigrationSetting>

const MigrationSettings: IMigrationSettings = {
    v3_1_0: {
        editor: {
            isResolved: false,
        },
    },
    v3_2_0_x: {
        chartOptions: {
            isResolved: false,
        },
        miscellaneous: {
            isResolved: false,
        },
    },
}

export default MigrationSettings;