// #CHECKWITHTEAM Where should we get the license url ?
export const CONFIG = {
    gantt_chart: {
        dev: {
            guid: 'GanttChart4C3653EFFFEB4E7DA5A699CE198391E2',
            PUBLIC_KEY: `SXMbpC5b2VmpIGwGtNba3JgBXnZ0p8cDAU7FcWyp400=`,
            SECRET_KEY: `s2cPhM0+JhhVyXJmEJfoHO1ssLOjKLRNCNXXMYCcn8dJcxukLlvZWakgbAa01trcmAFednSnxwMBTsVxbKnjTQ==`,
            PRODUCT_PRICING_URL: `https://xviz.com/pricing/`,
            LICENSE_URL: `https://turing-qa.inforiver.com/v1/visual/tenant/license-hash/`, // #CHECKWITHTEAM Changed the url from valq to inforiver
            CONTENT_ACCESS: [`https://*`],
        },
        qa: {
            guid: 'GanttChart4C3653EFFFEB4E7DA5A699CE198391E2',
            PUBLIC_KEY: `ZCBoXWRmBX6qfU8LT2Ae1orbI9ugEMyboDOcIKYA8Mg=`,
            SECRET_KEY: `onkHgqK0UUQHhhHH17RHj2uB/MIwBO2HwVRzBl0JUQtkIGhdZGYFfqp9TwtPYB7Witsj26AQzJugM5wgpgDwyA==`,
            PRODUCT_PRICING_URL: `https://xviz.com/pricing/`,
            LICENSE_URL: `https://turing-qa.inforiver.com/v1/visual/tenant/license-hash/`,
            CONTENT_ACCESS: [`https://*`],
        },
        prod: {
            appsource: {
                guid: 'GanttChart4C3653EFFFEB4E7DA5A699CE198391E2',
                PUBLIC_KEY: `Pe95xPP1edGY6smSiBfWu5Yc2gjvV0no+3w+by3O3Tc=`,
                SECRET_KEY: `lUI9yKp0NdKJKq3TcQb2BMWa1Ismhku0EpCM8EYiHSk973nE8/V50ZjqyZKIF9a7lhzaCO9XSej7fD5vLc7dNw==`,
                PRODUCT_PRICING_URL: `https://xviz.com/pricing/`,
                LICENSE_URL: `https://license.inforiver.com/v1/visual/tenant/license-hash/`,
                CONTENT_ACCESS: [],
            },
            webstore: {
                guid: 'DesktopGanttChart4C3653EFFFEB4E7DA5A699CE198391E2',
                PUBLIC_KEY: `Pe95xPP1edGY6smSiBfWu5Yc2gjvV0no+3w+by3O3Tc=`,
                SECRET_KEY: `lUI9yKp0NdKJKq3TcQb2BMWa1Ismhku0EpCM8EYiHSk973nE8/V50ZjqyZKIF9a7lhzaCO9XSej7fD5vLc7dNw==`,
                PRODUCT_PRICING_URL: `https://xviz.com/pricing/`,
                LICENSE_URL: `https://license.inforiver.com/v1/visual/tenant/license-hash/`,
                CONTENT_ACCESS: [`https://*`],
            },
        },
    }
};
