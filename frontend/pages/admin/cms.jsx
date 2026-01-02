import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { Trash2, Plus, Image as ImageIcon, Video, ExternalLink, TrendingUp, DollarSign, Save } from 'lucide-react';

export default function ContentManagement() {
    const [activeTab, setActiveTab] = useState('hero'); // 'hero' or 'creators'
    const [heroSlides, setHeroSlides] = useState([]);
    const [creators, setCreators] = useState([]);
    const [settings, setSettings] = useState(null);
    const [metalRates, setMetalRates] = useState({ gold: '', silver: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [savingRates, setSavingRates] = useState(false);
    const [rateMessage, setRateMessage] = useState('');

    // Form States
    const [showHeroForm, setShowHeroForm] = useState(false);
    const [showCreatorForm, setShowCreatorForm] = useState(false);

    // New Item States
    const [newSlide, setNewSlide] = useState({ image_file: null, mobile_image_file: null, title: '', subtitle: '', link_text: 'Explore Collections', link_url: '/collections/all' });
    const [newCreator, setNewCreator] = useState({ name: '', handle: '', platform: 'instagram', followers: '', video_file: null, product_name: '', is_verified: true });

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        setIsLoading(true);
        try {
            const API_URL = getApiUrl();

            const [heroRes, creatorRes, settingsRes, ratesRes] = await Promise.all([
                fetch(`${API_URL}/api/content/hero`),
                fetch(`${API_URL}/api/content/creators`),
                fetch(`${API_URL}/api/settings`),
                fetch(`${API_URL}/api/metal-rates`)
            ]);

            if (heroRes.ok) setHeroSlides(await heroRes.json());
            if (creatorRes.ok) setCreators(await creatorRes.json());
            if (settingsRes.ok) setSettings(await settingsRes.json());
            if (ratesRes.ok) {
                const rates = await ratesRes.json();
                setMetalRates({
                    gold: rates.gold_rate.toString(),
                    silver: rates.silver_rate.toString()
                });
            }
        } catch (error) {
            console.error("Error fetching content:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const API_URL = getApiUrl();
            const endpoint = type === 'hero' ? `api/content/hero/${id}` : `api/content/creators/${id}`;
            const res = await fetch(`${API_URL}/${endpoint}`, { method: 'DELETE' });

            if (res.ok) {
                fetchContent(); // Refresh
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const uploadWithProgress = (url, formData) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
        });
    };

    const handleAddHero = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const API_URL = getApiUrl();
            const formData = new FormData();
            formData.append('title', newSlide.title);
            formData.append('subtitle', newSlide.subtitle);
            formData.append('link_text', newSlide.link_text);
            formData.append('link_url', newSlide.link_url);
            if (newSlide.image_file) formData.append('image_file', newSlide.image_file);
            if (newSlide.mobile_image_file) formData.append('mobile_image_file', newSlide.mobile_image_file);

            await uploadWithProgress(`${API_URL}/api/content/hero`, formData);

            setShowHeroForm(false);
            setNewSlide({ image_file: null, mobile_image_file: null, title: '', subtitle: '', link_text: 'Explore Collections', link_url: '/collections/all' });
            fetchContent();
        } catch (error) {
            console.error("Add error:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleAddCreator = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const API_URL = getApiUrl();
            const formData = new FormData();
            formData.append('name', newCreator.name);
            formData.append('handle', newCreator.handle);
            formData.append('platform', newCreator.platform);
            formData.append('followers', newCreator.followers);
            formData.append('product_name', newCreator.product_name);
            if (newCreator.video_file) {
                formData.append('video_file', newCreator.video_file);
            }

            await uploadWithProgress(`${API_URL}/api/content/creators`, formData);

            setShowCreatorForm(false);
            setNewCreator({ name: '', handle: '', platform: 'instagram', followers: '', video_file: null, product_name: '', is_verified: true });
            fetchContent();
        } catch (error) {
            console.error("Add error:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleMetalRateUpdate = async (e) => {
        if (e) e.preventDefault();
        setSavingRates(true);
        setRateMessage('');

        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_URL}/api/admin/metal-rates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gold_rate: parseFloat(metalRates.gold),
                    silver_rate: parseFloat(metalRates.silver)
                })
            });

            if (response.ok) {
                setRateMessage('Rates updated successfully!');
                setTimeout(() => setRateMessage(''), 3000);
            } else {
                setRateMessage('Failed to update rates');
            }
        } catch (error) {
            setRateMessage('Error: ' + error.message);
        } finally {
            setSavingRates(false);
        }
    };

    const handleSettingsUpdate = async (newSettings) => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, ...newSettings })
            });

            if (res.ok) {
                setSettings(await res.json());
            }
        } catch (error) {
            console.error("Update error:", error);
        }
    };

    return (
        <AdminLayout>
            <Head>
                <title>Content Management - Varaha Admin</title>
            </Head>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Homepage Content</h1>
                <p className="text-gray-500">Manage Hero Banners and Influencer Videos</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('hero')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'hero' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Hero Slider
                </button>
                <button
                    onClick={() => setActiveTab('creators')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'creators' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Influencer Videos
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'settings' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Display Settings
                </button>
                <button
                    onClick={() => setActiveTab('metal-rates')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'metal-rates' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Metal Rates
                </button>
            </div>

            {/* METAL RATES CONTENT */}
            {activeTab === 'metal-rates' && (
                <div className="animate-fadeIn max-w-2xl">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Manage Metal Rates</h2>

                    <form onSubmit={handleMetalRateUpdate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        {/* Gold Rate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <DollarSign size={16} className="text-yellow-500" />
                                Gold Rate (22 Carat)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={metalRates.gold}
                                    onChange={(e) => setMetalRates({ ...metalRates, gold: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper/20 focus:border-copper"
                                    placeholder="124040"
                                    step="0.01"
                                    required
                                />
                                <span className="absolute right-3 top-3 text-gray-500 text-sm">per 10 grams</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Current market rate for 22 carat gold per 10 grams</p>
                        </div>

                        {/* Silver Rate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <DollarSign size={16} className="text-gray-400" />
                                Silver Rate (999 Purity)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={metalRates.silver}
                                    onChange={(e) => setMetalRates({ ...metalRates, silver: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper/20 focus:border-copper"
                                    placeholder="208900"
                                    step="0.01"
                                    required
                                />
                                <span className="absolute right-3 top-3 text-gray-500 text-sm">per 1 kilogram</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Current market rate for 999 purity silver per kilogram</p>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm">
                                {rateMessage && (
                                    <span className={`font-medium ${rateMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                                        {rateMessage}
                                    </span>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={savingRates}
                                className="flex items-center gap-2 px-6 py-2 bg-copper text-white rounded-lg hover:bg-heritage disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Save size={18} />
                                {savingRates ? 'Saving...' : 'Save Rates'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <TrendingUp size={18} /> How it works:
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1 ml-1">
                            <li>• Base rates are displayed on the footer with ±0.8% random fluctuation</li>
                            <li>• Rates update every 30 seconds with simulated market changes</li>
                            <li>• Update these values to reflect real market prices</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* HERO SLIDER CONTENT */}
            {activeTab === 'hero' && (
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800">Active Slides ({heroSlides.length})</h2>
                        <button
                            onClick={() => setShowHeroForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:bg-heritage transition-colors"
                        >
                            <Plus size={18} /> Add New Slide
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {heroSlides.map(slide => (
                            <div key={slide.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group relative">
                                <div className="aspect-video relative bg-gray-100">
                                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => handleDelete('hero', slide.id)}
                                            className="p-3 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 mb-1">{slide.title}</h3>
                                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{slide.subtitle}</p>
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>Link: {slide.link_text}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showHeroForm && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4">Add New Slide</h3>
                                <form onSubmit={handleAddHero} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Desktop Image</label>
                                        <input required type="file" accept="image/*" className="w-full p-2 border rounded-lg" onChange={e => setNewSlide({ ...newSlide, image_file: e.target.files[0] })} />
                                        <p className="text-xs text-gray-500 mt-1">Recommended: 1920x1080px</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                        <input required className="w-full p-2 border rounded-lg" value={newSlide.title} onChange={e => setNewSlide({ ...newSlide, title: e.target.value })} placeholder="e.g. Royal Heritage" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Image (Optional)</label>
                                        <input type="file" accept="image/*" className="w-full p-2 border rounded-lg" onChange={e => setNewSlide({ ...newSlide, mobile_image_file: e.target.files[0] })} />
                                        <p className="text-xs text-gray-500 mt-1">Recommended: 1080x1920px</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                        <textarea required className="w-full p-2 border rounded-lg" value={newSlide.subtitle} onChange={e => setNewSlide({ ...newSlide, subtitle: e.target.value })} placeholder="Description..." />
                                    </div>
                                    {isUploading && (
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                            <div className="bg-copper h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                            <p className="text-center text-xs mt-1 text-gray-600">{uploadProgress}% Uploading...</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end mt-6">
                                        <button type="button" onClick={() => setShowHeroForm(false)} disabled={isUploading} className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                        <button type="submit" disabled={isUploading} className="px-4 py-2 bg-copper text-white rounded-lg hover:bg-heritage disabled:opacity-50">
                                            {isUploading ? 'Uploading...' : 'Add Slide'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CREATORS CONTENT */}
            {activeTab === 'creators' && (
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800">Influencer Videos ({creators.length})</h2>
                        <button
                            onClick={() => setShowCreatorForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:bg-heritage transition-colors"
                        >
                            <Plus size={18} /> Add Creator
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {creators.map(video => (
                            <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                                <div className="aspect-[9/16] relative bg-black">
                                    <video src={video.video_url} className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded uppercase font-bold">
                                        {video.platform}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => handleDelete('creators', video.id)}
                                            className="p-3 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800">{video.name}</h3>
                                    <p className="text-sm text-gray-500 mb-1">{video.handle}</p>
                                    <p className="text-xs text-copper font-medium mt-2">Wearing: {video.product_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showCreatorForm && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                                <h3 className="text-xl font-bold mb-4">Add Creator Video</h3>
                                <form onSubmit={handleAddCreator} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Creator Name</label>
                                        <input required className="w-full p-2 border rounded-lg" value={newCreator.name} onChange={e => setNewCreator({ ...newCreator, name: e.target.value })} placeholder="e.g. Priya Sharma" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Handle (@username)</label>
                                        <input required className="w-full p-2 border rounded-lg" value={newCreator.handle} onChange={e => setNewCreator({ ...newCreator, handle: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                            <select className="w-full p-2 border rounded-lg" value={newCreator.platform} onChange={e => setNewCreator({ ...newCreator, platform: e.target.value })}>
                                                <option value="instagram">Instagram</option>
                                                <option value="youtube">YouTube</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
                                            <input required className="w-full p-2 border rounded-lg" value={newCreator.followers} onChange={e => setNewCreator({ ...newCreator, followers: e.target.value })} placeholder="e.g. 1.2M" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video (MP4)</label>
                                        <input required type="file" accept="video/mp4,video/quicktime" className="w-full p-2 border rounded-lg" onChange={e => setNewCreator({ ...newCreator, video_file: e.target.files[0] })} />
                                        <p className="text-xs text-gray-500 mt-1">Video will be uploaded to Supabase Storage</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Wearing</label>
                                        <input required className="w-full p-2 border rounded-lg" value={newCreator.product_name} onChange={e => setNewCreator({ ...newCreator, product_name: e.target.value })} />
                                    </div>
                                    {isUploading && (
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                            <div className="bg-copper h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                            <p className="text-center text-xs mt-1 text-gray-600">{uploadProgress}% Uploading...</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end mt-6">
                                        <button type="button" onClick={() => setShowCreatorForm(false)} disabled={isUploading} className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                        <button type="submit" disabled={isUploading} className="px-4 py-2 bg-copper text-white rounded-lg hover:bg-heritage disabled:opacity-50">
                                            {isUploading ? 'Uploading...' : 'Add Video'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SETTINGS CONTENT */}
            {activeTab === 'settings' && settings && (
                <div className="animate-fadeIn max-w-2xl">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Site Visibility Settings</h2>


                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

                        {/* General Settings */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">General Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg"
                                        value={settings.store_name || ''}
                                        onChange={(e) => handleSettingsUpdate({ store_name: e.target.value })}
                                        placeholder="Varaha Jewels"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border rounded-lg"
                                        value={settings.support_email || ''}
                                        onChange={(e) => handleSettingsUpdate({ support_email: e.target.value })}
                                        placeholder="support@varahajewels.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Announcement Bar Settings */}
                        <div>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-bold text-gray-800">Announcement Bar</h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.show_announcement}
                                        onChange={(e) => handleSettingsUpdate({ show_announcement: e.target.checked })}
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-copper/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-copper"></div>
                                </label>
                            </div>

                            {settings.show_announcement && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Text</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg"
                                            value={settings.announcement_text || ''}
                                            onChange={(e) => handleSettingsUpdate({ announcement_text: e.target.value })}
                                            placeholder="Grand Launch In:"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Date (Target for timer)</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full p-2 border rounded-lg"
                                            value={settings.announcement_date ? settings.announcement_date.slice(0, 16) : ''}
                                            onChange={(e) => handleSettingsUpdate({ announcement_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visibility Toggles Header */}
                        <h3 className="font-bold text-gray-800 border-b pb-2 pt-2">Visibility Controls</h3>

                        {/* Launch Countdown Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-bold text-gray-800">Launch Countdown Page</h3>
                                <p className="text-sm text-gray-500">Show the full-screen countdown timer when users first visit.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.show_full_page_countdown}
                                    onChange={(e) => handleSettingsUpdate({ show_full_page_countdown: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-copper/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-copper"></div>
                            </label>
                        </div>


                        {/* Spotlight Settings */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-bold text-gray-800">Spotlight Content Source</h3>
                                <p className="text-sm text-gray-500">Choose what products to display in the main Homepage Spotlight section.</p>
                            </div>
                            <select
                                value={settings.spotlight_source || 'featured'}
                                onChange={(e) => handleSettingsUpdate({ spotlight_source: e.target.value })}
                                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-copper/20 focus:border-copper"
                            >
                                <option value="featured">Featured Collection (Default)</option>
                                <option value="new_arrivals">New Arrivals</option>
                            </select>
                        </div>

                        {/* Shipping Settings */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-bold text-gray-800">Enable RapidShyp API</h3>
                                <p className="text-sm text-gray-500">Enable real API calls for creating shipments. If disabled, shipments will be simulated (no charges).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.rapidshyp_enabled === 'true'}
                                    onChange={(e) => handleSettingsUpdate({ rapidshyp_enabled: e.target.checked ? 'true' : 'false' })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-copper/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-copper"></div>
                            </label>
                        </div>

                        {/* Maintenance Mode Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-bold text-gray-800">Maintenance Mode</h3>
                                <p className="text-sm text-gray-500">Redirect all homepage visitors to "Coming Soon" page.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.is_maintenance_mode}
                                    onChange={(e) => handleSettingsUpdate({ is_maintenance_mode: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
