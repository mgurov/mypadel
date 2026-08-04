import { test, type TestDetailsAnnotation } from "@playwright/test";
import { defaultAuth } from "./wordlyTest";

const noCredPrefillAnnotation: TestDetailsAnnotation = {
  type: "no-cred-prefill",
  description: "Suppresses the default credential prefill allowing for credentials dialog testing",
};

export const AnnotationNoCredPrefill = { annotation: noCredPrefillAnnotation };

export const credentialsTest = test.extend<{ prefillCredentials: void }>({
  prefillCredentials: [async ({ page }, use, testInfo) => {
    if (!testInfo.annotations.some(a => a.type === 'no-cred-prefill')) {
      await page.addInitScript((defaults) => {
        localStorage.setItem('myko-auth-key', defaults.authKey)
        localStorage.setItem('myko-cred-email', defaults.email)
        localStorage.setItem('myko-cred-password', defaults.password)
        localStorage.setItem('m_access_token', defaults.accessToken)
        localStorage.setItem('m_refresh_token', defaults.refreshToken)
      }, {
        authKey: 'test-secret-key',
        email: defaultAuth.email,
        password: defaultAuth.password,
        accessToken: defaultAuth.accessToken,
        refreshToken: defaultAuth.refreshToken,
      })
    }
    await use()
  }, { auto: true }],
});
