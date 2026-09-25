export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'OshinWeb',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Chưa kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json'))
    throw new Error('Máy chủ chưa sẵn sàng. Vui lòng thử lại sau.');
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Thông tin chưa hợp lệ. Hãy kiểm tra các trường bắt buộc.',
    );
  return data;
}
export const money = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
export const date = (n) => new Date(n * 1000).toLocaleString('vi-VN');
export const statuses = {
  new: 'Mới tiếp nhận',
  surveying: 'Đang khảo sát',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  processing: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  pending: 'Chờ gửi',
  sending: 'Đang gửi',
  sent: 'Đã gửi',
  failed: 'Gửi thất bại',
};
