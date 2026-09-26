import { useEffect, useRef, useState } from 'react';
import { api, money } from '../lib/api';
import { ErrorNotice, Field, Icon, Modal } from './ui';

export function QuoteTable({ quote }) {
  if (!quote) return null;
  const amount = (low, high) => (quote.range ? `${money(low)} – ${money(high)}` : money(low));
  return (
    <div className="quote-details">
      {quote.survey ? (
        <p>Nhân viên sẽ liên hệ xác nhận lịch khảo sát và chi phí sau khi đánh giá thực tế.</p>
      ) : (
        <>
          <div className="quote-lines">
            {quote.lines.map((l, i) => (
              <div key={i}>
                <span>
                  {l.name}
                  <small>
                    {l.quantity} {l.unit} × {amount(l.rate, l.rate_max)}
                  </small>
                </span>
                <b>{amount(l.amount, l.amount_max)}</b>
              </div>
            ))}
          </div>
          <div className="quote-tax">
            <span>Thuế cấu hình ({quote.tax_percent}%)</span>
            <b>{amount(quote.tax, quote.tax_max)}</b>
          </div>
          <div className="quote-total">
            <span>{quote.confirmed ? 'Tổng đã xác nhận' : 'Tổng tham khảo'}</span>
            <strong className={quote.range ? 'range-value' : ''}>
              {amount(quote.total, quote.total_max)}
            </strong>
          </div>
        </>
      )}
      <p className="fine-print">{quote.note}</p>
    </div>
  );
}

export default function Booking({
  services,
  initialService,
  initialMode,
  initialSubtype,
  pricing = [],
  initialPricing,
  user,
  onClose,
  onSuccess,
}) {
  const [serviceId, setServiceId] = useState(initialService || services[0]?.id);
  const service = services.find((s) => s.id === serviceId) || services[0];
  const [mode, setMode] = useState(initialMode || 'quote');
  const [subtype, setSubtype] = useState(initialSubtype || service?.subservices[0]);
  const previousService = useRef(serviceId);
  const [details, setDetails] = useState({});
  const [pricingId, setPricingId] = useState(initialPricing || '');
  const priceItem = pricing.find(
    (p) => p.id === pricingId && p.service_id === serviceId && p.subtype === subtype,
  );
  const priceOptions = pricing.filter((p) => p.service_id === serviceId && p.subtype === subtype);
  const payloadDetails = { ...details, ...(priceItem ? { pricing_id: priceItem.id } : {}) };
  const fields = priceItem
    ? [
        {
          key: 'quantity',
          label: `Khối lượng (${priceItem.unit})`,
          type: 'number',
          required: true,
          min: priceItem.unit === 'kg' || priceItem.unit === 'm²' ? 0.01 : 1,
          max: 100000,
          step: ['cái', 'bộ', 'tấm', 'chuyến', 'người/tháng'].includes(priceItem.unit) ? 1 : 'any',
        },
        ...(serviceId === 'moving'
          ? service.fields
          : [
              {
                key: 'condition',
                label: 'Hiện trạng / nhu cầu bổ sung',
                type: 'text',
                required: true,
              },
            ]),
      ]
    : service?.fields;
  const [customer, setCustomer] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    address: '',
    preferred_date: '',
  });
  const [quote, setQuote] = useState(null),
    [previewError, setPreviewError] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  const [consent, setConsent] = useState(false),
    [step, setStep] = useState(1);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (previousService.current === serviceId) return;
    previousService.current = serviceId;
    setSubtype(service?.subservices[0]);
    setDetails({});
    setPricingId('');
    setQuote(null);
    setPreviewError('');
  }, [serviceId]);
  useEffect(() => {
    setQuote(null);
  }, [mode, details, subtype, pricingId]);
  const input = (key, value) => setCustomer((c) => ({ ...c, [key]: value }));
  async function preview(e) {
    e.preventDefault();
    setPreviewError('');
    setBusy(true);
    try {
      setQuote(
        await api('/quotes/preview', {
          method: 'POST',
          body: { service_id: serviceId, subtype, details: payloadDetails, mode },
        }),
      );
      setStep(2);
    } catch (e) {
      setPreviewError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          service_id: serviceId,
          subtype,
          mode,
          details: payloadDetails,
          ...customer,
          consent,
          request_id: requestId,
        },
      });
      setResult(order);
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title={result ? 'Yêu cầu đã được tiếp nhận' : 'Một chút thông tin, nhiều hơn sự an tâm'}
      onClose={onClose}
    >
      {result ? (
        <div className="booking-success">
          <span className="success-icon">
            <Icon name="check" size={36} />
          </span>
          <h2>Cảm ơn {customer.name}!</h2>
          <p>
            Đất Phương Nam đã lưu yêu cầu. Nhân viên sẽ liên hệ để xác nhận thông tin và lịch thực
            hiện.
          </p>
          <div className="order-code">{result.id}</div>
          <QuoteTable quote={result.quote} />
          <p className="fine-print">
            File Excel đã được tạo. Email được đưa vào hàng đợi; bạn có thể theo dõi trạng thái tại
            “Yêu cầu của tôi”.
          </p>
          <div className="button-row">
            <a className="button primary" href={`/api/orders/${result.id}/xlsx`}>
              <Icon name="download" /> Tải Excel .xlsx
            </a>
            <button
              className="button secondary"
              onClick={() => {
                location.hash = 'account';
                onClose();
              }}
            >
              Xem yêu cầu của tôi
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-layout">
          <div className="booking-main">
            <div className="step-track">
              <span className={step === 1 ? 'active' : 'done'}>
                <i>1</i> Nhu cầu dịch vụ
              </span>
              <span className={step === 2 ? 'active' : ''}>
                <i>2</i> Thông tin & gửi
              </span>
            </div>
            {step === 1 ? (
              <form onSubmit={preview}>
                <div className="mode-picker">
                  <button
                    type="button"
                    className={mode === 'quote' ? 'selected' : ''}
                    disabled={priceItem?.survey_only}
                    onClick={() => setMode('quote')}
                  >
                    <Icon name="file" />
                    <b>Báo giá trực tuyến</b>
                    <small>Tôi có thông tin chi tiết</small>
                  </button>
                  <button
                    type="button"
                    className={mode === 'survey' ? 'selected' : ''}
                    onClick={() => setMode('survey')}
                  >
                    <Icon name="pin" />
                    <b>Khảo sát tận nơi</b>
                    <small>Nhờ nhân viên kiểm tra</small>
                  </button>
                </div>
                <Field label="Dịch vụ">
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Loại dịch vụ">
                  <select
                    value={subtype}
                    onChange={(e) => {
                      setSubtype(e.target.value);
                      setPricingId('');
                      setDetails({});
                    }}
                  >
                    {service?.subservices.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                {!!priceOptions.length && (
                  <Field label="Hạng mục bảng giá">
                    <select
                      value={pricingId}
                      onChange={(e) => {
                        const item = pricing.find((p) => p.id === e.target.value);
                        setPricingId(e.target.value);
                        setDetails({});
                        if (item?.survey_only) setMode('survey');
                      }}
                    >
                      <option value="">Theo thông tin dịch vụ (đơn giá cấu hình)</option>
                      {priceOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.unit}
                          {p.survey_only ? ' · Khảo sát' : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {priceItem && (
                  <p className="price-item-note">
                    {priceItem.survey_only
                      ? 'Cần khảo sát trước khi báo giá.'
                      : `Khoảng đơn giá: ${money(priceItem.min_rate)} – ${money(priceItem.max_rate)} / ${priceItem.unit}.`}{' '}
                    {priceItem.note}
                  </p>
                )}
                {mode === 'quote' ? (
                  <div className="form-grid">
                    {fields?.map((f) => (
                      <Field key={f.key} label={f.label} required={f.required}>
                        {f.type === 'select' ? (
                          <select
                            required={f.required}
                            value={details[f.key] || ''}
                            onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                          >
                            <option value="">Chọn thông tin</option>
                            {f.options.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={f.type}
                            required={f.required}
                            min={f.min}
                            max={f.max}
                            step={f.type === 'number' ? f.step || 'any' : undefined}
                            maxLength={3000}
                            value={details[f.key] ?? ''}
                            placeholder={f.type === 'number' ? 'Nhập số lượng' : 'Nhập thông tin'}
                            onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                ) : (
                  <div className="info-box">
                    <Icon name="heart" />
                    <p>
                      Chưa rõ diện tích hay khối lượng? Không sao cả. Chỉ cần để lại thông tin liên
                      hệ ở bước tiếp theo, nhân viên sẽ trao đổi và hẹn khảo sát cùng bạn.
                    </p>
                  </div>
                )}
                <ErrorNotice error={previewError} />
                <button className="button primary full" disabled={busy}>
                  {busy ? 'Đang tính...' : 'Tiếp tục'}
                  <Icon name="arrow" />
                </button>
              </form>
            ) : (
              <form onSubmit={submit}>
                <button type="button" className="text-button" onClick={() => setStep(1)}>
                  ← Chỉnh sửa nhu cầu
                </button>
                <h3>Thông tin để chúng tôi liên hệ</h3>
                <div className="form-grid">
                  <Field
                    label="Họ và tên"
                    required
                    value={customer.name}
                    maxLength={100}
                    minLength={2}
                    autoComplete="name"
                    onChange={(e) => input('name', e.target.value)}
                  />
                  <Field
                    label="Số điện thoại"
                    type="tel"
                    required
                    pattern="(\+84|0)[0-9 .\-]{8,13}"
                    value={customer.phone}
                    autoComplete="tel"
                    placeholder="0901 234 567"
                    onChange={(e) => input('phone', e.target.value)}
                  />
                </div>
                <Field
                  label={
                    mode === 'survey'
                      ? 'Email (nếu muốn nhận phiếu khảo sát)'
                      : 'Email nhận báo giá'
                  }
                  type="email"
                  required={mode === 'quote'}
                  value={customer.email}
                  autoComplete="email"
                  onChange={(e) => input('email', e.target.value)}
                />
                <Field
                  label={serviceId === 'moving' ? 'Địa chỉ chuyển đi' : 'Địa chỉ thực hiện'}
                  required
                  minLength={5}
                  maxLength={500}
                  value={customer.address}
                  autoComplete="street-address"
                  onChange={(e) => input('address', e.target.value)}
                />
                {mode === 'quote' && (
                  <Field
                    label="Ngày mong muốn (không bắt buộc)"
                    type="date"
                    min={new Date().toLocaleDateString('en-CA')}
                    value={customer.preferred_date}
                    onChange={(e) => input('preferred_date', e.target.value)}
                  />
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    Tôi đồng ý để công ty sử dụng thông tin đã cung cấp để tư vấn, liên hệ và xử lý
                    yêu cầu này.
                  </span>
                </label>
                <ErrorNotice error={error} />
                <button className="button primary full" disabled={busy}>
                  {busy
                    ? 'Đang gửi yêu cầu...'
                    : mode === 'survey'
                      ? 'Gửi yêu cầu khảo sát'
                      : 'Gửi yêu cầu báo giá'}
                  <Icon name="arrow" />
                </button>
              </form>
            )}
          </div>
          <aside className="booking-summary">
            <span className="eyebrow">RÕ RÀNG TỪ ĐẦU</span>
            <h3>{mode === 'survey' ? 'Khảo sát đúng nhu cầu' : 'Chiết tính của bạn'}</h3>
            {quote ? (
              <QuoteTable quote={quote} />
            ) : (
              <>
                <Icon name={service?.icon} size={42} />
                <h4>{service?.name}</h4>
                <p>Điền thông tin và chọn tiếp tục để xem chiết tính trước khi gửi yêu cầu.</p>
              </>
            )}
            <div className="summary-promises">
              <span>
                <Icon name="check" /> Xác nhận trước khi thực hiện
              </span>
              <span>
                <Icon name="check" /> Lưu và tải file Excel
              </span>
              <span>
                <Icon name="check" /> Theo dõi tiến độ trực tuyến
              </span>
            </div>
            <p className="fine-print">
              {!user &&
                'Yêu cầu được lưu cho trình duyệt này. Đăng ký tài khoản để theo dõi trên các thiết bị khác.'}
            </p>
          </aside>
        </div>
      )}
    </Modal>
  );
}
