import { useState } from 'react';
import { money } from '../lib/api';
import { ErrorNotice, Field, Modal } from './ui';

export function PageEditor({ page, mutate, onClose }) {
  const { id, ...initial } = page;
  const [form, setForm] = useState(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal wide title="Chỉnh sửa trang giới thiệu" onClose={onClose}>
      <form
        className="editor-body content-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await mutate(`/admin/pages/${id}`, 'PUT', form);
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="Tiêu đề trang"
          required
          minLength={5}
          maxLength={180}
          value={form.title}
          onChange={(e) => input('title', e.target.value)}
        />
        <Field
          label="Tên trên menu"
          required
          minLength={2}
          maxLength={80}
          value={form.nav_title}
          onChange={(e) => input('nav_title', e.target.value)}
        />
        <Field label="Lời giới thiệu">
          <textarea
            rows={3}
            required
            minLength={5}
            maxLength={500}
            value={form.excerpt}
            onChange={(e) => input('excerpt', e.target.value)}
          />
        </Field>
        <Field
          label="Ảnh minh họa"
          value={form.image}
          onChange={(e) => input('image', e.target.value)}
        />
        <Field label="Nội dung (ngắt đoạn bằng một dòng trống)">
          <textarea
            rows={14}
            required
            minLength={20}
            maxLength={20000}
            value={form.body}
            onChange={(e) => input('body', e.target.value)}
          />
        </Field>
        <Field
          label="Đường dẫn nguồn tham khảo"
          type="url"
          value={form.source_url}
          onChange={(e) => input('source_url', e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => input('published', e.target.checked)}
          />{' '}
          Xuất bản trên website
        </label>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? 'Đang lưu...' : 'Lưu trang'}
        </button>
      </form>
    </Modal>
  );
}

export function PriceEditor({ item, services, mutate, onClose }) {
  const { id, ...initial } = item || {
    id: null,
    name: '',
    group: 'Dịch vụ khác',
    service_id: services[0]?.id,
    subtype: services[0]?.subservices[0],
    unit: 'm²',
    min_rate: 0,
    max_rate: 0,
    note: '',
    survey_only: true,
    active: true,
  };
  const [form, setForm] = useState(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      wide
      title={id ? 'Cập nhật hạng mục bảng giá' : 'Thêm hạng mục bảng giá'}
      onClose={onClose}
    >
      <form
        className="editor-body"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await mutate(`/admin/pricing/${id || crypto.randomUUID()}`, 'PUT', form);
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Dịch vụ">
            <select
              value={form.service_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  service_id: e.target.value,
                  subtype: services.find((s) => s.id === e.target.value)?.subservices[0],
                }))
              }
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loại dịch vụ">
            <select value={form.subtype} onChange={(e) => input('subtype', e.target.value)}>
              {services
                .find((s) => s.id === form.service_id)
                ?.subservices.map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          </Field>
        </div>
        {[
          ['name', 'Tên hạng mục'],
          ['group', 'Nhóm trên bảng giá'],
          ['unit', 'Đơn vị tính'],
        ].map(([k, label]) => (
          <Field
            key={k}
            label={label}
            required
            minLength={k === 'unit' ? 1 : 3}
            maxLength={k === 'unit' ? 50 : 150}
            value={form[k]}
            onChange={(e) => input(k, e.target.value)}
          />
        ))}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.survey_only}
            onChange={(e) => input('survey_only', e.target.checked)}
          />{' '}
          Chỉ báo giá sau khảo sát
        </label>
        <div className="form-grid">
          <Field
            label="Đơn giá từ (VNĐ)"
            type="number"
            required
            min={form.survey_only ? 0 : 1}
            max={100000000}
            step={1}
            value={form.min_rate}
            onChange={(e) => input('min_rate', Number(e.target.value))}
          />
          <Field
            label="Đơn giá đến (VNĐ)"
            type="number"
            required
            min={form.min_rate}
            max={100000000}
            step={1}
            value={form.max_rate}
            onChange={(e) => input('max_rate', Number(e.target.value))}
          />
        </div>
        <Field label="Phạm vi / ghi chú">
          <textarea
            rows={3}
            maxLength={1000}
            value={form.note}
            onChange={(e) => input('note', e.target.value)}
          />
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => input('active', e.target.checked)}
          />{' '}
          Hiển thị trên bảng giá
        </label>
        <p className="fine-print">
          Đơn giá cập nhật áp dụng cho yêu cầu mới. Chiết tính của yêu cầu đã lưu được giữ nguyên.
        </p>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? 'Đang lưu...' : 'Lưu hạng mục'}
        </button>
      </form>
    </Modal>
  );
}

export function ContentPanel({ pages, onEdit }) {
  return (
    <section className="admin-panel">
      <h3>Trang giới thiệu & thông tin công ty</h3>
      <p className="muted">
        Cập nhật nội dung, ảnh và trạng thái xuất bản. Trang ẩn sẽ không còn hiển thị trong menu và
        dữ liệu tư vấn của Nở.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Trang</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.title}</b>
                  <small>/{p.id}</small>
                </td>
                <td>{p.published ? 'Đã xuất bản' : 'Đang ẩn'}</td>
                <td>
                  <button className="text-button" onClick={() => onEdit(p)}>
                    Chỉnh sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PricingPanel({ items, onEdit }) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h3>Bảng giá công khai</h3>
        <button className="button primary small" onClick={() => onEdit(null)}>
          Thêm hạng mục
        </button>
      </div>
      <p className="muted">
        Đây là các đơn giá từ–đến dùng chung cho trang Bảng giá, chiết tính và tư vấn. Đơn giá tổng
        quát của dịch vụ được chỉnh ở “Quản lý dịch vụ”.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Hạng mục</th>
              <th>Đơn vị</th>
              <th>Khoảng giá</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b>
                  <small>{p.group}</small>
                </td>
                <td>{p.unit}</td>
                <td>
                  {p.survey_only
                    ? 'Khảo sát báo giá'
                    : `${money(p.min_rate)} – ${money(p.max_rate)}`}
                </td>
                <td>{p.active ? 'Hiển thị' : 'Đã ẩn'}</td>
                <td>
                  <button className="text-button" onClick={() => onEdit(p)}>
                    Chỉnh sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
