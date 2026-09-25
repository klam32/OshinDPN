import { test, expect } from '@playwright/test';

test('Menu desktop hai cấp mở đúng dịch vụ con và hỗ trợ bàn phím', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.reference-header');
  await expect(header.locator('.brand-logo')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(header).toHaveCSS('background-color', 'rgb(0, 61, 126)');
  await expect(header.getByRole('link', { name: 'Trang chủ', exact: true })).toHaveCSS(
    'color',
    'rgb(255, 255, 0)',
  );
  await page.screenshot({
    path: 'docs/menu-reference-desktop.png',
    clip: { x: 0, y: 0, width: 1440, height: 200 },
  });
  const trigger = header.getByRole('button', { name: 'Dịch vụ', exact: true });
  await trigger.hover();
  await header.getByRole('button', { name: 'Dịch vụ vận chuyển, di dời', exact: true }).hover();
  const submenu = header.locator('#submenu-moving');
  await expect(submenu).toBeVisible();
  const bounds = await submenu.boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440);
  await page.screenshot({
    path: 'docs/menu-reference-dropdown.png',
    clip: { x: 0, y: 0, width: 1440, height: 650 },
  });
  await submenu.getByRole('button', { name: 'Di dời nhà ở', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByLabel('Dịch vụ', { exact: true })).toHaveValue('moving');
  await expect(modal.getByLabel('Loại dịch vụ')).toHaveValue('Di dời nhà ở');
  await modal.getByLabel('Dịch vụ', { exact: true }).selectOption('garden');
  await expect(modal.getByLabel('Loại dịch vụ')).toHaveValue('Chăm sóc cây cảnh');
  await modal.getByRole('button', { name: 'Đóng', exact: true }).click();
  await trigger.focus();
  await trigger.press('Enter');
  await expect(header.locator('#header-services')).toBeVisible();
  await trigger.press('Escape');
  await expect(header.locator('#header-services')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Tìm kiếm không dấu mở đúng form báo giá', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByLabel('Nội dung tìm kiếm').fill('cay xanh');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Cung cấp cây xanh/ })
    .click();
  await expect(page.getByRole('dialog').getByLabel('Dịch vụ', { exact: true })).toHaveValue(
    'garden',
  );
  await expect(page.getByRole('dialog').getByLabel('Loại dịch vụ')).toHaveValue(
    'Cung cấp cây xanh',
  );
});

test('Menu điện thoại mở từng cấp, đóng sau lựa chọn và không tràn màn hình', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const header = page.locator('.reference-header');
  await header.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await header.getByRole('button', { name: 'Dịch vụ', exact: true }).click();
  await header.getByRole('button', { name: 'Dịch vụ chăm sóc cây cảnh', exact: true }).click();
  await expect(header.locator('#submenu-garden')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/menu-reference-mobile.png' });
  await header.getByRole('button', { name: 'Cung cấp cây xanh', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Loại dịch vụ')).toHaveValue(
    'Cung cấp cây xanh',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(header.getByRole('button', { name: 'Mở menu', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Đóng thông báo đầu trang', exact: true }).click();
  await expect(page.locator('.reference-topbar')).toHaveCount(0);
});
