import { test, Route, Request } from "@playwright/test";

const PROXY_BASE = '**/dev-proxy'

export const wordlyTest = test.extend<{world: World}>({
  world: [async ({ page }, use) => {
    await page.route(PROXY_BASE + "/**", (route: Route, request: Request)=> {
        return route.fulfill({
            status: 505,
            json: {
                message: `the route ${request.method()} ${request.url()} isn't routed`
            }
        })
    })

    await use(new World());
  }, { auto: true }],
});

class World {

}