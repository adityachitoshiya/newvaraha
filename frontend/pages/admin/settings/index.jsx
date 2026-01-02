import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import AdminLayout from '../../../components/admin/AdminLayout';
import Head from 'next/head';
import { Save, Plus, Trash2, X, Check, ShieldCheck } from 'lucide-react';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'payment'
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        store_name: "Varaha Jewels",
        support_email: "support@varahajewels.com",
        currency_symbol: "₹",
        announcement_text: "Grand Launch In:",
        announcement_date: "2026-02-12T00:00:00",
        show_announcement: true,
        delivery_free_threshold: 1000.0,
        logo_url: "/varaha-assets/logo.png"
    });

    // Payment Gateway State
    const [gateways, setGateways] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newGateway, setNewGateway] = useState({ name: '', provider: 'razorpay' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const API_URL = getApiUrl();

            const token = localStorage.getItem('admin_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const [settingsRes, gatewaysRes] = await Promise.all([
                fetch(`${API_URL}/api/settings`),
                fetch(`${API_URL}/api/gateways`, { headers })
            ]);

            if (settingsRes.ok) setSettings(await settingsRes.json());

            if (gatewaysRes.ok) {
                const gData = await gatewaysRes.json();
                setGateways(gData.map(g => ({
                    ...g,
                    credentials: JSON.parse(g.credentials_json || '{}')
                })));
            } else if (gatewaysRes.status === 401) {
                // If unauthorized, just set empty or redirect if strictly needed
                // For settings page, 401 on gateways might mean session expired
                console.warn("Unauthorized to fetch gateways");
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) alert('Store settings saved!');
        } catch (e) {
            console.error(e);
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // ... (Existing Payment Gateway Functions: handleCredentialChange, handleToggleActive, handleSaveGateway, handleDelete, handleAddGateway) ...
    // RE-IMPLEMENTING THEM FOR CONTEXT

    const handleCredentialChange = (id, key, value) => {
        setGateways(prev => prev.map(g => {
            if (g.id === id) return { ...g, credentials: { ...g.credentials, [key]: value } };
            return g;
        }));
    };

    const handleToggleActive = async (gateway) => {
        const newStatus = !gateway.is_active;

        // Optimistic Update
        setGateways(prev => prev.map(g => {
            if (g.id === gateway.id) return { ...g, is_active: newStatus };
            if (newStatus && g.id !== gateway.id) return { ...g, is_active: false }; // Enforce single active active
            return g;
        }));

        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = getApiUrl();

            // Clean credentials specifically for the update
            const cleanedCredentials = Object.keys(gateway.credentials).reduce((acc, key) => {
                const val = gateway.credentials[key];
                acc[key] = typeof val === 'string' ? val.trim() : val;
                return acc;
            }, {});

            const res = await fetch(`${API_URL}/api/gateways/${gateway.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    is_active: newStatus,
                    credentials: cleanedCredentials
                })
            });

            if (res.ok) {
                // Success - no op needed as optimistic update covered it
                // Optionally fetch data relative to server
            } else {
                throw new Error("Failed");
            }

        } catch (error) {
            console.error(error);
            alert("Failed to toggle status. Please try again.");
            fetchData(); // Revert
        }
    };

    const handleSaveGateway = async (gateway) => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const cleanedCredentials = Object.keys(gateway.credentials).reduce((acc, key) => {
                const val = gateway.credentials[key];
                acc[key] = typeof val === 'string' ? val.trim() : val;
                return acc;
            }, {});

            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/gateways/${gateway.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: gateway.is_active, credentials: cleanedCredentials })
            });

            if (res.ok) {
                alert(`Settings for ${gateway.name} saved!`);
                fetchData();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this gateway?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/gateways/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setGateways(prev => prev.filter(g => g.id !== id));
        } catch (error) { alert('Error deleting'); }
    };

    const handleAddGateway = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('admin_token');
            let initialCreds = {};
            if (newGateway.provider === 'razorpay') initialCreds = { key_id: '', key_secret: '' };
            if (newGateway.provider === 'phonepe') initialCreds = { merchant_id: '', salt_key: '', salt_index: '1' };
            if (newGateway.provider === 'pinelabs') initialCreds = { merchant_id: '', api_key: '' };

            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/gateways`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newGateway.name,
                    provider: newGateway.provider,
                    credentials: initialCreds
                })
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewGateway({ name: '', provider: 'razorpay' });
                fetchData();
            }
        } catch (error) { alert('Error creating gateway'); }
    };

    // ... (Helper: getIcon) ...
    const getIcon = (provider) => {
        if (provider === 'razorpay') return "https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg";
        if (provider === 'phonepe') return "https://download.logo.wine/logo/PhonePe/PhonePe-Logo.wine.png";
        if (provider === 'pinelabs') return "https://upload.wikimedia.org/wikipedia/commons/5/5d/Pine_Labs_logo.svg";
        return "/varaha-assets/logo.png";
    }

    return (
        <AdminLayout>
            <Head><title>Store Settings - Varaha Admin</title></Head>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your store details and configuration.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'general' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('payment')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'payment' ? 'text-copper border-b-2 border-copper' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Payment Gateways
                </button>
            </div>

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="max-w-2xl animate-fadeIn">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Store Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                <input value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                <input value={settings.support_email} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                <input value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Announcement Bar</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={settings.show_announcement} onChange={(e) => setSettings({ ...settings, show_announcement: e.target.checked })} id="showAnnounce" />
                                <label htmlFor="showAnnounce" className="text-sm font-medium text-gray-700">Show Announcement Bar</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Text</label>
                                <input value={settings.announcement_text} onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Launch/Countdown Date</label>
                                <input type="datetime-local" value={settings.announcement_date.substring(0, 16)} onChange={(e) => setSettings({ ...settings, announcement_date: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button onClick={handleSaveGeneral} disabled={isSaving} className="px-6 py-2 bg-copper text-white rounded-lg hover:bg-heritage transition-colors flex items-center gap-2">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* PAYMENT TAB */}
            {activeTab === 'payment' && (
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Configure Gateways</h2>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:bg-heritage">
                            <Plus size={18} /> Add Gateway
                        </button>
                    </div>
                    {/* ... Existing Gateway Mapping Logic ... */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {gateways.map(gateway => (
                            <div key={gateway.id} className={`bg-white rounded-xl border p-6 transition-all ${gateway.is_active ? 'border-copper ring-1 ring-copper shadow-sm' : 'border-gray-200 opacity-90'}`}>
                                {/* ... Same Card Content ... */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <img src={getIcon(gateway.provider)} className="w-10 h-10 object-contain" alt="" />
                                        <div>
                                            <h3 className="font-bold">{gateway.name}</h3>
                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{gateway.provider}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleToggleActive(gateway)} className={`px-3 py-1 text-xs rounded-full ${gateway.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                            {gateway.is_active ? 'Active' : 'Enable'}
                                        </button>
                                        <button onClick={() => handleDelete(gateway.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                {/* Credential Inputs */}
                                <div className="space-y-3">
                                    {Object.keys(gateway.credentials).map(key => (
                                        <div key={key}>
                                            <label className="block text-xs font-medium text-gray-500 capitalize mb-1">{key.replace('_', ' ')}</label>
                                            <input
                                                type={key.includes('secret') || key.includes('key') ? 'password' : 'text'}
                                                value={gateway.credentials[key]}
                                                onChange={(e) => handleCredentialChange(gateway.id, key, e.target.value)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                    <button onClick={() => handleSaveGateway(gateway)} className="text-sm font-medium text-copper flex items-center gap-1">
                                        <Save size={14} /> Save Config
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4">Add Gateway</h3>
                        {/* ... Simplified Form ... */}
                        <form onSubmit={handleAddGateway} className="space-y-4">
                            <input value={newGateway.name} onChange={e => setNewGateway({ ...newGateway, name: e.target.value })} placeholder="Name (e.g. UPI)" className="w-full p-2 border rounded" required />
                            <select value={newGateway.provider} onChange={e => setNewGateway({ ...newGateway, provider: e.target.value })} className="w-full p-2 border rounded">
                                <option value="razorpay">Razorpay</option>
                                <option value="phonepe">PhonePe</option>
                                <option value="pinelabs">Pine Labs</option>
                            </select>
                            <div className="flex gap-2 justify-end mt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-copper text-white rounded">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
