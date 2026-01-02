import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../../lib/config';

export default function ImageUpload({ onUpload, initialImage = '', label = 'Product Image', className = '' }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(initialImage);
    const [error, setError] = useState('');
    const [uploadStatus, setUploadStatus] = useState(''); // 'compressing', 'uploading', 'converting', 'done'
    const [progress, setProgress] = useState(0);

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setError('');
        setUploading(true);
        setProgress(0);

        try {
            // 1. Compress Image (Frontend)
            setUploadStatus('compressing');
            setProgress(20);

            const options = {
                maxSizeMB: 0.5, // Compress to ~500KB (backend will further compress)
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                onProgress: (p) => setProgress(20 + Math.round(p * 0.3)) // 20-50%
            };

            const compressedFile = await imageCompression(file, options);
            setProgress(50);

            // 2. Upload to Backend (Backend will convert to WebP)
            setUploadStatus('uploading');

            const formData = new FormData();
            formData.append('file', compressedFile);

            const API_URL = getApiUrl();

            // Use XMLHttpRequest for progress tracking
            const url = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${API_URL}/api/upload`);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = 50 + Math.round((event.loaded / event.total) * 40); // 50-90%
                        setProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        setUploadStatus('converting');
                        setProgress(95);
                        const data = JSON.parse(xhr.responseText);
                        resolve(data.url);
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.send(formData);
            });

            // 3. Done
            setUploadStatus('done');
            setProgress(100);
            setPreview(url);
            onUpload(url);

            // Reset status after a moment
            setTimeout(() => {
                setUploadStatus('');
                setProgress(0);
            }, 1500);

        } catch (err) {
            console.error('Upload Error:', err);
            setError('Failed to process image. Please try again.');
            setUploadStatus('');
            setProgress(0);
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

    const getStatusText = () => {
        switch (uploadStatus) {
            case 'compressing': return '🔄 Compressing...';
            case 'uploading': return '📤 Uploading...';
            case 'converting': return '🔄 Converting to WebP...';
            case 'done': return '✅ Done!';
            default: return '';
        }
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
                        {preview.includes('.webp') && (
                            <span className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                                WebP
                            </span>
                        )}
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full sm:w-40 h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                            {uploading ? (
                                <>
                                    <Loader2 className="w-8 h-8 text-copper animate-spin mb-2" />
                                    <p className="text-xs text-gray-600 font-medium">{getStatusText()}</p>
                                    <div className="w-full mt-2 bg-gray-200 rounded-full h-1.5">
                                        <div
                                            className="bg-copper h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">{progress}%</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-500">
                                        <span className="font-semibold text-copper">Click to upload</span>
                                        <br />
                                        <span className="text-[10px]">Auto-compressed & WebP</span>
                                    </p>
                                </>
                            )}
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

