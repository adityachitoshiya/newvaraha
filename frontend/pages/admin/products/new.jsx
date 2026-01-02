import { useState } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../../lib/config';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from '../../../components/admin/ImageUpload';

export default function NewProduct() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Artificial',
        metal: 'Brass',
        carat: 'N/A',
        stones: '',
        polish: 'Gold Plated',
        premium: false,
        tag: 'New',
        style: '',
        image: '/varaha-assets/logo.png', // Default placeholder
        additional_images: ['', '', ''], // Array for 3 slots
        id: `prod-${Date.now()}`
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMainImageUpload = (url) => {
        setFormData(prev => ({ ...prev, image: url }));
    };

    const handleAdditionalImageUpload = (index, url) => {
        const newImages = [...formData.additional_images];
        newImages[index] = url;
        setFormData(prev => ({ ...prev, additional_images: newImages }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem('admin_token');

            // Filter out empty strings from additional images
            const validAdditionalImages = formData.additional_images.filter(img => img && img.trim() !== '');

            const dataToSend = {
                ...formData,
                price: parseFloat(formData.price),
                stones: formData.stones ? JSON.stringify(formData.stones.split(',').map(s => s.trim())) : '[]',
                additional_images: JSON.stringify(validAdditionalImages)
            };

            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                throw new Error('Failed to create product');
            }

            router.push('/admin/products');
        } catch (error) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center gap-4">
                <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Add New Product</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Basic Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                >
                                    <option value="Artificial">Artificial Jewellery</option>
                                    <option value="Heritage">Heritage Collection</option>
                                    <option value="Bridal">Bridal</option>
                                    <option value="Gold">Gold Jewellery</option>
                                    <option value="Diamond">Diamond</option>
                                    <option value="Polki">Polki</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Specifications */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Specifications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Material / Metal</label>
                                <input
                                    type="text"
                                    name="metal"
                                    value={formData.metal}
                                    onChange={handleChange}
                                    placeholder="e.g. Brass, Copper, Gold"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">For artificial, specify base metal.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purity / Carat</label>
                                <input
                                    type="text"
                                    name="carat"
                                    value={formData.carat}
                                    onChange={handleChange}
                                    placeholder="e.g. N/A for Artificial"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Polish / Finish</label>
                                <input
                                    type="text"
                                    name="polish"
                                    value={formData.polish}
                                    onChange={handleChange}
                                    placeholder="e.g. Gold Plated, Oxidised"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stones (comma separated)</label>
                                <input
                                    type="text"
                                    name="stones"
                                    value={formData.stones}
                                    onChange={handleChange}
                                    placeholder="e.g. AD, Zircon, Beads"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tag (Optional)</label>
                                <input
                                    type="text"
                                    name="tag"
                                    value={formData.tag}
                                    onChange={handleChange}
                                    placeholder="e.g. New"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Media & Status */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Product Images</h3>
                        <p className="text-sm text-gray-500 mb-4">Click to upload. Images will be auto-compressed. Support up to 4 images.</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {/* Main Image */}
                            <ImageUpload
                                label="Main Image"
                                initialImage={formData.image === '/varaha-assets/logo.png' ? '' : formData.image}
                                onUpload={handleMainImageUpload}
                            />

                            {/* Additional Images Slots */}
                            {[0, 1, 2].map((index) => (
                                <ImageUpload
                                    key={index}
                                    label={`Additional ${index + 1}`}
                                    initialImage={formData.additional_images[index]}
                                    onUpload={(url) => handleAdditionalImageUpload(index, url)}
                                />
                            ))}
                        </div>

                        <div className="flex items-center pt-6 mt-4 border-t border-gray-50">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="premium"
                                    checked={formData.premium}
                                    onChange={handleChange}
                                    className="form-checkbox h-5 w-5 text-copper rounded focus:ring-copper border-gray-300"
                                />
                                <span className="ml-2 text-gray-700 font-medium">Mark as Premium Product</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 bg-gradient-to-r from-copper to-heritage text-white font-bold rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:transform-none"
                        >
                            <Save size={20} />
                            {isLoading ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
