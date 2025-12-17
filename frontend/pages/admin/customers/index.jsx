import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import AdminLayout from '../../../components/admin/AdminLayout';
import Head from 'next/head';
import { Search, Mail, Phone, MapPin } from 'lucide-react';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            // Since we don't have a dedicated customers endpoint yet, we'll derive it from orders
            const res = await fetch(`${getApiUrl()}/api/orders`);
            if (res.ok) {
                const orders = await res.json();

                const uniqueCustomers = {};

                orders.forEach(order => {
                    if (!uniqueCustomers[order.email]) {
                        uniqueCustomers[order.email] = {
                            id: order.email, // using email as ID for now
                            name: order.customer_name,
                            email: order.email,
                            phone: order.phone,
                            city: order.city,
                            totalOrders: 0,
                            totalSpent: 0,
                            lastOrder: order.created_at
                        };
                    }

                    uniqueCustomers[order.email].totalOrders += 1;
                    uniqueCustomers[order.email].totalSpent += order.total_amount;
                    if (new Date(order.created_at) > new Date(uniqueCustomers[order.email].lastOrder)) {
                        uniqueCustomers[order.email].lastOrder = order.created_at;
                    }
                });

                setCustomers(Object.values(uniqueCustomers));
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <Head>
                <title>Customers - Varaha Admin</title>
            </Head>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Orders</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading customers...</td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No customers found</td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-copper/10 text-copper flex items-center justify-center font-bold mr-3">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-medium text-gray-900">{customer.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Mail size={14} className="mr-2" />
                                                    {customer.email}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Phone size={14} className="mr-2" />
                                                    {customer.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <MapPin size={14} className="mr-2" />
                                                {customer.city}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {customer.totalOrders}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                            ₹{customer.totalSpent.toLocaleString()}
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
