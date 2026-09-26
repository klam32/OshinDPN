import { useState, useRef, useEffect } from 'react';
import { Icon, Modal } from './ui';
import './HaravanBlogEditor.css';

// Utility to convert Vietnamese titles to URL-friendly slugs
function toSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Format date into Haravan-like Vietnamese format: DD/MM/YYYY HH:mm CH/SA
function formatHaravanDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'CH' : 'SA';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

const CATEGORIES = [
  'Tin mới',
  'Tin tức',
  'Kỹ năng',
  'Kinh nghiệm',
  'Mẹo vặt',
  'Câu chuyện thương trường',
  'Câu chuyện Cần Thơ',
  'Góc chia sẻ',
  'Thông báo',
];

const POPULAR_TAGS = [
  'TuyenDungCanGio',
  'ViecLamCanGio',
  'TuyenDungLaoDongPhoThong',
  'TuyenThoXay',
  'ViecLamXayDung',
  'OshinThoiDai',
  'VeSinhNhaO',
  'VeSinhCanTho',
  'DonDepVanPhong',
];

export default function HaravanBlogEditor({ blog, mutate, onClose, onDelete }) {
  const initialTitle = blog?.title || '';
  const initialSlug = blog?.id || toSlug(initialTitle) || 'bai-viet-moi';
  
  const [form, setForm] = useState({
    title: initialTitle,
    category: blog?.category || 'Tin mới',
    excerpt: blog?.excerpt || '',
    body: blog?.body || '<p>Nhập nội dung bài viết tại đây...</p>',
    image: blog?.image || '/images/hero.jpg',
    imageAlt: blog?.imageAlt || blog?.title || '',
    published: blog ? !!blog.published : true,
    publishDate: blog?.created ? new Date(blog.created * 1000).toISOString() : new Date().toISOString(),
    author: blog?.author || 'Khoa Lam',
    tags: blog?.tags && Array.isArray(blog.tags) ? blog.tags : ['TuyenDungCanGio', 'ViecLamCanGio', 'OshinThoiDai'],
    seoTitle: blog?.seo_title || blog?.title || '',
    seoDescription: blog?.seo_description || blog?.excerpt || '',
    slug: initialSlug,
    template: blog?.template || 'article',
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!blog);
  const [tagInput, setTagInput] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showExcerpt, setShowExcerpt] = useState(!!blog?.excerpt);
  const [showSeoEdit, setShowSeoEdit] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [showAltDialog, setShowAltDialog] = useState(false);
  const [tempAlt, setTempAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const visualEditorRef = useRef(null);

  // Sync body to contentEditable div when switching or initializing
  useEffect(() => {
    if (!isHtmlMode && visualEditorRef.current) {
      if (visualEditorRef.current.innerHTML !== form.body) {
        visualEditorRef.current.innerHTML = form.body;
      }
    }
  }, [isHtmlMode]);

  const updateField = (key, val) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === 'title') {
        if (!slugManuallyEdited) {
          updated.slug = toSlug(val);
        }
        if (!prev.seoTitle || prev.seoTitle === prev.title) {
          updated.seoTitle = val;
        }
      }
      if (key === 'excerpt' && (!prev.seoDescription || prev.seoDescription === prev.excerpt)) {
        updated.seoDescription = val;
      }
      return updated;
    });
  };

  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      updateField('body', visualEditorRef.current.innerHTML);
    }
  };

  const executeCmd = (cmd, val = null) => {
    if (isHtmlMode) return;
    document.execCommand(cmd, false, val);
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
      updateField('body', visualEditorRef.current.innerHTML);
    }
  };

  const addTag = (text) => {
    const clean = text.replace(/[,#]/g, '').trim();
    if (!clean) return;
    if (!form.tags.includes(clean)) {
      updateField('tags', [...form.tags, clean]);
    }
    setTagInput('');
  };

  const removeTag = (index) => {
    updateField('tags', form.tags.filter((_, i) => i !== index));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const insertLinkPrompt = () => {
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url) executeCmd('createLink', url);
  };

  const insertImagePrompt = () => {
    const url = window.prompt('Nhập đường dẫn hình ảnh (URL):', 'https://');
    if (url) executeCmd('insertImage', url);
  };

  const insertVideoPrompt = () => {
    const url = window.prompt('Nhập liên kết video YouTube:', 'https://www.youtube.com/watch?v=...');
    if (url) {
      let embedUrl = url;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      }
      const iframeHtml = `<div class="embedded-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0;"><iframe src="${embedUrl}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe></div><p><br></p>`;
      document.execCommand('insertHTML', false, iframeHtml);
      if (visualEditorRef.current) {
        updateField('body', visualEditorRef.current.innerHTML);
      }
    }
  };

  const insertTablePrompt = () => {
    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #dfe3e8;">
        <thead>
          <tr style="background:#f4f6f8;">
            <th style="border:1px solid #dfe3e8;padding:8px 12px;text-align:left;">Hạng mục</th>
            <th style="border:1px solid #dfe3e8;padding:8px 12px;text-align:left;">Mô tả</th>
            <th style="border:1px solid #dfe3e8;padding:8px 12px;text-align:left;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Nội dung 1</td>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Chi tiết...</td>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Đạt tiêu chuẩn</td>
          </tr>
          <tr>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Nội dung 2</td>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Chi tiết...</td>
            <td style="border:1px solid #dfe3e8;padding:8px 12px;">Đạt tiêu chuẩn</td>
          </tr>
        </tbody>
      </table><p><br></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    if (visualEditorRef.current) {
      updateField('body', visualEditorRef.current.innerHTML);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    const cleanSlug = toSlug(form.slug || form.title);
    if (!cleanSlug) {
      setError('Vui lòng chỉ định đường dẫn (slug) hợp lệ.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim() || form.title.slice(0, 150),
        body: form.body,
        image: form.image || '/images/hero.jpg',
        imageAlt: form.imageAlt || form.title,
        published: form.published,
        author: form.author,
        tags: form.tags,
        seo_title: form.seoTitle || form.title,
        seo_description: form.seoDescription || form.excerpt,
        template: form.template,
      };

      const identifier = blog?.id || cleanSlug;
      await mutate(`/admin/blogs/${identifier}`, 'PUT', payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu bài viết.');
    } finally {
      setBusy(false);
    }
  };

  // SEO Snippet preview computed values
  const categorySlug = toSlug(form.category || 'tin-moi');
  const displaySlug = toSlug(form.slug || form.title || 'bai-viet');
  const googleSnippetUrl = `https://dichvudatphuongnam.net/blogs/${categorySlug}/${displaySlug}`;
  const googleSnippetTitle = form.seoTitle || form.title || 'Tiêu đề bài viết';
  const googleSnippetDesc = form.seoDescription || form.excerpt || 'Đoạn tóm tắt hoặc nội dung bài viết sẽ hiển thị tại đây trên kết quả tìm kiếm của Google...';

  return (
    <div className="haravan-editor-wrapper">
      {/* Top Breadcrumb Navigation */}
      <div className="haravan-top-breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={onClose}>
          Danh sách bài viết
        </button>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">
          {form.title || 'Bài viết chưa có tiêu đề'}
        </span>
      </div>

      {/* Action Header Bar */}
      <header className="haravan-header-bar">
        <div className="haravan-header-left">
          <button
            type="button"
            className="haravan-back-btn"
            onClick={onClose}
            title="Quay lại danh sách bài viết"
            aria-label="Quay lại"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="haravan-page-title" title={form.title}>
            {form.title || 'Thêm bài viết mới'}
          </h1>
        </div>

        <div className="haravan-header-actions">
          {/* Actions Dropdown */}
          <div className="haravan-dropdown-container">
            <button
              type="button"
              className="haravan-btn haravan-btn-secondary"
              onClick={() => setShowActionsMenu((prev) => !prev)}
            >
              <span>Thao tác</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showActionsMenu && (
              <div className="haravan-dropdown-menu" onMouseLeave={() => setShowActionsMenu(false)}>
                {blog && (
                  <a
                    href={`#/bai-viet/${encodeURIComponent(blog.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dropdown-item"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Icon name="sparkles" size={15} />
                    <span>Xem bài viết trên web</span>
                  </a>
                )}
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowActionsMenu(false);
                    navigator.clipboard?.writeText(window.location.origin + `/#/bai-viet/${encodeURIComponent(displaySlug)}`);
                    alert('Đã sao chép liên kết bài viết vào clipboard!');
                  }}
                >
                  <Icon name="file" size={15} />
                  <span>Sao chép liên kết</span>
                </button>
                {blog && onDelete && (
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onDelete(blog);
                    }}
                  >
                    <Icon name="close" size={15} />
                    <span>Xóa bài viết</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview Button */}
          <button
            type="button"
            className="haravan-btn haravan-btn-secondary"
            onClick={() => setShowPreviewModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Xem thử
          </button>

          {/* Save Button */}
          <button
            type="button"
            className="haravan-btn haravan-btn-primary"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? 'Đang lưu...' : 'Lưu bài viết'}
          </button>
        </div>
      </header>

      {/* Feedback alerts */}
      {savedSuccess && (
        <div className="haravan-alert-success">
          <Icon name="check" size={18} />
          <span>Bài viết đã được lưu thành công vào hệ thống!</span>
        </div>
      )}

      {error && (
        <div className="haravan-alert-danger">
          <Icon name="close" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <form onSubmit={handleSave} className="haravan-editor-layout">
        {/* Left Column: 68-70% */}
        <div className="haravan-editor-left">
          {/* Card 1: Article Content */}
          <section className="haravan-card">
            <div className="haravan-field-group">
              <label className="haravan-label required">Tiêu đề</label>
              <input
                type="text"
                className="haravan-input haravan-title-input"
                placeholder="Nhập tiêu đề bài viết..."
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
              />
            </div>

            <div className="haravan-field-group" style={{ marginTop: '20px' }}>
              <div className="haravan-label-row">
                <label className="haravan-label required">Nội dung</label>
                <button
                  type="button"
                  className={`haravan-btn-toggle-code ${isHtmlMode ? 'active' : ''}`}
                  onClick={() => setIsHtmlMode((m) => !m)}
                  title="Chuyển chế độ Soạn thảo trực quan / Mã HTML"
                >
                  &lt;&gt; {isHtmlMode ? 'Soạn thảo trực quan' : 'Mã HTML'}
                </button>
              </div>

              {/* WYSIWYG Editor Container */}
              <div className="haravan-wysiwyg-box">
                {/* Rich Toolbar */}
                <div className="haravan-toolbar" role="toolbar" aria-label="Định dạng văn bản">
                  {/* History */}
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Hoàn tác (Undo)"
                    onClick={() => executeCmd('undo')}
                    disabled={isHtmlMode}
                  >
                    ↩
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Làm lại (Redo)"
                    onClick={() => executeCmd('redo')}
                    disabled={isHtmlMode}
                  >
                    ↪
                  </button>

                  <span className="toolbar-divider" />

                  {/* Heading format */}
                  <select
                    className="toolbar-select"
                    onChange={(e) => {
                      if (e.target.value) executeCmd('formatBlock', e.target.value);
                      e.target.value = '';
                    }}
                    disabled={isHtmlMode}
                    defaultValue=""
                    title="Định dạng tiêu đề"
                  >
                    <option value="" disabled>Định dạng</option>
                    <option value="<p>">Đoạn văn (Paragraph)</option>
                    <option value="<h1>">Tiêu đề 1 (Heading 1)</option>
                    <option value="<h2>">Tiêu đề 2 (Heading 2)</option>
                    <option value="<h3>">Tiêu đề 3 (Heading 3)</option>
                    <option value="<h4>">Tiêu đề 4 (Heading 4)</option>
                    <option value="<blockquote>">Trích dẫn (Quote)</option>
                  </select>

                  {/* Font size */}
                  <select
                    className="toolbar-select"
                    onChange={(e) => {
                      if (e.target.value) executeCmd('fontSize', e.target.value);
                      e.target.value = '';
                    }}
                    disabled={isHtmlMode}
                    defaultValue=""
                    title="Cỡ chữ"
                  >
                    <option value="" disabled>Cỡ chữ</option>
                    <option value="2">12px - Nhỏ</option>
                    <option value="3">14px - Chuẩn</option>
                    <option value="4">16px - Vừa</option>
                    <option value="5">18px - Lớn</option>
                    <option value="6">24px - Rất lớn</option>
                  </select>

                  <span className="toolbar-divider" />

                  {/* Basic styles */}
                  <button
                    type="button"
                    className="toolbar-btn text-bold"
                    title="In đậm (Bold)"
                    onClick={() => executeCmd('bold')}
                    disabled={isHtmlMode}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn text-italic"
                    title="In nghiêng (Italic)"
                    onClick={() => executeCmd('italic')}
                    disabled={isHtmlMode}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn text-underline"
                    title="Gạch chân (Underline)"
                    onClick={() => executeCmd('underline')}
                    disabled={isHtmlMode}
                  >
                    U
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn text-strike"
                    title="Gạch giữa (Strikethrough)"
                    onClick={() => executeCmd('strikeThrough')}
                    disabled={isHtmlMode}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chỉ số dưới (Subscript)"
                    onClick={() => executeCmd('subscript')}
                    disabled={isHtmlMode}
                  >
                    X₂
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chỉ số trên (Superscript)"
                    onClick={() => executeCmd('superscript')}
                    disabled={isHtmlMode}
                  >
                    X²
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Xóa định dạng"
                    onClick={() => executeCmd('removeFormat')}
                    disabled={isHtmlMode}
                  >
                    T<sub>x</sub>
                  </button>

                  <span className="toolbar-divider" />

                  {/* Text Color Picker */}
                  <label className="toolbar-color-picker" title="Màu chữ">
                    <span className="color-icon">A</span>
                    <input
                      type="color"
                      defaultValue="#212b36"
                      onChange={(e) => executeCmd('foreColor', e.target.value)}
                      disabled={isHtmlMode}
                    />
                  </label>

                  {/* Background Highlight Picker */}
                  <label className="toolbar-color-picker highlight" title="Màu nền nổi bật">
                    <span className="color-icon">🎨</span>
                    <input
                      type="color"
                      defaultValue="#fff8db"
                      onChange={(e) => executeCmd('hiliteColor', e.target.value)}
                      disabled={isHtmlMode}
                    />
                  </label>

                  <span className="toolbar-divider" />

                  {/* Alignment */}
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Căn trái"
                    onClick={() => executeCmd('justifyLeft')}
                    disabled={isHtmlMode}
                  >
                    ⇤
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Căn giữa"
                    onClick={() => executeCmd('justifyCenter')}
                    disabled={isHtmlMode}
                  >
                    ≡
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Căn phải"
                    onClick={() => executeCmd('justifyRight')}
                    disabled={isHtmlMode}
                  >
                    ⇥
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Căn đều"
                    onClick={() => executeCmd('justifyFull')}
                    disabled={isHtmlMode}
                  >
                    ☰
                  </button>

                  <span className="toolbar-divider" />

                  {/* Lists & Quotes */}
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Danh sách số"
                    onClick={() => executeCmd('insertOrderedList')}
                    disabled={isHtmlMode}
                  >
                    1.
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Danh sách chấm"
                    onClick={() => executeCmd('insertUnorderedList')}
                    disabled={isHtmlMode}
                  >
                    •
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Khối trích dẫn"
                    onClick={() => executeCmd('formatBlock', '<blockquote>')}
                    disabled={isHtmlMode}
                  >
                    “
                  </button>

                  <span className="toolbar-divider" />

                  {/* Media & Embeds */}
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chèn liên kết"
                    onClick={insertLinkPrompt}
                    disabled={isHtmlMode}
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chèn hình ảnh vào nội dung"
                    onClick={insertImagePrompt}
                    disabled={isHtmlMode}
                  >
                    🖼
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chèn video YouTube"
                    onClick={insertVideoPrompt}
                    disabled={isHtmlMode}
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Chèn bảng"
                    onClick={insertTablePrompt}
                    disabled={isHtmlMode}
                  >
                    ⊞
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Đường kẻ ngang"
                    onClick={() => executeCmd('insertHorizontalRule')}
                    disabled={isHtmlMode}
                  >
                    ―
                  </button>
                </div>

                {/* Editor Content Area */}
                {isHtmlMode ? (
                  <textarea
                    className="haravan-html-textarea"
                    rows={18}
                    value={form.body}
                    onChange={(e) => updateField('body', e.target.value)}
                    placeholder="Viết mã HTML tại đây..."
                    spellCheck={false}
                  />
                ) : (
                  <div
                    ref={visualEditorRef}
                    className="haravan-visual-editable"
                    contentEditable
                    onInput={handleVisualInput}
                    onBlur={handleVisualInput}
                    data-placeholder="Nhập nội dung bài viết tại đây..."
                  />
                )}
              </div>
            </div>

            {/* Author and Category Grid */}
            <div className="haravan-two-col-grid" style={{ marginTop: '24px' }}>
              <div className="haravan-field-group">
                <label className="haravan-label">Người viết</label>
                <input
                  type="text"
                  className="haravan-input"
                  value={form.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  placeholder="Ví dụ: Khoa Lam, Đất Phương Nam..."
                />
              </div>

              <div className="haravan-field-group">
                <label className="haravan-label">Danh mục Blog</label>
                <select
                  className="haravan-select"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Card 2: Excerpt (Trích dẫn) */}
          <section className="haravan-card">
            <div className="haravan-card-header">
              <h2 className="haravan-card-title">Trích dẫn</h2>
              <button
                type="button"
                className="haravan-link-btn"
                onClick={() => setShowExcerpt((prev) => !prev)}
              >
                {showExcerpt ? 'Ẩn trích dẫn' : 'Thêm trích dẫn'}
              </button>
            </div>
            {showExcerpt && (
              <div className="haravan-card-body">
                <p className="haravan-helper-text">
                  Trích dẫn tóm tắt bài viết sẽ được hiển thị trên trang danh sách tin tức và chia sẻ mạng xã hội.
                </p>
                <textarea
                  className="haravan-textarea"
                  rows={3}
                  maxLength={500}
                  placeholder="Nhập đoạn trích dẫn tóm tắt..."
                  value={form.excerpt}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                />
                <div className="haravan-char-counter">
                  {form.excerpt.length} / 500 ký tự
                </div>
              </div>
            )}
          </section>

          {/* Card 3: Comments (Bình luận) */}
          <section className="haravan-card">
            <h2 className="haravan-card-title">Bình luận</h2>
            <div className="haravan-card-body">
              <p className="haravan-info-note">
                Chế độ thêm bình luận đã bị vô hiệu hóa để thay đổi chế độ thiết lập cho bình luận, hãy vào <strong>{form.category}</strong> blog.
              </p>
              <p className="haravan-empty-comments">
                Bài viết này chưa có bình luận nào.
              </p>
            </div>
          </section>

          {/* Card 4: SEO Optimization (Tối ưu SEO) */}
          <section className="haravan-card">
            <div className="haravan-card-header">
              <h2 className="haravan-card-title">Tối ưu SEO</h2>
              <button
                type="button"
                className="haravan-link-btn"
                onClick={() => setShowSeoEdit((prev) => !prev)}
              >
                {showSeoEdit ? 'Đóng chỉnh sửa SEO' : 'Chỉnh sửa SEO'}
              </button>
            </div>
            <p className="haravan-helper-text">
              Thiết lập các thẻ mô tả giúp khách hàng dễ dàng tìm thấy danh mục này trên công cụ tìm kiếm như Google
            </p>

            {/* Google Search Snippet Preview */}
            <div className="haravan-google-preview">
              <div className="google-preview-url">{googleSnippetUrl}</div>
              <div className="google-preview-title">{googleSnippetTitle}</div>
              <div className="google-preview-desc">{googleSnippetDesc}</div>
            </div>

            {/* Editable SEO inputs */}
            {showSeoEdit && (
              <div className="haravan-seo-form" style={{ marginTop: '20px' }}>
                <div className="haravan-field-group">
                  <div className="haravan-label-row">
                    <label className="haravan-label">Tiêu đề trang (SEO Title)</label>
                    <span className="char-count">{form.seoTitle.length} / 70 ký tự</span>
                  </div>
                  <input
                    type="text"
                    className="haravan-input"
                    maxLength={100}
                    placeholder="Tiêu đề trang xuất hiện trên Google"
                    value={form.seoTitle}
                    onChange={(e) => updateField('seoTitle', e.target.value)}
                  />
                </div>

                <div className="haravan-field-group" style={{ marginTop: '14px' }}>
                  <div className="haravan-label-row">
                    <label className="haravan-label">Mô tả trang (Meta Description)</label>
                    <span className="char-count">{form.seoDescription.length} / 320 ký tự</span>
                  </div>
                  <textarea
                    className="haravan-textarea"
                    rows={3}
                    maxLength={320}
                    placeholder="Mô tả nội dung bài viết hiển thị trên Google..."
                    value={form.seoDescription}
                    onChange={(e) => updateField('seoDescription', e.target.value)}
                  />
                </div>

                <div className="haravan-field-group" style={{ marginTop: '14px' }}>
                  <label className="haravan-label">Đường dẫn / Alias</label>
                  <div className="haravan-input-prefix-group">
                    <span className="input-prefix">https://dichvudatphuongnam.net/blogs/{categorySlug}/</span>
                    <input
                      type="text"
                      className="haravan-input"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        updateField('slug', toSlug(e.target.value));
                      }}
                      placeholder="duong-dan-bai-viet"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: 30-32% (Sidebar) */}
        <div className="haravan-editor-right">
          {/* Card 1: Visibility (Hiển thị) */}
          <section className="haravan-card">
            <h2 className="haravan-card-title">Hiển thị</h2>
            <div className="haravan-card-body">
              <label className="haravan-radio-label">
                <input
                  type="radio"
                  name="visibility"
                  checked={form.published}
                  onChange={() => updateField('published', true)}
                />
                <span>Hiển thị ({formatHaravanDate(form.publishDate)})</span>
              </label>

              <label className="haravan-radio-label">
                <input
                  type="radio"
                  name="visibility"
                  checked={!form.published}
                  onChange={() => updateField('published', false)}
                />
                <span>Ẩn</span>
              </label>

              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="haravan-link-action"
                  onClick={() => {
                    const newDate = window.prompt(
                      'Nhập ngày giờ hiển thị (định dạng YYYY-MM-DDTHH:mm):',
                      new Date().toISOString().slice(0, 16)
                    );
                    if (newDate) {
                      updateField('publishDate', new Date(newDate).toISOString());
                    }
                  }}
                >
                  Thiết lập ngày cụ thể
                </button>
              </div>
            </div>
          </section>

          {/* Card 2: Featured Image (Hình đại diện) */}
          <section className="haravan-card">
            <h2 className="haravan-card-title">Hình đại diện</h2>
            <div className="haravan-card-body">
              {form.image ? (
                <div className="haravan-featured-image-box">
                  <img
                    src={form.image}
                    alt={form.imageAlt || form.title || 'Hình đại diện'}
                    className="featured-preview-img"
                    onError={(e) => {
                      e.target.src = '/images/hero.jpg';
                    }}
                  />
                  <div className="featured-image-actions">
                    <button
                      type="button"
                      className="img-action-link"
                      onClick={() => {
                        setTempImageUrl(form.image);
                        setShowImageDialog(true);
                      }}
                    >
                      Đổi ảnh
                    </button>
                    <span className="dot-sep">·</span>
                    <button
                      type="button"
                      className="img-action-link"
                      onClick={() => {
                        setTempAlt(form.imageAlt);
                        setShowAltDialog(true);
                      }}
                    >
                      ALT
                    </button>
                    <span className="dot-sep">·</span>
                    <button
                      type="button"
                      className="img-action-link text-danger"
                      onClick={() => updateField('image', '')}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="haravan-empty-image-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#919eab" strokeWidth="1.5">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <p>Chưa có hình đại diện</p>
                  <button
                    type="button"
                    className="haravan-btn haravan-btn-secondary small"
                    onClick={() => {
                      setTempImageUrl('/images/hero.jpg');
                      setShowImageDialog(true);
                    }}
                  >
                    Chọn ảnh
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Tags (Nhãn) */}
          <section className="haravan-card">
            <h2 className="haravan-card-title">Nhãn</h2>
            <div className="haravan-card-body">
              <div className="haravan-tag-input-row">
                <input
                  type="text"
                  className="haravan-input"
                  placeholder="Nhập nhãn và nhấn Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
                <button
                  type="button"
                  className="haravan-btn haravan-btn-secondary small"
                  onClick={() => addTag(tagInput)}
                >
                  Thêm
                </button>
              </div>

              {/* Tag Pills */}
              <div className="haravan-tag-list">
                {form.tags.map((tag, idx) => (
                  <span key={idx} className="haravan-tag-pill">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove-btn"
                      onClick={() => removeTag(idx)}
                      title="Xóa nhãn"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick suggestions */}
              <div className="haravan-suggested-tags">
                <span className="suggested-label">Gợi ý nhãn nhanh:</span>
                <div className="suggested-chips">
                  {POPULAR_TAGS.filter((t) => !form.tags.includes(t))
                    .slice(0, 6)
                    .map((t) => (
                      <button
                        type="button"
                        key={t}
                        className="suggest-chip"
                        onClick={() => addTag(t)}
                      >
                        + {t}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </section>

          {/* Card 4: Template (Giao diện) */}
          <section className="haravan-card">
            <h2 className="haravan-card-title">Giao diện</h2>
            <div className="haravan-card-body">
              <select
                className="haravan-select"
                value={form.template}
                onChange={(e) => updateField('template', e.target.value)}
              >
                <option value="article">article (Mặc định)</option>
                <option value="article.fullwidth">article.fullwidth (Toàn màn hình)</option>
                <option value="article.sidebar">article.sidebar (Có thanh bên)</option>
              </select>
            </div>
          </section>
        </div>
      </form>

      {/* Change Image Modal */}
      {showImageDialog && (
        <Modal title="Cập nhật hình đại diện" onClose={() => setShowImageDialog(false)}>
          <div className="editor-body">
            <p className="haravan-helper-text">
              Nhập liên kết URL của hình ảnh hoặc chọn từ các hình có sẵn:
            </p>
            <input
              type="text"
              className="haravan-input"
              value={tempImageUrl}
              onChange={(e) => setTempImageUrl(e.target.value)}
              placeholder="https://... hoặc /images/hero.jpg"
            />
            <div className="sample-images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
              {[
                '/images/hero.jpg',
                '/images/service-1.jpg',
                '/images/service-2.jpg',
                '/images/service-3.jpg',
                '/images/service-4.jpg',
                '/images/why-1.jpg',
              ].map((imgSrc) => (
                <button
                  type="button"
                  key={imgSrc}
                  className={`sample-img-choice ${tempImageUrl === imgSrc ? 'selected' : ''}`}
                  onClick={() => setTempImageUrl(imgSrc)}
                  style={{
                    border: tempImageUrl === imgSrc ? '2px solid #0084ff' : '1px solid #dfe3e8',
                    padding: '2px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <img src={imgSrc} alt="" style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="button light"
                onClick={() => setShowImageDialog(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  updateField('image', tempImageUrl);
                  setShowImageDialog(false);
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Alt Text Modal */}
      {showAltDialog && (
        <Modal title="Chỉnh sửa văn bản thay thế (ALT)" onClose={() => setShowAltDialog(false)}>
          <div className="editor-body">
            <p className="haravan-helper-text">
              Văn bản thay thế (Alt text) giúp tăng thứ hạng SEO trên Google Images và hỗ trợ người khiếm thị.
            </p>
            <input
              type="text"
              className="haravan-input"
              value={tempAlt}
              onChange={(e) => setTempAlt(e.target.value)}
              placeholder="Mô tả nội dung hình ảnh..."
            />
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="button light"
                onClick={() => setShowAltDialog(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  updateField('imageAlt', tempAlt);
                  setShowAltDialog(false);
                }}
              >
                Lưu ALT
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Live Preview Modal */}
      {showPreviewModal && (
        <Modal wide title={`Xem thử: ${form.title || 'Bài viết'}`} onClose={() => setShowPreviewModal(false)}>
          <div className="haravan-article-preview-container">
            <div className="preview-top-badge">
              <span className="badge-category">{form.category}</span>
              <span className="badge-date">{formatHaravanDate(form.publishDate)} · {form.author}</span>
            </div>
            <h1 className="preview-article-title">{form.title || 'Tiêu đề bài viết'}</h1>
            {form.excerpt && <p className="preview-article-lead">{form.excerpt}</p>}
            {form.image && (
              <div className="preview-image-wrapper">
                <img src={form.image} alt={form.imageAlt || form.title} />
              </div>
            )}
            <div
              className="preview-article-body page-prose"
              dangerouslySetInnerHTML={{ __html: form.body }}
            />
            {form.tags && form.tags.length > 0 && (
              <div className="preview-tags-row">
                <b>Từ khóa:</b>
                {form.tags.map((t, idx) => (
                  <span key={idx} className="preview-tag-badge">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                type="button"
                className="button primary"
                onClick={() => setShowPreviewModal(false)}
              >
                Đóng xem thử
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
