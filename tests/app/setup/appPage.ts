import { expect, type Locator, type Page, type Response } from "@playwright/test";

export class AppPage {
  constructor(private readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path)
  }

  get fetchButton(): Locator {
    return this.page.getByTestId('fetch-events-button')
  }

  get userChip(): Locator {
    return this.page.getByTestId('user-elo-chip')
  }

  get eloHistoryPage(): Locator {
    return this.page.getByTestId('elo-history-page')
  }

  get eloHistoryRows(): Locator {
    return this.eloHistoryPage.getByTestId('elo-history-row')
  }

  get eloHistoryDeltas(): Locator {
    return this.eloHistoryPage.getByTestId('elo-history-delta')
  }

  get authError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /^Cookie auth failed/ })
  }

  async fetchEvents() {
    await this.fetchButton.click()
  }

  async openEloHistory() {
    await this.userChip.click()
    await expect(this.page).toHaveURL(/\/elo-history$/)
  }

  async clickEloHistoryRow(index: number) {
    await this.eloHistoryRows.nth(index).click()
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
