import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { Tag, Trash2, Plus } from 'lucide-react';

export default function Coupons() {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: ''
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/coupons`);
            if (res.ok) {
                setCoupons(await res.json());
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token'); // Assuming auth
            const res = await fetch(`${API_URL}/api/coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newCoupon,
                    discount_value: parseFloat(newCoupon.discount_value),
                    is_active: true
                })
            });

            if (res.ok) {
                setIsCreating(false);
                setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '' });
                fetchCoupons();
            } else {
                alert('Failed to create coupon');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            const API_URL = getApiUrl();
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/coupons/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchCoupons();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AdminLayout>
            <Head>
                <title>Coupons - Varaha Admin</title>
            </Head>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Coupons</h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-copper text-white px-4 py-2 rounded-lg hover:bg-heritage transition-colors"
                >
                    <Plus size={20} /> Create Coupon
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <h3 className="font-bold text-lg mb-4">New Coupon</h3>
                    <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                            <input
                                type="text"
                                value={newCoupon.code}
                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                className="w-full p-2 border rounded-lg uppercase"
                                placeholder="SUMMER50"
                                required
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={newCoupon.discount_type}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                                className="w-full p-2 border rounded-lg"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹ Off)</option>
                                <option value="flat_price">Flat Price (Set Price to ₹)</option>
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                            <input
                                type="number"
                                value={newCoupon.discount_value}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                                className="w-full p-2 border rounded-lg"
                                placeholder="50"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-copper text-white px-6 py-2 rounded-lg hover:bg-heritage">Save</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : coupons.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">No coupons found</td></tr>
                        ) : (
                            coupons.map(coupon => (
                                <tr key={coupon.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono font-bold text-copper">{coupon.code}</td>
                                    <td className="px-6 py-4 capitalize text-sm">{coupon.discount_type.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">
                                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(coupon.id)} className="text-gray-400 hover:text-red-500">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </AdminLayout>
    );
}
