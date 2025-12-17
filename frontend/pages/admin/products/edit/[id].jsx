import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../../../lib/config';
import AdminLayout from '../../../../components/admin/AdminLayout';
import { Save, ArrowLeft, Trash2, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from '../../../../components/admin/ImageUpload';

export default function EditProduct() {
    const router = useRouter();
    const { id } = router.query;
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [reviews, setReviews] = useState([]);

    // Initial State
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
        image: '',
        additional_images: [],
    });

    const [newReview, setNewReview] = useState({
        customer_name: '',
        rating: 5,
        comment: '',
        media_urls: []
    });

    useEffect(() => {
        if (id) {
            fetchProductData();
        }
    }, [id]);

    const fetchProductData = async () => {
        try {
            const API_URL = getApiUrl();
            const [productRes, reviewRes] = await Promise.all([
                fetch(`${API_URL}/api/products/${id}`),
                fetch(`${API_URL}/api/reviews/${id}`)
            ]);

            if (productRes.ok) {
                const product = await productRes.json();
                setFormData({
                    ...product,
                    stones: product.stones ? JSON.parse(product.stones).join(', ') : '',
                    additional_images: product.additional_images ? JSON.parse(product.additional_images) : []
                });
            } else {
                alert('Product not found');
                router.push('/admin/products');
            }

            if (reviewRes.ok) {
                setReviews(await reviewRes.json());
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
        // Ensure array is large enough
        const newImages = [...formData.additional_images];
        while (newImages.length <= index) newImages.push('');

        newImages[index] = url;
        setFormData(prev => ({ ...prev, additional_images: newImages }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const dataToSend = {
                ...formData,
                price: parseFloat(formData.price),
                stones: formData.stones ? JSON.stringify(formData.stones.split(',').map(s => s.trim())) : '[]',
                additional_images: JSON.stringify(formData.additional_images)
            };

            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) throw new Error('Failed to update product');
            alert('Product updated successfully!');

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddReview = async (e) => {
        e.preventDefault();
        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...newReview, product_id: id })
            });

            if (res.ok) {
                fetchProductData(); // Refresh reviews
                setNewReview({ customer_name: '', rating: 5, comment: '', media_urls: [] });
            }
        } catch (error) {
            alert('Failed to add review');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!confirm("Delete this review?")) return;
        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token');
            await fetch(`${API_URL}/api/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchProductData();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    if (isLoading) return <AdminLayout><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Product Details</h3>
                        <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input className="w-full p-2 border rounded-lg" name="name" value={formData.name} onChange={handleChange} required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea className="w-full p-2 border rounded-lg" name="description" value={formData.description} onChange={handleChange} rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg" name="price" value={formData.price} onChange={handleChange} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select className="w-full p-2 border rounded-lg" name="category" value={formData.category} onChange={handleChange}>
                                        <option value="Artificial">Artificial Jewellery</option>
                                        <option value="Heritage">Heritage Collection</option>
                                        <option value="Bridal">Bridal</option>
                                        <option value="Gold">Gold Jewellery</option>
                                        <option value="Diamond">Diamond</option>
                                        <option value="Polki">Polki</option>
                                    </select>
                                </div>
                            </div>

                            {/* Additional Specs */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                                <div><label className="text-xs text-gray-500">Metal</label><input className="w-full p-2 border rounded" name="metal" value={formData.metal} onChange={handleChange} /></div>
                                <div><label className="text-xs text-gray-500">Purity</label><input className="w-full p-2 border rounded" name="carat" value={formData.carat} onChange={handleChange} /></div>
                                <div><label className="text-xs text-gray-500">Polish</label><input className="w-full p-2 border rounded" name="polish" value={formData.polish} onChange={handleChange} /></div>
                                <div className="col-span-2"><label className="text-xs text-gray-500">Stones (comma sep)</label><input className="w-full p-2 border rounded" name="stones" value={formData.stones} onChange={handleChange} /></div>
                                <div><label className="text-xs text-gray-500">Tag</label><input className="w-full p-2 border rounded" name="tag" value={formData.tag} onChange={handleChange} /></div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-copper text-white rounded-lg font-bold hover:bg-heritage transition-colors">
                                {isSaving ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Image Management */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Media Gallery</h3>
                        <p className="text-sm text-gray-500 mb-4">Click to upload. Images will be auto-compressed. Support up to 4 images.</p>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Main Image */}
                            <ImageUpload
                                label="Main Image"
                                initialImage={formData.image}
                                onUpload={handleMainImageUpload}
                            />

                            {/* Additional Images Slots */}
                            {[0, 1, 2].map((index) => (
                                <ImageUpload
                                    key={index}
                                    label={`Additional ${index + 1}`}
                                    initialImage={formData.additional_images[index] || ''}
                                    onUpload={(url) => handleAdditionalImageUpload(index, url)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Customer Reviews</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6">
                            {reviews.length === 0 && <p className="text-gray-500 text-center py-4">No reviews yet.</p>}
                            {reviews.map(review => (
                                <div key={review.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            <p className="font-bold text-sm text-gray-800">{review.customer_name}</p>
                                        </div>
                                        <button onClick={() => handleDeleteReview(review.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                                </div>
                            ))}
                        </div>

                        <h4 className="font-medium text-sm text-gray-700 mb-2 border-t pt-4">Add Manual Review</h4>
                        <form onSubmit={handleAddReview} className="space-y-3">
                            <input className="w-full p-2 text-sm border rounded" placeholder="Customer Name" value={newReview.customer_name} onChange={e => setNewReview({ ...newReview, customer_name: e.target.value })} required />
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Rating:</span>
                                <select className="p-1 border rounded text-sm" value={newReview.rating} onChange={e => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}>
                                    <option value="5">5 Stars</option>
                                    <option value="4">4 Stars</option>
                                    <option value="3">3 Stars</option>
                                    <option value="2">2 Stars</option>
                                    <option value="1">1 Star</option>
                                </select>
                            </div>
                            <textarea className="w-full p-2 text-sm border rounded" placeholder="Review Comment" rows={2} value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} required />
                            <button type="submit" className="w-full py-2 bg-gray-800 text-white text-sm rounded hover:bg-black transition-colors">Add Review</button>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
