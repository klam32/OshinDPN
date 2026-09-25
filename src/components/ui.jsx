import { cloneElement, useEffect, useId, useRef } from 'react';

const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3Z',
  phone: 'M8 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3-7-7 3-2Z',
  mail: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6Zm-5 10 3 3 7-7',
  sparkles: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4m-2-2h4',
  leaf: 'M20 3C4 1 0 13 8 18s15-4 12-15ZM5 21 16 9',
  truck:
    'M1 4h14v13H1Zm14 5h4l4 5v3h-8M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m14 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  tool: 'm14 6 4 4 4-4a7 7 0 0 1-9 9l-7 7-4-4 7-7a7 7 0 0 1 9-9Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',
  users: 'M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M3 21v-3a8 8 0 0 1 16 0v3M18 3a4 4 0 0 1 0 8m3 4 2 6',
  chat: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 10h8m-8 4h5',
  send: 'm22 2-7 20-4-9-9-4Zm0 0L11 13',
  star: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
  calendar: 'M4 5h16v17H4ZM8 2v6m8-6v6M4 11h16',
  menu: 'M3 6h18M3 12h18M3 18h18',
  file: 'M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8m-8 4h8',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  settings:
    'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3-5 1-3-5 2-4-1-5 5-2Z',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5m-6-5h11',
  report: 'M12 3 1 21h22Zm0 6v5m0 3v1',
  heart: 'M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8Z',
  qr: 'M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h3v3h3v3h-6Zm6-3v3M12 3v9H3m9 3v6',
};
export function Icon({ name = 'sparkles', size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.sparkles} />
    </svg>
  );
}
export function NoAvatar({ small = false }) {
  return (
    <span className={`no-avatar ${small ? 'small' : ''}`} aria-hidden="true">
      <span className="no-hair" />
      <span className="no-face">◡</span>
      <span className="no-flower">✿</span>
    </span>
  );
}
export function Logo({ light = false }) {
  return (
    <a
      className={`logo brand-logo ${light ? 'light' : ''}`}
      href="#"
      aria-label="Oshin Thời Đại – Đất Phương Nam – Trang chủ"
    >
      <img
        src="/images/logo.png"
        alt="Oshin Thời Đại – Khẳng định sự thành đạt"
        width="300"
        height="83"
      />
    </a>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    node?.querySelector('button, input, select, textarea')?.focus();
    const keydown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = [
          ...node.querySelectorAll(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ].filter((x) => x.getClientRects().length);
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="modal-header">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && <b aria-hidden="true"> *</b>}
      </span>
      {children ? (
        cloneElement(children, { 'aria-label': label })
      ) : (
        <input aria-label={label} {...props} />
      )}
    </label>
  );
}
export function ErrorNotice({ error }) {
  return error ? (
    <div className="error-notice" role="alert">
      <Icon name="report" />
      {error}
    </div>
  ) : null;
}
export function Empty({ icon = 'file', title, text }) {
  return (
    <div className="empty">
      <Icon name={icon} size={38} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
