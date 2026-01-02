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

            // Clean the URL hash before redirecting to avoid /#
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, null, window.location.pathname);
            }

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
            // Step 1: Login with Supabase (only if input is an email)
            let data = null;
            let authError = null;

            if (formData.email.includes('@')) {
                const res = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });
                data = res.data;
                authError = res.error;
            } else {
                // If not an email, assume it's a username (Admin) and skip to fallback
                authError = { message: "Username provided, skipping Supabase" };
            }

            if (authError) {
                // Step 2: Try Admin Login as fallback
                console.log("Attempting Admin Login...");
                const formDataBody = new URLSearchParams();
                formDataBody.append('username', formData.email);
                formDataBody.append('password', formData.password);

                console.log(`Sending Admin Login Request to: ${API_URL}/api/login`);

                try {
                    const adminRes = await fetch(`${API_URL}/api/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: formDataBody
                    });

                    console.log("Admin Login Response Status:", adminRes.status);

                    if (adminRes.ok) {
                        const adminData = await adminRes.json();
                        console.log("Admin Login Success", adminData);
                        localStorage.setItem('token', adminData.access_token);
                        document.cookie = `token=${adminData.access_token}; path=/`;
                        router.push('/admin');
                        return;
                    } else {
                        const errorText = await adminRes.text();
                        console.error("Admin Login Failed:", errorText);
                        throw new Error("Invalid admin credentials");
                    }
                } catch (adminErr) {
                    console.error("Admin Fetch Error:", adminErr);
                    throw new Error("Admin login failed: " + adminErr.message);
                }
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
                // Use production URL for redirect, fallback to env or window.location
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                        ? window.location.origin
                        : 'https://newvaraha-nwbd.vercel.app');
                const redirectTo = `${siteUrl}/login`;

                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectTo
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
        <div className="min-h-screen bg-white sm:bg-[#F8F9FA] flex flex-col justify-center py-8 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <Head>
                <title>Sign In | Varaha Jewels</title>
            </Head>

            {/* Background elements - Desktop only to save mobile performance/clutter */}
            <div className="hidden sm:block absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-copper/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="hidden sm:block absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-heritage/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Custom Modal for Facebook Error */}
            {showFacebookModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-copper/20">
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
                                className="w-full py-3.5 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                                className="w-full py-3.5 px-4 bg-heritage text-white font-medium rounded-xl hover:bg-heritage/90 transition-colors"
                            >
                                Okay, I understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
                <Link href="/" className="flex justify-center mb-8">
                    <img
                        className="h-20 w-auto"
                        src="/varaha-assets/logo.png"
                        alt="Varaha Jewels"
                    />
                </Link>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-royal font-bold text-gray-900 mb-2">
                        Welcome Back
                    </h2>
                    <p className="text-gray-500">
                        Sign in to continue your journey
                    </p>
                </div>
            </div>

            <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md px-4">
                <div className="bg-white py-8 sm:px-10 sm:shadow-xl sm:shadow-gray-200/50 sm:rounded-2xl sm:border border-gray-100">

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {successMsg && (
                            <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-fadeIn">
                                <CheckCircle size={18} className="flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-fadeIn">
                                <AlertCircle size={18} className="flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            <FloatingInput
                                id="email"
                                name="email"
                                type="text"
                                label="Email Address"
                                value={formData.email}
                                onChange={handleChange}
                                icon={Mail}
                                required
                            />

                            <FloatingInput
                                id="password"
                                name="password"
                                type="password"
                                label="Password"
                                value={formData.password}
                                onChange={handleChange}
                                icon={Lock}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end">
                            <div className="text-sm">
                                <a href="#" className="font-medium text-copper hover:text-heritage transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-heritage/20 text-base font-semibold text-white bg-heritage hover:bg-heritage/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper transition-all disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2" size={20} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In <ArrowRight className="ml-2" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-8 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-400 font-medium">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleSocialLogin('Google')}
                            className="flex items-center justify-center px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={() => handleSocialLogin('Facebook')}
                            className="flex items-center justify-center px-4 py-3.5 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <Facebook className="h-5 w-5 mr-3 text-[#1877F2]" />
                            Facebook
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-semibold text-copper hover:text-heritage transition-colors">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const FloatingInput = ({ id, type, name, value, onChange, label, icon: Icon, required = false }) => (
    <div className="relative">
        <input
            id={id}
            name={name}
            type={type}
            required={required}
            value={value}
            onChange={onChange}
            placeholder=" "
            className="peer block w-full px-12 py-3.5 text-gray-900 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-copper focus:border-copper transition-all text-base"
        />
        <label
            htmlFor={id}
            className="absolute text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-12 px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-copper bg-white"
        >
            {label}
        </label>
        <div className="absolute left-4 top-3.5 text-gray-400 peer-focus:text-copper transition-colors">
            <Icon size={20} />
        </div>
    </div>
);
