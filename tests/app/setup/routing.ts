import { test, Route, Request } from "@playwright/test";


const PROXY_BASE = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/**'

export const wordlyTest = test.extend<{world: World}>({
  world: [async ({ page }, use) => {
    page.route(PROXY_BASE, (route: Route, request: Request)=> {
        return route.fulfill({
            status: 505,
            json: {
                message: `Route ${request.method} ${request.url} isn't implemented`
            }
        })
    })

    await use(new World());
  }, { auto: true }],
});

class World {

}