import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../lib/config';

export default function ImageUpload({ onUpload, initialImage = '', label = 'Product Image', className = '' }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(initialImage);
    const [error, setError] = useState('');

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setError('');
        setUploading(true);

        try {
            // 1. Compress Image
            const options = {
                maxSizeMB: 0.2, // Compress to ~200KB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(file, options);

            // 2. Upload to Backend
            const formData = new FormData();
            formData.append('file', compressedFile);

            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();

            // 3. Update State
            setPreview(data.url);
            onUpload(data.url);

        } catch (err) {
            console.error('Upload Error:', err);
            setError('Failed to process image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview('');
        onUpload('');
    };

    return (
        <div className={`space-y-1 ${className}`}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            <div className="relative group">
                {preview ? (
                    <div className="relative h-40 w-full sm:w-40 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remove Image"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full sm:w-40 h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 text-copper animate-spin mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            )}
                            <p className="text-xs text-gray-500">
                                {uploading ? 'Compressing & Uploading...' : (
                                    <>
                                        <span className="font-semibold text-copper">Click to upload</span>
                                        <br />
                                        <span className="text-[10px]">Max 200KB (Auto-compressed)</span>
                                    </>
                                )}
                            </p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}
