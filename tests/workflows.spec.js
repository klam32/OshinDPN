import { test, expect } from '@playwright/test';

const headers = { 'X-Requested-With': 'OshinWeb' };
const loginAdmin = async (page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByLabel('Email').fill('admin@e2e.local');
  await page.getByLabel('Mật khẩu').fill('E2e-password-strong-123');
  await page.getByRole('dialog').getByRole('button', { name: 'Đăng nhập và nhận OTP', exact: true }).click();
  await page.getByLabel('Mã xác thực OTP').fill('100000');
  await page.getByRole('button', { name: 'Xác nhận mã OTP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible();
};
const noOverflow = async (page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

test('Landing, báo giá tạp vụ, Excel và theo dõi yêu cầu', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.service-card')).toHaveCount(7);
  await page.getByRole('button', { name: 'Cho gia đình', exact: true }).click();
  await expect(page.locator('.service-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Xem dịch vụ Tạp vụ theo giờ', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Số giờ mỗi buổi').fill('3');
  await modal.getByLabel('Số buổi').fill('2');
  await modal.getByLabel('Diện tích (m²)').fill('80');
  await modal.getByLabel('Tần suất').selectOption('Hằng tuần');
  await modal.getByLabel('Công việc cần làm').fill('Dọn nhà và vệ sinh bếp');
  await modal.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(modal.locator('.quote-total')).toContainText('420.000');
  await modal.getByLabel('Họ và tên').fill('Khách kiểm thử E2E');
  await modal.getByLabel('Số điện thoại').fill('0901234567');
  await modal.getByLabel('Email nhận báo giá').fill('customer@e2e.local');
  await modal.getByLabel('Địa chỉ thực hiện').fill('123 Nguyễn Văn Cừ, Cần Thơ');
  await modal.getByRole('checkbox').check();
  await modal.getByRole('button', { name: 'Gửi yêu cầu báo giá', exact: true }).click();
  await expect(modal.getByRole('heading', { name: 'Yêu cầu đã được tiếp nhận' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('link', { name: 'Tải Excel .xlsx' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^DPN-.*\.xlsx$/);
  await modal.getByRole('button', { name: 'Xem yêu cầu của tôi' }).click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('.order-card')).toContainText('420.000');
  expect(errors).toEqual([]);
});

test('Khảo sát tối giản, đăng ký và lưu yêu cầu vào tài khoản', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Yêu cầu khảo sát', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await modal.getByLabel('Họ và tên').fill('Khách khảo sát E2E');
  await modal.getByLabel('Số điện thoại').fill('0901234567');
  await modal.getByLabel('Địa chỉ thực hiện').fill('45 Đường Cần Thơ');
  await modal.getByRole('checkbox').check();
  await modal.getByRole('button', { name: 'Gửi yêu cầu khảo sát', exact: true }).click();
  await expect(modal.getByRole('heading', { name: 'Yêu cầu đã được tiếp nhận' })).toBeVisible();
  await modal.getByRole('button', { name: 'Xem yêu cầu của tôi' }).click();
  await page.getByRole('button', { name: 'Đăng nhập hoặc đăng ký' }).click();
  await modal.getByRole('button', { name: 'Đăng ký ngay', exact: true }).click();
  await modal.getByLabel('Họ và tên').fill('Khách khảo sát E2E');
  await modal.getByLabel('Email').fill(`survey-${Date.now()}@e2e.local`);
  await modal.getByLabel('Mật khẩu').fill('SecurePassword123');
  await modal.getByRole('button', { name: 'Đăng ký và nhận OTP', exact: true }).click();
  await modal.getByLabel('Mã xác thực OTP').fill('100000');
  await modal.getByRole('button', { name: 'Xác nhận mã OTP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xin chào, Khách khảo sát E2E' })).toBeVisible();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('.order-card .quote-details')).toContainText('khảo sát');
});

test('Nở offline, tư vấn trực tiếp hai trình duyệt và quay về Nở', async ({ page, browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Trò chuyện với Nở', exact: true }).click();
  await page.getByRole('button', { name: 'Tôi cần dọn vệ sinh', exact: true }).click();
  await expect(page.locator('.message.assistant').last()).toContainText('Yêu cầu báo giá');
  await loginAdmin(adminPage);
  await adminPage.getByRole('button', { name: 'Đang ngoại tuyến', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tư vấn trực tiếp', exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Tư vấn trực tiếp', exact: true }).click();
  await page.getByLabel('Tin nhắn tư vấn').fill('Khách cần tư vấn trực tiếp E2E');
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await adminPage
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Tư vấn trực tiếp', exact: true })
    .click();
  await adminPage
    .locator('.admin-chat aside button')
    .filter({ hasText: 'Khách cần tư vấn trực tiếp E2E' })
    .click({ timeout: 15000 });
  await adminPage.getByLabel('Trả lời khách hàng').fill('Dạ, nhân viên đã nhận yêu cầu E2E.');
  await adminPage.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.locator('.message.admin').last()).toContainText(
    'nhân viên đã nhận yêu cầu E2E',
    { timeout: 10000 },
  );
  await adminPage.getByRole('button', { name: 'Đang nhận tư vấn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tư vấn trực tiếp', exact: true })).toHaveCount(0, {
    timeout: 10000,
  });
  await page.getByLabel('Tin nhắn tư vấn').fill('Tôi muốn hỏi giá dịch vụ');
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(page.locator('.message.assistant').last()).toContainText('Yêu cầu báo giá');
  await adminContext.close();
});

test('Quản trị: xử lý đơn, giá, QR và chỉnh Blog, dịch vụ, cấu hình', async ({ page }) => {
  await loginAdmin(page);
  const seed = await page.request.post('/api/orders', {
    headers,
    data: {
      service_id: 'cleaning',
      subtype: 'Hằng ngày, định kỳ',
      mode: 'survey',
      details: {},
      name: 'Khách quản trị E2E',
      phone: '0901234567',
      email: '',
      address: '125 Đường kiểm thử, Cần Thơ',
      consent: true,
      request_id: crypto.randomUUID(),
    },
  });
  expect(seed.ok()).toBe(true);
  await page.reload();
  await page
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Yêu cầu & báo giá', exact: true })
    .click();
  await page.getByRole('button', { name: 'Chi tiết' }).first().click();
  let modal = page.getByRole('dialog');
  await modal.getByLabel('Tổng giá thỏa thuận').fill('750000');
  await modal
    .getByLabel('Hạng mục và ghi chú thỏa thuận')
    .fill('Dọn vệ sinh trọn gói đã xác nhận với khách.');
  await modal.getByRole('button', { name: 'Lưu giá đã xác nhận' }).click();
  await expect(modal).toHaveCount(0);
  for (const status of ['confirmed', 'in_progress', 'completed', 'paid']) {
    await page.getByRole('button', { name: 'Chi tiết' }).first().click();
    await modal.getByLabel('Tiến độ xử lý').selectOption(status);
    await modal.getByRole('button', { name: 'Cập nhật trạng thái' }).click();
    await expect(modal).toHaveCount(0);
  }
  await expect(page.locator('tbody tr').first()).toContainText('Đã thanh toán');
  await page
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Quản lý dịch vụ', exact: true })
    .click();
  await page.getByRole('button', { name: 'Chỉnh sửa dịch vụ' }).first().click();
  await modal.getByLabel('Đơn giá tham khảo (VND)').fill('13000');
  await modal.getByRole('button', { name: 'Lưu dịch vụ', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.admin-service-grid article').first()).toContainText('13.000');
  await page
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Bài viết & Blog', exact: true })
    .click();
  await page.getByRole('button', { name: 'Viết bài mới' }).click();
  await modal.getByLabel('Tiêu đề').fill('Bài viết kiểm thử E2E');
  await modal.getByLabel('Tóm tắt').fill('Tóm tắt bài viết kiểm thử tự động');
  await modal
    .getByLabel('Nội dung')
    .fill('Đây là nội dung bài viết kiểm thử dài hơn hai mươi ký tự.');
  await modal.getByRole('checkbox', { name: 'Xuất bản công khai' }).check();
  await modal.getByRole('button', { name: 'Lưu bài viết', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Bài viết kiểm thử E2E');
  await page
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Cấu hình hệ thống', exact: true })
    .click();
  await page.getByLabel('Tiêu đề chính').fill('Nhà sạch thảnh thơi.\nCuộc sống rạng ngời.');
  await page.getByLabel('Tên ngân hàng').fill('Ngân hàng kiểm thử');
  await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
  await expect(page.locator('.success-notice')).toContainText('Đã lưu thay đổi');
  await page.screenshot({ path: 'test-results/admin-settings.png', fullPage: true });
});

test('Điện thoại: phản hồi thanh toán và Admin trả lời', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.service-card')).toHaveCount(7);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  await page.getByRole('button', { name: 'Góp ý', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Họ và tên').fill('Khách phản hồi E2E');
  await modal.getByLabel('Số điện thoại').fill('0901234567');
  await modal.getByLabel('Email nhận kết quả xử lý').fill('feedback@e2e.local');
  await modal.getByLabel('Vấn đề', { exact: true }).selectOption('Thanh toán');
  await modal.getByLabel('Mã giao dịch / thời điểm thanh toán').fill('E2E-TXN-123');
  await modal.getByLabel('Tiêu đề').fill('Phản hồi thanh toán E2E');
  await modal
    .getByLabel('Nội dung chi tiết')
    .fill('Xin kiểm tra giúp tôi giao dịch thanh toán này.');
  await modal.getByRole('checkbox').check();
  await modal.getByRole('button', { name: 'Gửi phản hồi', exact: true }).click();
  await modal.getByRole('button', { name: 'Theo dõi phản hồi', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Phản hồi thanh toán E2E', exact: true }),
  ).toBeVisible();
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  await loginAdmin(adminPage);
  await adminPage
    .locator('.admin-sidebar')
    .getByRole('button', { name: /Phản hồi & báo lỗi/ })
    .click();
  await adminPage
    .getByRole('row')
    .filter({ hasText: 'Phản hồi thanh toán E2E' })
    .getByRole('button', { name: 'Xử lý' })
    .click();
  await adminPage.getByLabel('Trạng thái', { exact: true }).selectOption('resolved');
  await adminPage
    .getByLabel('Phản hồi gửi đến khách hàng và qua email')
    .fill('Đã kiểm tra giao dịch E2E và hỗ trợ khách.');
  await adminPage.getByRole('button', { name: 'Lưu và gửi email' }).click();
  await page.reload();
  await expect(page.locator('.order-card')).toContainText('Đã kiểm tra giao dịch E2E');
  await noOverflow(page);
  await context.close();
});
