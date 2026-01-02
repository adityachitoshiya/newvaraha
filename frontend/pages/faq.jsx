import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronDown, Search, HelpCircle, Package, CreditCard, Truck, RefreshCw, Shield } from 'lucide-react';

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [openQuestions, setOpenQuestions] = useState([]);

    const categories = [
        { id: 'all', name: 'All Questions', icon: <HelpCircle size={20} /> },
        { id: 'ordering', name: 'Ordering & Payment', icon: <CreditCard size={20} /> },
        { id: 'shipping', name: 'Shipping & Delivery', icon: <Truck size={20} /> },
        { id: 'returns', name: 'Returns & Refunds', icon: <RefreshCw size={20} /> },
        { id: 'product', name: 'Product Info', icon: <Package size={20} /> },
        { id: 'account', name: 'Account & Support', icon: <Shield size={20} /> }
    ];

    const faqs = [
        // Ordering & Payment
        {
            category: 'ordering',
            question: 'How do I place an order?',
            answer: 'Browse our collections, select your desired product, choose the variant (if applicable), and click "Add to Cart". Once you\'ve added all items, proceed to checkout, fill in your details, and complete the payment.'
        },
        {
            category: 'ordering',
            question: 'What payment methods do you accept?',
            answer: 'We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD). Online payments are processed securely through Razorpay.'
        },
        {
            category: 'ordering',
            question: 'Is online payment secure?',
            answer: 'Yes, absolutely! All online transactions are encrypted and processed through Razorpay, a PCI DSS compliant payment gateway. We never store your card details.'
        },
        {
            category: 'ordering',
            question: 'What is Cash on Delivery (COD)?',
            answer: 'COD allows you to pay for your order when it\'s delivered to your doorstep. A nominal COD charge of ₹59 applies. You can pay in cash or via card/UPI to the delivery partner.'
        },
        {
            category: 'ordering',
            question: 'Can I use a coupon code?',
            answer: 'Yes! Enter your coupon code at checkout in the "Have a Coupon Code?" field and click Apply. The discount will be reflected in your order total.'
        },

        // Shipping & Delivery
        {
            category: 'shipping',
            question: 'How long does delivery take?',
            answer: 'Standard delivery takes 5-7 business days for most locations in India. Metro cities may receive orders within 3-5 days. You\'ll receive a tracking number once your order ships.'
        },
        {
            category: 'shipping',
            question: 'What are the shipping charges?',
            answer: 'We offer FREE shipping on all orders above ₹5,000. For orders below ₹5,000, a flat shipping charge of ₹99 applies.'
        },
        {
            category: 'shipping',
            question: 'How can I track my order?',
            answer: 'Visit the "Track Order" page and enter your order ID and email address. You\'ll also receive tracking updates via email and SMS.'
        },
        {
            category: 'shipping',
            question: 'Do you deliver internationally?',
            answer: 'Currently, we only deliver within India. We\'re working on expanding to international shipping soon. Stay tuned!'
        },
        {
            category: 'shipping',
            question: 'Can I change my delivery address?',
            answer: 'Yes, you can change the delivery address before the order is shipped. Contact our support team immediately at +91 98765 43210 or hello@varahajewels.com.'
        },

        // Returns & Refunds
        {
            category: 'returns',
            question: 'What is your return policy?',
            answer: 'We offer a 7-day easy return policy. Products must be unused, in original condition with tags intact, and in the original packaging. Customized or engraved items cannot be returned.'
        },
        {
            category: 'returns',
            question: 'How do I return a product?',
            answer: 'Contact our support team within 7 days of delivery. We\'ll arrange a free pickup from your address. Once we receive and inspect the item, your refund will be processed.'
        },
        {
            category: 'returns',
            question: 'When will I receive my refund?',
            answer: 'Refunds are processed within 5-7 business days after we receive the returned item. The amount will be credited to your original payment method.'
        },
        {
            category: 'returns',
            question: 'Can I exchange a product?',
            answer: 'Yes! We offer exchanges for size, design, or variant changes. Contact us within 7 days, and we\'ll arrange the exchange at no additional cost.'
        },
        {
            category: 'returns',
            question: 'What items cannot be returned?',
            answer: 'Customized jewelry, engraved items, pierced earrings (for hygiene reasons), and items damaged due to misuse cannot be returned.'
        },

        // Product Information
        {
            category: 'product',
            question: 'Are your products authentic?',
            answer: 'Yes, 100%! All our gold and silver jewelry is BIS hallmarked and comes with a certificate of authenticity. We guarantee the purity and quality of every piece.'
        },
        {
            category: 'product',
            question: 'What is hallmarking?',
            answer: 'Hallmarking is a certification that guarantees the purity of precious metals. All our gold jewelry is BIS hallmarked, ensuring you receive genuine, certified products.'
        },
        {
            category: 'product',
            question: 'Do you offer customization?',
            answer: 'Yes! We offer custom design services for special occasions. Contact us with your requirements, and our design team will work with you to create your perfect piece.'
        },
        {
            category: 'product',
            question: 'How do I know my ring/bracelet size?',
            answer: 'Visit our Size Guide page for detailed measurement instructions and size charts. You can also visit our showroom for professional sizing assistance.'
        },
        {
            category: 'product',
            question: 'Do you provide a warranty?',
            answer: 'Yes! All our jewelry comes with a lifetime warranty covering manufacturing defects. This includes free cleaning, polishing, and minor repairs.'
        },

        // Account & Support
        {
            category: 'account',
            question: 'Do I need to create an account to shop?',
            answer: 'No, you can checkout as a guest. However, creating an account helps you track orders, save your wishlist, and enjoy faster checkout in the future.'
        },
        {
            category: 'account',
            question: 'How do I reset my password?',
            answer: 'Click on "Forgot Password" on the login page, enter your registered email, and you\'ll receive a password reset link.'
        },
        {
            category: 'account',
            question: 'How can I contact customer support?',
            answer: 'You can reach us at +91 98765 43210, email hello@varahajewels.com, or use the contact form on our Contact page. We\'re available Mon-Sat, 10 AM - 8 PM.'
        },
        {
            category: 'account',
            question: 'Can I cancel my order?',
            answer: 'Yes, you can cancel your order before it\'s shipped. Contact us immediately, and we\'ll process the cancellation and refund.'
        },
        {
            category: 'account',
            question: 'Is my personal information secure?',
            answer: 'Absolutely! We use industry-standard encryption to protect your data. We never share your personal information with third parties. Read our Privacy Policy for details.'
        }
    ];

    const toggleQuestion = (index) => {
        if (openQuestions.includes(index)) {
            setOpenQuestions(openQuestions.filter(i => i !== index));
        } else {
            setOpenQuestions([...openQuestions, index]);
        }
    };

    const filteredFAQs = faqs.filter(faq => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <>
            <Head>
                <title>FAQ - Frequently Asked Questions | Varaha Jewels</title>
                <meta name="description" content="Find answers to common questions about ordering, shipping, returns, and our jewelry products at Varaha Jewels." />
            </Head>

            <Header />

            <main className="min-h-screen bg-warm-sand py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-heritage/70 max-w-2xl mx-auto">
                            Find answers to common questions about our products and services
                        </p>
                        <div className="w-20 h-px bg-copper mx-auto mt-6"></div>
                    </div>

                    {/* Search */}
                    <div className="mb-8">
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-heritage/40" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for answers..."
                                className="w-full pl-12 pr-4 py-4 border-2 border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-3 justify-center mb-12">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${activeCategory === category.id
                                        ? 'bg-copper text-warm-sand shadow-lg'
                                        : 'bg-white text-heritage border border-copper/30 hover:border-copper'
                                    }`}
                            >
                                {category.icon}
                                <span className="hidden sm:inline">{category.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* FAQ List */}
                    {filteredFAQs.length === 0 ? (
                        <div className="bg-white border border-copper/30 rounded-sm p-12 text-center">
                            <Search className="mx-auto mb-4 text-heritage/30" size={64} />
                            <h3 className="text-2xl font-royal font-bold text-heritage mb-2">No results found</h3>
                            <p className="text-heritage/70 mb-6">Try adjusting your search or browse all questions</p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveCategory('all');
                                }}
                                className="px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                            >
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredFAQs.map((faq, index) => (
                                <div
                                    key={index}
                                    className="bg-white border border-copper/30 rounded-sm overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <button
                                        onClick={() => toggleQuestion(index)}
                                        className="w-full flex items-center justify-between p-6 text-left hover:bg-copper/5 transition-colors"
                                    >
                                        <span className="font-semibold text-heritage pr-4">{faq.question}</span>
                                        <ChevronDown
                                            size={20}
                                            className={`text-copper flex-shrink-0 transition-transform ${openQuestions.includes(index) ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>
                                    {openQuestions.includes(index) && (
                                        <div className="px-6 pb-6 text-heritage/70 leading-relaxed border-t border-copper/10">
                                            <p className="pt-4">{faq.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Still Have Questions */}
                    <div className="mt-16 bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-8 text-center">
                        <HelpCircle className="mx-auto mb-4 text-copper" size={48} />
                        <h3 className="text-2xl font-royal font-bold text-heritage mb-3">Still have questions?</h3>
                        <p className="text-heritage/70 mb-6 max-w-xl mx-auto">
                            Can't find what you're looking for? Our customer support team is here to help!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                            >
                                Contact Support
                            </Link>
                            <a
                                href="tel:+919876543210"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-copper text-copper font-semibold rounded-sm hover:bg-copper hover:text-warm-sand transition-all"
                            >
                                Call Us: +91 98765 43210
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
