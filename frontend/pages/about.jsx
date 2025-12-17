import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Crown, Heart, Shield, Sparkles, Award, Users, MapPin, Phone, Mail } from 'lucide-react';

export default function About() {
    return (
        <>
            <Head>
                <title>About Us - Varaha Jewels | Our Heritage & Craftsmanship</title>
                <meta name="description" content="Discover the story behind Varaha Jewels. Learn about our heritage, craftsmanship, and commitment to creating authentic, premium jewelry." />
            </Head>

            <Header />

            <main className="bg-warm-sand">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-heritage/5 to-transparent"></div>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl md:text-6xl font-royal font-bold text-heritage mb-6">
                            Where Heritage Meets Royalty
                        </h1>
                        <div className="w-24 h-1 bg-copper mx-auto mb-6"></div>
                        <p className="text-xl text-heritage/80 max-w-3xl mx-auto leading-relaxed">
                            For generations, Varaha Jewels has been crafting exquisite jewelry that celebrates India's rich heritage and timeless traditions.
                        </p>
                    </div>
                </section>

                {/* Our Story */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-4xl font-royal font-bold text-heritage mb-6">Our Story</h2>
                                <div className="space-y-4 text-heritage/80 leading-relaxed">
                                    <p>
                                        Founded in the heart of Jaipur, Rajasthan, Varaha Jewels was born from a passion for preserving India's rich jewelry-making traditions while embracing contemporary design sensibilities.
                                    </p>
                                    <p>
                                        Our journey began with a simple vision: to create jewelry that tells a story, celebrates heritage, and becomes a cherished part of your family's legacy. Each piece we craft is a testament to the skill of our master artisans and the timeless beauty of traditional Indian craftsmanship.
                                    </p>
                                    <p>
                                        Today, we continue to honor this legacy by sourcing the finest materials, employing age-old techniques, and infusing every creation with the same dedication and artistry that defined our beginnings.
                                    </p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square rounded-sm overflow-hidden shadow-2xl">
                                    <Image
                                        src="/varaha-assets/heroimage.avif"
                                        alt="Varaha Jewels Craftsmanship"
                                        width={600}
                                        height={600}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-copper/20 rounded-sm -z-10"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Our Values */}
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-royal font-bold text-heritage mb-4">Our Values</h2>
                            <p className="text-heritage/70 max-w-2xl mx-auto">
                                The principles that guide everything we do
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: <Shield size={40} />,
                                    title: 'Authenticity',
                                    description: '100% certified and hallmarked jewelry with guaranteed purity'
                                },
                                {
                                    icon: <Crown size={40} />,
                                    title: 'Heritage',
                                    description: 'Preserving traditional craftsmanship and timeless designs'
                                },
                                {
                                    icon: <Sparkles size={40} />,
                                    title: 'Quality',
                                    description: 'Premium materials and meticulous attention to detail'
                                },
                                {
                                    icon: <Heart size={40} />,
                                    title: 'Trust',
                                    description: 'Building lasting relationships through transparency and integrity'
                                }
                            ].map((value, index) => (
                                <div
                                    key={index}
                                    className="group p-8 border-2 border-copper/20 rounded-sm hover:border-copper hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="text-copper mb-4 group-hover:scale-110 transition-transform">
                                        {value.icon}
                                    </div>
                                    <h3 className="text-xl font-royal font-bold text-heritage mb-3">{value.title}</h3>
                                    <p className="text-heritage/70 text-sm leading-relaxed">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Craftsmanship */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1 relative">
                                <div className="aspect-square rounded-sm overflow-hidden shadow-2xl">
                                    <Image
                                        src="/varaha-assets/dp3.avif"
                                        alt="Artisan Craftsmanship"
                                        width={600}
                                        height={600}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="order-1 md:order-2">
                                <h2 className="text-4xl font-royal font-bold text-heritage mb-6">Master Craftsmanship</h2>
                                <div className="space-y-4 text-heritage/80 leading-relaxed">
                                    <p>
                                        Our master artisans bring decades of experience and generational knowledge to every piece they create. Each jewel is handcrafted with precision, patience, and passion.
                                    </p>
                                    <p>
                                        From intricate Kundan work to delicate Polki settings, from traditional Meenakari to contemporary designs, our craftsmen blend time-honored techniques with modern innovation.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        {[
                                            { number: '50+', label: 'Master Artisans' },
                                            { number: '100%', label: 'Handcrafted' },
                                            { number: '30+', label: 'Years Experience' },
                                            { number: '10K+', label: 'Happy Customers' }
                                        ].map((stat, index) => (
                                            <div key={index} className="text-center p-4 bg-copper/10 rounded-sm">
                                                <p className="text-3xl font-bold text-copper mb-1">{stat.number}</p>
                                                <p className="text-sm text-heritage/70">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section className="py-16 bg-gradient-to-b from-heritage/5 to-transparent">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-royal font-bold text-heritage mb-4">Why Choose Varaha Jewels</h2>
                            <p className="text-heritage/70 max-w-2xl mx-auto">
                                Experience the difference of authentic heritage jewelry
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: <Award size={32} />,
                                    title: 'Certified Authenticity',
                                    description: 'Every piece comes with BIS hallmark certification and authenticity guarantee'
                                },
                                {
                                    icon: <Shield size={32} />,
                                    title: 'Lifetime Warranty',
                                    description: 'Comprehensive lifetime warranty on all our jewelry pieces'
                                },
                                {
                                    icon: <Heart size={32} />,
                                    title: '7-Day Returns',
                                    description: 'Easy returns and exchanges within 7 days of purchase'
                                },
                                {
                                    icon: <Sparkles size={32} />,
                                    title: 'Premium Packaging',
                                    description: 'Luxurious packaging that reflects the value of your purchase'
                                },
                                {
                                    icon: <Users size={32} />,
                                    title: 'Expert Guidance',
                                    description: 'Personalized assistance from our jewelry experts'
                                },
                                {
                                    icon: <Crown size={32} />,
                                    title: 'Custom Designs',
                                    description: 'Bespoke jewelry tailored to your unique preferences'
                                }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-6 rounded-sm border border-copper/20 hover:shadow-lg transition-all"
                                >
                                    <div className="text-copper mb-4">{feature.icon}</div>
                                    <h3 className="text-lg font-bold text-heritage mb-2">{feature.title}</h3>
                                    <p className="text-sm text-heritage/70 leading-relaxed">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section className="py-16 bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-4xl font-royal font-bold text-heritage mb-6">Visit Our Showroom</h2>
                        <p className="text-heritage/70 mb-8">
                            Experience our collections in person and let our experts guide you
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            <div className="flex flex-col items-center gap-3">
                                <MapPin className="text-copper" size={32} />
                                <div>
                                    <p className="font-semibold text-heritage">Address</p>
                                    <p className="text-sm text-heritage/70">Jaipur, Rajasthan, India</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <Phone className="text-copper" size={32} />
                                <div>
                                    <p className="font-semibold text-heritage">Phone</p>
                                    <p className="text-sm text-heritage/70">+91 98765 43210</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <Mail className="text-copper" size={32} />
                                <div>
                                    <p className="font-semibold text-heritage">Email</p>
                                    <p className="text-sm text-heritage/70">hello@varahajewels.com</p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-copper text-warm-sand font-bold rounded-sm hover:bg-heritage transition-all duration-300 shadow-lg"
                        >
                            Get in Touch
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
