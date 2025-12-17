import { useState } from 'react';
import { getApiUrl } from '../lib/config';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { User, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // 1. Create User in Supabase Auth
            const { data, error: funcError } = await import('../lib/supabaseClient').then(mod =>
                mod.supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.full_name,
                        }
                    }
                })
            );

            if (funcError) throw funcError;

            if (data?.user) {
                // 2. Sync with Backend
                // We call the social-login endpoint or a new sync endpoint to ensure the user exists in our DB
                // Since social-login handles "get or create" based on email, we can reuse it or create a dedicated one.
                // For now, let's try to auto-login.

                // If email confirmation is required, Supabase won't return a session immediately.
                if (data.session) {
                    // Auto Login Success
                    router.push('/login?registered=true#access_token=' + data.session.access_token);
                } else {
                    // Email confirmation needed
                    setFormData({ ...formData, password: '', confirm_password: '' });
                    setError(null);
                    // Use a query param to show a different success message
                    router.push('/login?check_email=true');
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Registration failed");
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
