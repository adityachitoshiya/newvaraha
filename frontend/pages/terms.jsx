import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FileText, Scale, Shield } from 'lucide-react';

export default function Terms() {
    const lastUpdated = 'December 13, 2025';

    return (
        <>
            <Head>
                <title>Terms & Conditions - Varaha Jewels</title>
                <meta name="description" content="Read our terms and conditions for using Varaha Jewels website and purchasing our products." />
            </Head>

            <Header />

            <main className="min-h-screen bg-warm-sand py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">
                            Terms & Conditions
                        </h1>
                        <p className="text-heritage/70">
                            Last updated: {lastUpdated}
                        </p>
                        <div className="w-20 h-px bg-copper mx-auto mt-6"></div>
                    </div>

                    {/* Table of Contents */}
                    <div className="bg-white border border-copper/30 rounded-sm p-6 mb-8">
                        <h2 className="text-xl font-bold text-heritage mb-4 flex items-center gap-2">
                            <FileText className="text-copper" size={20} />
                            Table of Contents
                        </h2>
                        <nav className="space-y-2">
                            {[
                                'Introduction',
                                'Use of Website',
                                'Product Information',
                                'Pricing and Payment',
                                'Order Acceptance',
                                'Delivery Terms',
                                'Returns and Refunds',
                                'Intellectual Property',
                                'Limitation of Liability',
                                'Governing Law',
                                'Contact Information'
                            ].map((item, index) => (
                                <a
                                    key={index}
                                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="block text-copper hover:text-heritage transition-colors text-sm"
                                >
                                    {index + 1}. {item}
                                </a>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="bg-white border border-copper/30 rounded-sm p-8 space-y-8">
                        <section id="introduction">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">1. Introduction</h2>
                            <p className="text-heritage/80 leading-relaxed">
                                Welcome to Varaha Jewels. These Terms and Conditions ("Terms") govern your use of our website and the purchase of products from us. By accessing our website or making a purchase, you agree to be bound by these Terms. Please read them carefully before using our services.
                            </p>
                        </section>

                        <section id="use-of-website">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">2. Use of Website</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>You agree to use our website only for lawful purposes and in a manner that does not infringe the rights of others or restrict their use of the website.</p>
                                <p>You must not:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Use the website in any way that causes damage to the website or impairs its availability</li>
                                    <li>Use the website to transmit any harmful or malicious code</li>
                                    <li>Attempt to gain unauthorized access to any part of the website</li>
                                    <li>Reproduce, duplicate, or copy any part of the website without our express written permission</li>
                                </ul>
                            </div>
                        </section>

                        <section id="product-information">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">3. Product Information</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>We make every effort to display our products as accurately as possible. However, we cannot guarantee that your device's display of colors or product details will be completely accurate.</p>
                                <p>All jewelry is BIS hallmarked and comes with certificates of authenticity. Product specifications, including metal purity, gemstone quality, and weight, are provided to the best of our knowledge.</p>
                                <p>Images shown are for illustrative purposes. Actual products may vary slightly in appearance due to the handcrafted nature of our jewelry.</p>
                            </div>
                        </section>

                        <section id="pricing-and-payment">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">4. Pricing and Payment</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>All prices are listed in Indian Rupees (INR) and include applicable taxes unless otherwise stated.</p>
                                <p>We reserve the right to change prices at any time. However, prices are confirmed at the time of order placement.</p>
                                <p>Payment can be made through:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Credit/Debit Cards</li>
                                    <li>Net Banking</li>
                                    <li>UPI</li>
                                    <li>Cash on Delivery (COD) - Subject to ₹59 COD charges</li>
                                </ul>
                                <p>All online payments are processed securely through Razorpay, a PCI DSS compliant payment gateway.</p>
                            </div>
                        </section>

                        <section id="order-acceptance">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">5. Order Acceptance</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>Your order constitutes an offer to purchase products from us. We reserve the right to accept or reject any order at our discretion.</p>
                                <p>Order confirmation does not constitute acceptance of your order. Acceptance occurs when we dispatch the products to you.</p>
                                <p>We may refuse or cancel orders if:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Products are unavailable</li>
                                    <li>Pricing or product information is incorrect</li>
                                    <li>We suspect fraudulent activity</li>
                                    <li>We are unable to process payment</li>
                                </ul>
                            </div>
                        </section>

                        <section id="delivery-terms">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">6. Delivery Terms</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>Delivery times are estimates and may vary based on location and product availability. We are not liable for delays caused by circumstances beyond our control.</p>
                                <p>Risk of loss and title for products pass to you upon delivery to the carrier.</p>
                                <p>You must inspect products upon delivery and report any damage or discrepancies within 24 hours.</p>
                                <p>For detailed shipping information, please refer to our <Link href="/shipping" className="text-copper hover:underline font-semibold">Shipping Policy</Link>.</p>
                            </div>
                        </section>

                        <section id="returns-and-refunds">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">7. Returns and Refunds</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>We offer a 7-day return policy for most products. Products must be unused, in original condition, with all tags and packaging intact.</p>
                                <p>Customized, personalized, or engraved items cannot be returned unless defective.</p>
                                <p>Refunds will be processed to the original payment method within 5-7 business days of receiving the returned item.</p>
                                <p>For complete details, please see our <Link href="/shipping" className="text-copper hover:underline font-semibold">Returns Policy</Link>.</p>
                            </div>
                        </section>

                        <section id="intellectual-property">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">8. Intellectual Property</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>All content on this website, including text, graphics, logos, images, and software, is the property of Varaha Jewels and is protected by Indian and international copyright laws.</p>
                                <p>You may not reproduce, distribute, modify, or create derivative works from any content without our express written permission.</p>
                                <p>Product designs and jewelry patterns are proprietary and protected under applicable intellectual property laws.</p>
                            </div>
                        </section>

                        <section id="limitation-of-liability">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">9. Limitation of Liability</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>To the fullest extent permitted by law, Varaha Jewels shall not be liable for any indirect, incidental, special, or consequential damages arising from:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Use or inability to use our website</li>
                                    <li>Unauthorized access to or alteration of your data</li>
                                    <li>Any third-party conduct on the website</li>
                                    <li>Any other matter relating to the website or services</li>
                                </ul>
                                <p>Our total liability for any claim arising from your use of the website or purchase of products shall not exceed the amount you paid for the products.</p>
                            </div>
                        </section>

                        <section id="governing-law">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">10. Governing Law</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>These Terms shall be governed by and construed in accordance with the laws of India.</p>
                                <p>Any disputes arising from these Terms or your use of the website shall be subject to the exclusive jurisdiction of the courts in Jaipur, Rajasthan.</p>
                            </div>
                        </section>

                        <section id="contact-information">
                            <h2 className="text-2xl font-royal font-bold text-heritage mb-4">11. Contact Information</h2>
                            <div className="space-y-3 text-heritage/80 leading-relaxed">
                                <p>If you have any questions about these Terms and Conditions, please contact us:</p>
                                <div className="bg-copper/10 border border-copper/30 rounded-sm p-4 mt-4">
                                    <p className="font-semibold text-heritage mb-2">Varaha Jewels</p>
                                    <p className="text-sm text-heritage/70">Email: hello@varahajewels.com</p>
                                    <p className="text-sm text-heritage/70">Phone: +91 98765 43210</p>
                                    <p className="text-sm text-heritage/70">Address: Jaipur, Rajasthan, India</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer Notice */}
                    <div className="mt-8 bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-6 text-center">
                        <Scale className="mx-auto mb-3 text-copper" size={32} />
                        <p className="text-sm text-heritage/70">
                            By using our website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
