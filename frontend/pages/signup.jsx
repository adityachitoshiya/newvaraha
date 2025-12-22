import { useState } from 'react';
import { getApiUrl } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { User, Mail, Lock, AlertCircle, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function Signup() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirm_password: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [existingAccount, setExistingAccount] = useState(null);

    const checkEmail = async (email) => {
        if (!email || !email.includes('@')) return;
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/auth/check-email?email=${email}`);
            const data = await res.json();
            if (data.exists) {
                setExistingAccount(data);
                if (data.is_guest) {
                    // Pre-fill name if available
                    if (data.full_name && !formData.full_name) {
                        setFormData(prev => ({ ...prev, full_name: data.full_name }));
                    }
                }
            } else {
                setExistingAccount(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);

        if (e.target.name === 'email') {
            setExistingAccount(null); // Reset while typing
        }
    };

    const handleEmailBlur = () => {
        checkEmail(formData.email);
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        // Validation
        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Create user in Supabase Auth (data stored in Supabase)
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data?.user) {
                // Check if session exists (auto-confirm enabled)
                if (data.session) {
                    // Auto-login successful
                    const userData = {
                        id: data.user.id,
                        full_name: formData.full_name,
                        name: formData.full_name,  // For backward compatibility
                        email: formData.email,
                        role: 'customer'
                    };

                    localStorage.setItem('customer_token', data.session.access_token);
                    localStorage.setItem('customer_user', JSON.stringify(userData));

                    // Sync with backend (optional - for orders tracking)
                    const API_URL = getApiUrl();
                    try {
                        await fetch(`${API_URL}/api/auth/sync`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${data.session.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                full_name: formData.full_name,
                                email: formData.email,
                                provider: 'email'
                            })
                        });
                    } catch (syncErr) {
                        console.log('Backend sync skipped:', syncErr);
                    }

                    setSuccess(true);
                    setTimeout(() => router.push('/'), 1500);
                } else {
                    // Email confirmation required
                    setSuccess(true);
                    setError(null);
                    setTimeout(() => router.push('/login?check_email=true'), 2000);
                }
            }

        } catch (err) {
            console.error("Signup error:", err);
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Head>
                <title>Create Account | Varaha Jewels</title>
            </Head>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center mb-6">
                    <img
                        className="h-16 w-auto"
                        src="/varaha-assets/logo.png"
                        alt="Varaha Jewels"
                    />
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-serif">
                    Join the Royal Family
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Create an account to unlock exclusive privileges
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSignup}>
                        {success && (
                            <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <CheckCircle size={16} />
                                Account created successfully! Redirecting...
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
                                Full Name
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="full_name"
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="focus:ring-copper focus:border-copper block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2.5"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="focus:ring-copper focus:border-copper block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2.5"
                                    placeholder="you@example.com"
                                    onBlur={handleEmailBlur}
                                />
                            </div>
                            {existingAccount && (
                                <div className={`mt-2 text-sm p-3 rounded-lg flex items-start gap-2 ${existingAccount.is_guest ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        {existingAccount.is_guest ? (
                                            <>
                                                <strong>Account Found!</strong>
                                                <p>You have placed orders as a guest. Create a password now to claim your account and view order history.</p>
                                            </>
                                        ) : (
                                            <>
                                                <strong>Already Registered</strong>
                                                <p>An account exists with this email. <Link href="/login" className="underline font-semibold">Sign in here</Link>.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
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
                            <label className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="confirm_password"
                                    type="password"
                                    required
                                    value={formData.confirm_password}
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
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Create Account <ArrowRight className="ml-2" size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link href="/login" className="font-medium text-copper hover:text-heritage transition-colors">
                                Sign in instead
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-copper/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-heritage/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
}
