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
  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const data = await response.json();
      const msg =
        typeof data.detail === 'string'
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail.map((d) => d.msg).join(', ')
            : 'Thông tin chưa hợp lệ. Hãy kiểm tra các trường bắt buộc.';
      throw new Error(msg);
    }
    const errText = await response.text().catch(() => '');
    throw new Error(errText && errText.length < 200 ? errText : 'Máy chủ đang xử lý yêu cầu hoặc gặp lỗi tạm thời. Vui lòng thử lại sau giây lát.');
  }
  if (!contentType.includes('application/json'))
    throw new Error('Máy chủ chưa sẵn sàng. Vui lòng thử lại sau.');
  return await response.json();
}

const readBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh đã chọn.'));
    reader.readAsDataURL(blob);
  });

async function optimizeImage(file) {
  if (file.type === 'image/gif' || file.size < 1200000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.86));
    return blob && blob.size < file.size ? new File([blob], file.name, { type: mime }) : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file?.type))
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.');
  const prepared = await optimizeImage(file);
  if (prepared.size > 2800000)
    throw new Error('Ảnh vẫn lớn hơn 2,8 MB sau khi tối ưu. Vui lòng chọn ảnh nhỏ hơn.');
  const result = await api('/admin/uploads', {
    method: 'POST',
    body: {
      filename: prepared.name || file.name,
      mime: prepared.type,
      data: await readBase64(prepared),
    },
  });
  return result.url;
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
