import { useState } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../lib/config';
import Head from 'next/head';
import Image from 'next/image';
import { Lock, User } from 'lucide-react';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // In a real scenario, this matches the backend URL
            const response = await fetch(`${getApiUrl()}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: username,
                    password: password,
                }),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            localStorage.setItem('admin_token', data.access_token);
            router.push('/admin');
        } catch (err) {
            setError(err.message || 'Login failed. Is the backend server running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Head>
                <title>Admin Login - Varaha Jewels</title>
            </Head>

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8 sm:p-10">
                    <div className="flex justify-center mb-8">
                        <div className="relative w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                            <Image
                                src="/varaha-assets/logo.png"
                                alt="Varaha Jewels"
                                width={100}
                                height={50}
                                className="w-16 h-auto"
                            />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Admin Panel</h2>
                    <p className="text-center text-gray-500 mb-8">Sign in to manage your store</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent transition-all"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent transition-all"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-copper to-heritage text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">Varaha Jewels &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}
