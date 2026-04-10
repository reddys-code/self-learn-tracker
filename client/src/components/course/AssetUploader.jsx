import { useRef, useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { apiClient, withApiOrigin } from '../../api/client';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AssetUploader({ label = 'Upload file', folder = 'courses', onUploaded, buttonText = 'Upload asset' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { data } = await apiClient.post('/admin/uploads', {
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        folder,
      });
      setMessage(`Uploaded: ${file.name}`);
      onUploaded?.({ ...data, previewUrl: withApiOrigin(data.url) });
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || 'Upload failed.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div className="asset-uploader">
      <span className="soft-text tiny-label">{label}</span>
      <input ref={inputRef} type="file" hidden onChange={handleFile} />
      <button type="button" className="btn small" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />} {buttonText}
      </button>
      {message ? <small className="soft-text">{message}</small> : null}
    </div>
  );
}
