import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/config';
import { Mail, Lock, AlertCircle, ArrowRight, Loader2, Facebook, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
    const router = useRouter();
    const { registered, check_email } = router.query;
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [showFacebookModal, setShowFacebookModal] = useState(false);

    useEffect(() => {
        if (registered) {
            setSuccessMsg("Account created successfully! Please sign in.");
        }
        if (check_email) {
            setSuccessMsg("Account created! Please check your email to verify your account, then sign in.");
        }

        const handleSession = (session) => {
            const fullName = session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email.split('@')[0];
            const userData = {
                id: session.user.id,
                full_name: fullName,
                name: fullName,  // For backward compatibility
                email: session.user.email,
                role: 'customer'
            };

            localStorage.setItem('customer_token', session.access_token);
            localStorage.setItem('customer_user', JSON.stringify(userData));

            setTimeout(() => router.push('/'), 100);
        };

        // Only auto-login if returning from OAuth (hash present)
        if (typeof window !== 'undefined') {
            // Check if already logged in (for manual users)
            const existingToken = localStorage.getItem('customer_token');
            const existingUser = localStorage.getItem('customer_user');

            // If user is already logged in and not coming from OAuth redirect, go to home
            if (existingToken && existingUser && !window.location.hash?.includes('access_token')) {
                router.push('/');
                return;
            }

            if (window.location.hash && window.location.hash.includes('access_token')) {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) handleSession(session);
                });

                // Allow listener to catch the immediate SIGNED_IN event from the hash
                const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        handleSession(session);
                    }
                });

                return () => {
                    if (authListener && authListener.subscription) {
                        authListener.subscription.unsubscribe();
                    }
                };
            }
        }
    }, [registered, router]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const API_URL = getApiUrl();

        try {
            // Step 1: Login with Supabase (all user data is in Supabase)
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            if (authError) {
                // Step 2: Try Admin Login as fallback
                const formDataBody = new URLSearchParams();
                formDataBody.append('username', formData.email);
                formDataBody.append('password', formData.password);

                const adminRes = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formDataBody
                });

                if (adminRes.ok) {
                    const adminData = await adminRes.json();
                    localStorage.setItem('token', adminData.access_token);
                    document.cookie = `token=${adminData.access_token}; path=/`;
                    router.push('/admin');
                    return;
                }

                throw new Error("Invalid email or password");
            }

            if (data?.session) {
                // Store user data from Supabase
                const fullName = data.user.user_metadata.full_name || data.user.email.split('@')[0];
                const userData = {
                    id: data.user.id,
                    full_name: fullName,
                    name: fullName,  // For backward compatibility
                    email: data.user.email,
                    role: 'customer'
                };

                localStorage.setItem('customer_token', data.session.access_token);
                localStorage.setItem('customer_user', JSON.stringify(userData));

                // Optional: Sync with backend for order tracking
                try {
                    await fetch(`${API_URL}/api/auth/sync`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${data.session.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            full_name: userData.full_name,
                            email: userData.email,
                            provider: 'email'
                        })
                    });
                } catch (syncErr) {
                    console.log('Backend sync skipped:', syncErr);
                }

                router.push('/');
            }
        } catch (err) {
            console.error("Login Failed:", err);
            setError(err.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        if (provider === 'Facebook') {
            setShowFacebookModal(true);
            return;
        }

        if (provider === 'Google') {
            try {
                // Use Supabase Auth
                // Redirects to Google, then back to this page (or window.location.origin)
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
                    }
                });

                if (error) throw error;
                // No need to handle success here, the redirect happens immediately

            } catch (error) {
                console.error("Google Login Error:", error);
                setError("Google Sign In Failed: " + error.message);
            }
            return;
        }

        // Mock Implementation for others
        alert(`Integration Required for ${provider}`);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            <Head>
                <title>Sign In | Varaha Jewels</title>
            </Head>

            {/* Custom Modal for Facebook Error */}
            {showFacebookModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-copper/20 transform transition-all scale-100">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-royal font-bold text-gray-900 mb-2">Temporarily Unavailable</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Facebook Login is currently down for maintenance. We apologize for the inconvenience.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleSocialLogin('Google')}
                                className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Use Google Login Instead
                            </button>
                            <button
                                onClick={() => setShowFacebookModal(false)}
                                className="w-full py-3 px-4 bg-heritage text-white font-medium rounded-lg hover:bg-heritage/90 transition-colors"
                            >
                                Okay, I understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center mb-6">
                    <img
                        className="h-16 w-auto"
                        src="/varaha-assets/logo.png"
                        alt="Varaha Jewels"
                    />
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-serif">
                    Welcome Back
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Sign in to manage your orders and wishlist
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 rounded-2xl sm:px-10 border border-gray-100">

                    {/* Social Login Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={() => handleSocialLogin('Google')}
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={() => handleSocialLogin('Facebook')}
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Facebook className="h-5 w-5 mr-2 text-blue-600" />
                            Facebook
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {successMsg && (
                            <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {successMsg}
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Email Address or Username
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="email"
                                    type="text"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="focus:ring-copper focus:border-copper block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2.5"
                                    placeholder="email@example.com or admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="focus:ring-copper focus:border-copper block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2.5"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-heritage hover:bg-heritage/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2" size={18} />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="ml-2" size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/signup" className="font-medium text-copper hover:text-heritage transition-colors">
                            Don't have an account? Create one
                        </Link>
                    </div>
                </div>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-copper/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-heritage/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
}
