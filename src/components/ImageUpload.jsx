import { useId, useRef, useState } from 'react';
import { uploadImage } from '../lib/api';
import { Icon } from './ui';

export default function ImageUpload({
  label = 'Hình ảnh',
  value = '',
  onChange,
  help = 'JPG, PNG, WEBP hoặc GIF · tối đa 2,8 MB',
  compact = false,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`image-upload-field ${compact ? 'compact' : ''}`}>
      <label className="image-upload-label" htmlFor={`${id}-url`}>
        {label}
      </label>
      {value && (
        <div className="image-upload-preview">
          <img
            src={value}
            alt="Ảnh đang chọn"
            onLoad={(e) => e.currentTarget.classList.remove('is-broken')}
            onError={(e) => e.currentTarget.classList.add('is-broken')}
          />
        </div>
      )}
      <div className="image-upload-controls">
        <input
          id={`${id}-url`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Dán URL ảnh hoặc tải ảnh từ máy"
        />
        <button
          type="button"
          className="button secondary small image-upload-button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" size={16} />
          {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
        </button>
        {value && (
          <button type="button" className="image-upload-remove" onClick={() => onChange('')}>
            Xóa
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={choose}
      />
      <small className={error ? 'image-upload-error' : 'image-upload-help'}>{error || help}</small>
    </div>
  );
}
