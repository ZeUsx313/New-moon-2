import { test, expect } from '@playwright/test';
const backend = 'http://127.0.0.1:4174';
let token: string;
test.beforeEach(async ({ page, request }) => {
  token = (await (await request.get(backend + '/__session')).json()).token;
  await request.post(backend + '/__reset', { headers: { Authorization: `Bearer ${token}` } });
  await page.addInitScript(value => localStorage.setItem('token', value), token);
});
async function evidence(request: import('@playwright/test').APIRequestContext) {
  return (await request.get(backend + '/__evidence', { headers: { Authorization: `Bearer ${token}` } })).json();
}
test('project conversation creation → saved settings in MongoDB → browser reload', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/dashboard/translation-settings');
  await page.getByRole('button', { name: /ChatGPT Test Account/ }).click();
  await page.getByRole('button', { name: 'جلب المشاريع', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Novel project', exact: true })).toBeAttached();
  await page.getByLabel('مشروع الترجمة', { exact: false }).selectOption('novel-project');
  await page.getByLabel('رسالة التجربة').fill('Create a translation conversation in this project');
  await page.getByRole('button', { name: 'إنشاء محادثة في المشروع' }).click();
  await expect(page.getByText('وصلت الرسالة إلى الخادم وأُنشئت المحادثة بنجاح.')).toBeVisible();
  await expect(page.getByLabel('معرّف محادثة الترجمة')).toHaveValue('new-project-chat-1');
  await page.getByRole('button', { name: 'المصطلحات', exact: true }).click();
  await page.getByLabel('معرّف محادثة المصطلحات').fill('glossary-chat');
  await page.getByRole('radio', { name: 'استخدام المحادثة المختارة' }).check();
  await page.getByRole('button', { name: 'المراجعة', exact: true }).click();
  await page.getByLabel('معرّف محادثة المراجعة').fill('review-chat');
  await page.getByRole('radio', { name: 'استخدام المحادثة المختارة' }).check();
  await page.getByRole('button', { name: 'حفظ الإعدادات', exact: true }).first().click();
  await expect(page).toHaveURL(/translation-jobs$/);
  const saved = await evidence(request); const gpt = saved.settings.translationProviders.find((p: any) => p.providerId === 'chatgpt_e2e');
  expect(gpt.taskConversations.translation).toMatchObject({ projectId: 'novel-project', conversationId: 'new-project-chat-1', mode: 'reuse' });
  expect(gpt.taskConversations.glossary.conversationId).toBe('glossary-chat'); expect(gpt.taskConversations.review.conversationId).toBe('review-chat');
  expect(saved.messages[0].conversation_mode.gizmo_id).toBe('novel-project'); expect(saved.contexts.length).toBeGreaterThan(0);
  await page.goto('/dashboard/translation-settings'); await page.getByRole('button', { name: /ChatGPT Test Account/ }).click();
  await expect(page.getByLabel('معرّف محادثة الترجمة')).toHaveValue('new-project-chat-1');
  await page.getByRole('button', { name: 'المصطلحات', exact: true }).click(); await expect(page.getByLabel('معرّف محادثة المصطلحات')).toHaveValue('glossary-chat');
  expect(errors).toEqual([]); expect(await page.evaluate(() => Object.values(localStorage).some(value => String(value).includes('fake-chatgpt-session')))).toBe(false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); expect(overflow).toBe(false);
});
test('Gemini and Worker options persist through the real settings route', async ({ page, request }) => {
  await page.goto('/dashboard/translation-settings'); await page.getByRole('button', { name: /Gemini Test Account/ }).click();
  await page.getByLabel('رقم حساب Google', { exact: false }).fill('0');
  await page.getByLabel('Build label', { exact: false }).fill('verified-build');
  await page.getByLabel('ترويسة نموذج Gemini JSPB', { exact: false }).fill('[1,null,"verified-model"]');
  await page.getByLabel('معرّف محادثة الترجمة').fill('gem-conversation');
  await page.getByLabel('Response ID').fill('gem-response'); await page.getByLabel('Choice ID').fill('gem-choice');
  await page.getByRole('radio', { name: 'استخدام المحادثة المختارة' }).check();
  await page.getByRole('button', { name: /DeepSeek Worker Test/ }).click();
  await page.getByLabel('Temperature', { exact: false }).fill('0'); await page.getByLabel('Max tokens', { exact: false }).fill('30000');
  await page.getByRole('checkbox', { name: 'تفعيل التفكير' }).check();
  await page.getByRole('button', { name: 'حفظ الإعدادات', exact: true }).first().click(); await expect(page).toHaveURL(/translation-jobs$/);
  const saved = await evidence(request); const gem = saved.settings.translationProviders.find((p: any) => p.providerId === 'gemini_web_e2e');
  const ds = saved.settings.translationProviders.find((p: any) => p.providerId === 'deepseek_worker_e2e');
  expect(gem.geminiAccountIndex).toBe(0); expect(gem.geminiModelHeader).toBe('[1,null,"verified-model"]'); expect(gem.taskConversations.translation.responseId).toBe('gem-response');
  expect(ds.temperature).toBe(0); expect(ds.maxTokens).toBe(30000); expect(ds.thinkingEnabled).toBe(true); expect(ds.searchEnabled).toBe(false);
});
test('file selection → real multipart route → uploaded attachment in account message', async ({ page, request }) => {
  await page.goto('/dashboard/translation-settings'); await page.getByRole('button', { name: /ChatGPT Test Account/ }).click();
  await page.getByLabel('اختيار صورة أو ملف').setInputFiles({ name: 'chapter.txt', mimeType: 'text/plain', buffer: Buffer.from('A complete test chapter.') });
  await expect(page.getByRole('list', { name: 'المرفقات المجهزة' })).toContainText('chapter.txt');
  await page.getByLabel('رسالة التجربة').fill('Read this attachment'); await page.getByRole('button', { name: 'إرسال الرسالة', exact: true }).click();
  await expect(page.getByText('وصلت الرسالة إلى الخادم وأُنشئت المحادثة بنجاح.')).toBeVisible();
  const saved = await evidence(request); expect(saved.messages.at(-1).messages[0].metadata.attachments[0].id).toBe('e2e-file');
  await expect(page.getByRole('list', { name: 'المرفقات المجهزة' })).toHaveCount(0);
});
test('guests cannot read account settings or call account APIs', async ({ browser, request }) => {
  const context = await browser.newContext(); const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/dashboard/translation-settings');
  await expect(page.getByText('سجّل دخولك بحساب مترجم أو مشرف للوصول')).toBeVisible();
  expect((await request.post(backend + '/api/translator/accounts/models', { data: {} })).status()).toBe(401); await context.close();
});
