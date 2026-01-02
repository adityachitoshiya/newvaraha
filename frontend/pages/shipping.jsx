import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Truck, Package, MapPin, Clock, CheckCircle, RefreshCw, Shield, AlertCircle } from 'lucide-react';

export default function Shipping() {
    const [pincode, setPincode] = useState('');
    const [deliveryInfo, setDeliveryInfo] = useState(null);

    const checkDelivery = async () => {
        if (pincode.length === 6) {
            // Simulate delivery check
            setDeliveryInfo({
                available: true,
                days: '5-7',
                city: 'Your City'
            });
        }
    };

    return (
        <>
            <Head>
                <title>Shipping & Returns Policy - Varaha Jewels</title>
                <meta name="description" content="Learn about our shipping policy, delivery times, and easy returns process at Varaha Jewels." />
            </Head>

            <Header />

            <main className="min-h-screen bg-warm-sand py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">
                            Shipping & Returns
                        </h1>
                        <p className="text-heritage/70">
                            Everything you need to know about delivery and returns
                        </p>
                        <div className="w-20 h-px bg-copper mx-auto mt-6"></div>
                    </div>

                    {/* Delivery Checker */}
                    <div className="bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-6 mb-12">
                        <h3 className="text-xl font-bold text-heritage mb-4 flex items-center gap-2">
                            <MapPin className="text-copper" size={24} />
                            Check Delivery Availability
                        </h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={pincode}
                                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit pincode"
                                maxLength="6"
                                className="flex-1 px-4 py-3 border-2 border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper"
                            />
                            <button
                                onClick={checkDelivery}
                                className="px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                            >
                                Check
                            </button>
                        </div>
                        {deliveryInfo && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm flex items-start gap-3">
                                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-green-800">Delivery Available!</p>
                                    <p className="text-sm text-green-700">Expected delivery in {deliveryInfo.days} business days</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shipping Policy */}
                    <section className="mb-12">
                        <div className="bg-white border border-copper/30 rounded-sm p-8">
                            <h2 className="text-3xl font-royal font-bold text-heritage mb-6 flex items-center gap-3">
                                <Truck className="text-copper" size={32} />
                                Shipping Policy
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-heritage mb-3">Delivery Timeframes</h3>
                                    <div className="space-y-3 text-heritage/80">
                                        <div className="flex items-start gap-3">
                                            <Clock className="text-copper flex-shrink-0 mt-1" size={18} />
                                            <div>
                                                <p className="font-semibold">Metro Cities: 3-5 business days</p>
                                                <p className="text-sm text-heritage/60">Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="text-copper flex-shrink-0 mt-1" size={18} />
                                            <div>
                                                <p className="font-semibold">Other Cities: 5-7 business days</p>
                                                <p className="text-sm text-heritage/60">All other locations across India</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="text-copper flex-shrink-0 mt-1" size={18} />
                                            <div>
                                                <p className="font-semibold">Remote Areas: 7-10 business days</p>
                                                <p className="text-sm text-heritage/60">Hill stations and remote locations</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Shipping Charges</h3>
                                    <div className="bg-green-50 border border-green-200 rounded-sm p-4 mb-3">
                                        <p className="font-bold text-green-800 flex items-center gap-2">
                                            <CheckCircle size={18} />
                                            FREE Shipping on orders above ₹5,000
                                        </p>
                                    </div>
                                    <p className="text-heritage/80">
                                        For orders below ₹5,000, a flat shipping charge of <span className="font-semibold">₹99</span> applies.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Delivery Partners</h3>
                                    <p className="text-heritage/80 mb-3">
                                        We partner with trusted courier services including Blue Dart, Delhivery, and India Post to ensure safe and timely delivery.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Order Tracking</h3>
                                    <p className="text-heritage/80 mb-3">
                                        Once your order is shipped, you'll receive a tracking number via email and SMS. You can track your order on our{' '}
                                        <Link href="/orders" className="text-copper hover:underline font-semibold">Track Order</Link> page.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Packaging</h3>
                                    <p className="text-heritage/80">
                                        All jewelry is carefully packaged in premium boxes with protective padding. High-value items are shipped with additional insurance and require signature on delivery.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Returns Policy */}
                    <section className="mb-12">
                        <div className="bg-white border border-copper/30 rounded-sm p-8">
                            <h2 className="text-3xl font-royal font-bold text-heritage mb-6 flex items-center gap-3">
                                <RefreshCw className="text-copper" size={32} />
                                Returns & Refunds Policy
                            </h2>

                            <div className="space-y-6">
                                <div className="bg-copper/10 border border-copper/30 rounded-sm p-4">
                                    <p className="font-bold text-heritage flex items-center gap-2">
                                        <Shield size={18} className="text-copper" />
                                        7-Day Easy Returns
                                    </p>
                                    <p className="text-sm text-heritage/70 mt-1">
                                        We offer hassle-free returns within 7 days of delivery
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-heritage mb-3">Return Conditions</h3>
                                    <ul className="space-y-2 text-heritage/80">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={16} />
                                            <span>Product must be unused and in original condition</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={16} />
                                            <span>All tags, labels, and certificates must be intact</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={16} />
                                            <span>Original packaging must be undamaged</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={16} />
                                            <span>Return request must be initiated within 7 days of delivery</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">How to Return</h3>
                                    <ol className="space-y-3 text-heritage/80">
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-copper text-warm-sand rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                            <span>Contact our support team at +91 98765 43210 or hello@varahajewels.com</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-copper text-warm-sand rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                            <span>Provide your order ID and reason for return</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-copper text-warm-sand rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                            <span>We'll arrange a free pickup from your address</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-copper text-warm-sand rounded-full flex items-center justify-center text-sm font-bold">4</span>
                                            <span>Once we receive and inspect the item, refund will be processed</span>
                                        </li>
                                    </ol>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Refund Timeline</h3>
                                    <p className="text-heritage/80 mb-3">
                                        Refunds are processed within <span className="font-semibold">5-7 business days</span> after we receive the returned item. The amount will be credited to your original payment method.
                                    </p>
                                    <ul className="space-y-2 text-sm text-heritage/70">
                                        <li>• Online Payment: 5-7 business days to original payment method</li>
                                        <li>• COD Orders: Bank transfer within 7-10 business days</li>
                                    </ul>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3">Exchange Policy</h3>
                                    <p className="text-heritage/80">
                                        We offer free exchanges for size, design, or variant changes. Contact us within 7 days, and we'll arrange the exchange at no additional cost. Exchange items are subject to availability.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-copper/20">
                                    <h3 className="text-xl font-bold text-heritage mb-3 flex items-center gap-2">
                                        <AlertCircle className="text-orange-600" size={20} />
                                        Non-Returnable Items
                                    </h3>
                                    <ul className="space-y-2 text-heritage/80">
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600">•</span>
                                            <span>Customized or personalized jewelry</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600">•</span>
                                            <span>Engraved items</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600">•</span>
                                            <span>Pierced earrings (for hygiene reasons)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600">•</span>
                                            <span>Items damaged due to misuse or negligence</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-600">•</span>
                                            <span>Items without original tags, certificates, or packaging</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Support */}
                    <div className="bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-8 text-center">
                        <Package className="mx-auto mb-4 text-copper" size={48} />
                        <h3 className="text-2xl font-royal font-bold text-heritage mb-3">Need Help?</h3>
                        <p className="text-heritage/70 mb-6 max-w-xl mx-auto">
                            Have questions about shipping or returns? Our customer support team is here to assist you.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                            >
                                Contact Support
                            </Link>
                            <Link
                                href="/faq"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-copper text-copper font-semibold rounded-sm hover:bg-copper hover:text-warm-sand transition-all"
                            >
                                View FAQ
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
