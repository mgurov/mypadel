import { test, Route, Request } from "@playwright/test";

const PROXY_BASE = 'https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy'

export const wordlyTest = test.extend<{world: World}>({
  world: [async ({ page }, use) => {
    console.log('setup routing interceptor')
    await page.route(PROXY_BASE + "/**", (route: Route, request: Request)=> {
      console.log('intercepted 0.1')
        return route.fulfill({
            status: 505,
            json: {
                message: `Route ${request.method} ${request.url} isn't implemented`
            }
        })
    })

    await page.route(
      (url: URL) => {
        const matches = url.origin.includes("supabase.co");
        if (matches) {
          console.log(matches, 'evaluating', url)
        }        
        return matches;
      },
      (route: Route, request: Request)=> {
        console.log('intercepted')
        return route.fulfill({
            status: 505,
            json: {
                message: `Route ${request.method} ${request.url} isn't implemented`
            }
        })
    }
    )

    await use(new World());
  }, { auto: true }],
});

class World {

}