import { test, type TestDetailsAnnotation } from "@playwright/test";

const noCredPrefillAnnotation: TestDetailsAnnotation = {
  type: "no-cred-prefill",
  description: "Suppresses the default credential prefill allowing for credentials dialog testing",
};

export const AnnotationNoCredPrefill = { annotation: noCredPrefillAnnotation };

export const credentialsTest = test.extend<{ prefillCredentials: void }>({
  prefillCredentials: [async ({ page }, use, testInfo) => {
    if (!testInfo.annotations.some(a => a.type === 'no-cred-prefill')) {
      await page.addInitScript(() => {
        localStorage.setItem('myko-auth-key', 'test-secret-key')
        localStorage.setItem('myko-cred-email', 'player@example.com')
        localStorage.setItem('myko-cred-password', 'hunter2')
      })
    }
    await use()
  }, { auto: true }],
});
