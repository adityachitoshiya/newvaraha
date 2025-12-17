import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
import Head from 'next/head';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            } else {
                console.error('Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchProducts();
            } else {
                alert('Failed to delete product');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting product');
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Get unique categories statically + dynamic ones from data
    const predefinedCategories = ['Artificial', 'Heritage', 'Bridal', 'Gold', 'Diamond', 'Polki'];
    const dynamicCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const allCategories = ['All', ...new Set([...predefinedCategories, ...dynamicCategories])];

    return (
        <AdminLayout>
            <Head>
                <title>Products - Varaha Admin</title>
            </Head>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-xl font-bold text-gray-800">Products Inventory</h1>
                <Link
                    href="/admin/products/new"
                    className="px-4 py-2 bg-gradient-to-r from-copper to-heritage text-white font-medium rounded-lg flex items-center gap-2 hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    Add New Product
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tools Bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-copper cursor-pointer"
                        >
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tag</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading inventory...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No products found</td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center">
                                                <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden mr-4 border border-gray-200">
                                                    <img
                                                        className="h-full w-full object-cover"
                                                        src={product.image}
                                                        alt={product.name}
                                                        onError={(e) => e.target.src = '/varaha-assets/logo.png'}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500">{product.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-sm text-gray-500">
                                                <span className="block text-xs">Metal: <span className="text-gray-700">{product.metal || 'N/A'}</span></span>
                                                <span className="block text-xs">Purity: <span className="text-gray-700">{product.carat || 'N/A'}</span></span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm font-bold text-gray-900">
                                            ₹{product.price?.toLocaleString() || 'On Request'}
                                        </td>
                                        <td className="px-6 py-3">
                                            {product.category === 'Artificial' ? (
                                                <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-pink-100 text-pink-800 border border-pink-200">
                                                    Artificial
                                                </span>
                                            ) : product.premium ? (
                                                <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                                    Premium
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                                    Standard
                                                </span>
                                            )}
                                            {product.tag && (
                                                <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                                                    {product.tag}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/products/edit/${product.id}`} className="p-1 text-gray-400 hover:text-copper transition-colors">
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors text-trash"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
