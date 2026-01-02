import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Sparkles, Heart, Users, Award, Clock, MapPin } from 'lucide-react';

export default function Story() {
    return (
        <>
            <Head>
                <title>Our Story - The Heritage of Varaha Jewels</title>
                <meta name="description" content="Discover the story behind Varaha Jewels - our heritage, craftsmanship, and commitment to preserving India's jewelry-making traditions." />
            </Head>

            <Header />

            <main className="bg-warm-sand">
                {/* Hero */}
                <section className="relative py-20 overflow-hidden bg-gradient-to-b from-heritage/10 to-transparent">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <Sparkles className="mx-auto mb-6 text-copper" size={48} />
                        <h1 className="text-5xl md:text-6xl font-royal font-bold text-heritage mb-6">
                            Our Story
                        </h1>
                        <p className="text-xl text-heritage/80 leading-relaxed">
                            A journey through time, tradition, and timeless beauty
                        </p>
                    </div>
                </section>

                {/* The Beginning */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="relative">
                                <div className="aspect-[4/3] rounded-sm overflow-hidden shadow-2xl">
                                    <Image
                                        src="/varaha-assets/dp1.avif"
                                        alt="Varaha Jewels Heritage"
                                        width={800}
                                        height={600}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-copper/20 rounded-sm -z-10"></div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="text-copper" size={24} />
                                    <span className="text-copper font-semibold">The Beginning</span>
                                </div>
                                <h2 className="text-4xl font-royal font-bold text-heritage mb-6">
                                    Born from Passion, Crafted with Love
                                </h2>
                                <div className="space-y-4 text-heritage/80 leading-relaxed">
                                    <p>
                                        In the vibrant lanes of Jaipur, where the air carries whispers of centuries-old traditions, Varaha Jewels was born. Our founder, inspired by the intricate artistry of Rajasthani jewelry, envisioned a brand that would bridge the gap between heritage and modernity.
                                    </p>
                                    <p>
                                        What started as a small workshop with a handful of master artisans has grown into a celebrated name in heritage jewelry. But our core values remain unchanged - authenticity, craftsmanship, and a deep respect for tradition.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Timeline */}
                <section className="py-16 bg-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-royal font-bold text-heritage mb-4">Our Journey</h2>
                            <p className="text-heritage/70">Milestones that shaped Varaha Jewels</p>
                        </div>

                        <div className="space-y-8">
                            {[
                                {
                                    year: '1995',
                                    title: 'The Foundation',
                                    description: 'Varaha Jewels was established in Jaipur with a vision to preserve traditional jewelry-making techniques.'
                                },
                                {
                                    year: '2005',
                                    title: 'Expanding Horizons',
                                    description: 'Opened our first flagship showroom and introduced contemporary designs while maintaining heritage aesthetics.'
                                },
                                {
                                    year: '2015',
                                    title: 'Digital Transformation',
                                    description: 'Launched our online platform, making authentic heritage jewelry accessible across India.'
                                },
                                {
                                    year: '2020',
                                    title: 'Sustainability Initiative',
                                    description: 'Committed to ethical sourcing and sustainable practices in jewelry production.'
                                },
                                {
                                    year: '2025',
                                    title: 'New Chapter',
                                    description: 'Continuing to innovate while honoring our roots, serving thousands of happy customers nationwide.'
                                }
                            ].map((milestone, index) => (
                                <div key={index} className="flex gap-6">
                                    <div className="flex-shrink-0 w-24 text-right">
                                        <span className="text-3xl font-bold text-copper">{milestone.year}</span>
                                    </div>
                                    <div className="relative flex-1 pb-8 border-l-2 border-copper/30 pl-6">
                                        <div className="absolute -left-2 top-0 w-4 h-4 bg-copper rounded-full"></div>
                                        <h3 className="text-xl font-bold text-heritage mb-2">{milestone.title}</h3>
                                        <p className="text-heritage/70">{milestone.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Craftsmanship */}
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users className="text-copper" size={24} />
                                    <span className="text-copper font-semibold">The Artisans</span>
                                </div>
                                <h2 className="text-4xl font-royal font-bold text-heritage mb-6">
                                    Hands That Create Magic
                                </h2>
                                <div className="space-y-4 text-heritage/80 leading-relaxed">
                                    <p>
                                        Behind every piece of Varaha jewelry is a master artisan whose skills have been honed over decades. Many of our craftsmen come from families that have been in the jewelry-making business for generations.
                                    </p>
                                    <p>
                                        They don't just create jewelry; they pour their heart, soul, and heritage into every piece. From intricate Kundan work to delicate Meenakari, from traditional Polki settings to contemporary fusion designs - their expertise knows no bounds.
                                    </p>
                                    <p>
                                        We're proud to provide them with a platform where their art is celebrated, their skills are valued, and their legacy continues to shine.
                                    </p>
                                </div>
                            </div>
                            <div className="order-1 md:order-2 relative">
                                <div className="aspect-square rounded-sm overflow-hidden shadow-2xl">
                                    <Image
                                        src="/varaha-assets/Jimage2.avif"
                                        alt="Artisan Craftsmanship"
                                        width={600}
                                        height={600}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -top-6 -right-6 w-32 h-32 bg-copper/20 rounded-sm -z-10"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="py-16 bg-gradient-to-b from-heritage/5 to-transparent">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-royal font-bold text-heritage mb-4">What Drives Us</h2>
                            <p className="text-heritage/70 max-w-2xl mx-auto">
                                The principles that guide every decision we make
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: <Heart size={40} />,
                                    title: 'Passion for Perfection',
                                    description: 'Every piece is crafted with meticulous attention to detail, ensuring it meets our exacting standards of quality and beauty.'
                                },
                                {
                                    icon: <Sparkles size={40} />,
                                    title: 'Preserving Heritage',
                                    description: 'We honor traditional techniques while embracing innovation, keeping India\'s rich jewelry-making heritage alive for future generations.'
                                },
                                {
                                    icon: <Award size={40} />,
                                    title: 'Uncompromising Authenticity',
                                    description: 'Every piece is BIS hallmarked and comes with certification, guaranteeing 100% authentic, pure, and ethically sourced materials.'
                                }
                            ].map((value, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-8 rounded-sm border border-copper/30 hover:shadow-xl transition-all duration-300 text-center"
                                >
                                    <div className="text-copper mb-4 flex justify-center">{value.icon}</div>
                                    <h3 className="text-xl font-bold text-heritage mb-3">{value.title}</h3>
                                    <p className="text-heritage/70 leading-relaxed">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sustainability */}
                <section className="py-16 bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-copper/10 rounded-full mb-4">
                                <MapPin className="text-copper" size={32} />
                            </div>
                            <h2 className="text-4xl font-royal font-bold text-heritage mb-4">
                                Our Commitment to Tomorrow
                            </h2>
                            <p className="text-heritage/80 leading-relaxed max-w-2xl mx-auto">
                                We believe in creating beauty responsibly. Our commitment to sustainability extends from ethical sourcing of materials to fair treatment of our artisans. We're dedicated to minimizing our environmental impact while maximizing the positive impact on the communities we work with.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 mt-12">
                            <div className="p-6 bg-green-50 border border-green-200 rounded-sm">
                                <p className="text-3xl font-bold text-green-700 mb-2">100%</p>
                                <p className="text-sm text-green-800">Ethical Sourcing</p>
                            </div>
                            <div className="p-6 bg-blue-50 border border-blue-200 rounded-sm">
                                <p className="text-3xl font-bold text-blue-700 mb-2">50+</p>
                                <p className="text-sm text-blue-800">Artisan Families Supported</p>
                            </div>
                            <div className="p-6 bg-purple-50 border border-purple-200 rounded-sm">
                                <p className="text-3xl font-bold text-purple-700 mb-2">Zero</p>
                                <p className="text-sm text-purple-800">Conflict Materials</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-4xl font-royal font-bold text-heritage mb-6">
                            Become Part of Our Story
                        </h2>
                        <p className="text-heritage/80 mb-8 max-w-2xl mx-auto">
                            Every piece of Varaha jewelry carries a story - of tradition, craftsmanship, and timeless beauty. Let us help you create your own story.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/shop"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-copper text-warm-sand font-bold rounded-sm hover:bg-heritage transition-all duration-300 shadow-lg"
                            >
                                Explore Collections
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-copper text-copper font-bold rounded-sm hover:bg-copper hover:text-warm-sand transition-all duration-300"
                            >
                                Visit Our Showroom
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
