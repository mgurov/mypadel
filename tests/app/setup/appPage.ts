import { expect, type Locator, type Page, type Response } from "@playwright/test";

export class AppPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  get fetchButton(): Locator {
    return this.page.getByRole('button', { name: 'Fetch Events' })
  }

  get userChip(): Locator {
    return this.page.getByTestId('user-elo-chip')
  }

  get authError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /^Cookie auth failed/ })
  }

  async fetchEvents() {
    await this.fetchButton.click()
  }

  async fetchAndWaitFor(urlPart: string): Promise<Response> {
    const response = this.page.waitForResponse(r => r.url().includes(urlPart))
    await this.fetchEvents()
    return response
  }

  async expectElo(elo: string) {
    await expect(this.userChip).toContainText(elo)
  }
}
