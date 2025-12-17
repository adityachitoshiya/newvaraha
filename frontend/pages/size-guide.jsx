import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Ruler, Download, Info } from 'lucide-react';

export default function SizeGuide() {
    const [selectedType, setSelectedType] = useState('ring');
    const [ringSize, setRingSize] = useState({ indian: '', us: '', uk: '' });

    const ringSizes = [
        { indian: '4', us: '3', uk: 'F', diameter: '14.0' },
        { indian: '5', us: '3.5', uk: 'G', diameter: '14.4' },
        { indian: '6', us: '4', uk: 'H', diameter: '14.8' },
        { indian: '7', us: '4.5', uk: 'I', diameter: '15.3' },
        { indian: '8', us: '5', uk: 'J', diameter: '15.7' },
        { indian: '9', us: '5.5', uk: 'K', diameter: '16.1' },
        { indian: '10', us: '6', uk: 'L', diameter: '16.5' },
        { indian: '11', us: '6.5', uk: 'M', diameter: '16.9' },
        { indian: '12', us: '7', uk: 'N', diameter: '17.3' },
        { indian: '13', us: '7.5', uk: 'O', diameter: '17.7' },
        { indian: '14', us: '8', uk: 'P', diameter: '18.1' },
        { indian: '15', us: '8.5', uk: 'Q', diameter: '18.5' },
        { indian: '16', us: '9', uk: 'R', diameter: '19.0' },
        { indian: '17', us: '9.5', uk: 'S', diameter: '19.4' },
        { indian: '18', us: '10', uk: 'T', diameter: '19.8' },
        { indian: '19', us: '10.5', uk: 'U', diameter: '20.2' },
        { indian: '20', us: '11', uk: 'V', diameter: '20.6' }
    ];

    const bangleSizes = [
        { size: '2-0', diameter: '5.0 cm', description: 'Extra Small - Children' },
        { size: '2-2', diameter: '5.5 cm', description: 'Small - Petite wrists' },
        { size: '2-4', diameter: '6.0 cm', description: 'Medium - Average wrists' },
        { size: '2-6', diameter: '6.5 cm', description: 'Large - Larger wrists' },
        { size: '2-8', diameter: '7.0 cm', description: 'Extra Large' }
    ];

    const necklaceLengths = [
        { length: '14"', description: 'Choker - Sits at base of neck' },
        { length: '16"', description: 'Princess - Just below throat' },
        { length: '18"', description: 'Princess - Most common length' },
        { length: '20"', description: 'Matinee - Falls at collarbone' },
        { length: '24"', description: 'Opera - Falls at bust line' },
        { length: '30"', description: 'Rope - Falls below bust' }
    ];

    return (
        <>
            <Head>
                <title>Size Guide - Jewelry Sizing Chart | Varaha Jewels</title>
                <meta name="description" content="Find your perfect fit with our comprehensive jewelry size guide. Ring, bracelet, and necklace sizing charts with measurement instructions." />
            </Head>

            <Header />

            <main className="min-h-screen bg-warm-sand py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">
                            Jewelry Size Guide
                        </h1>
                        <p className="text-heritage/70 max-w-2xl mx-auto">
                            Find your perfect fit with our comprehensive sizing charts and measurement guides
                        </p>
                        <div className="w-20 h-px bg-copper mx-auto mt-6"></div>
                    </div>

                    {/* Type Selector */}
                    <div className="flex flex-wrap gap-3 justify-center mb-12">
                        {[
                            { id: 'ring', name: 'Ring Sizes' },
                            { id: 'bangle', name: 'Bangle/Bracelet' },
                            { id: 'necklace', name: 'Necklace Lengths' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-6 py-3 rounded-sm font-semibold transition-all ${selectedType === type.id
                                        ? 'bg-copper text-warm-sand shadow-lg'
                                        : 'bg-white text-heritage border-2 border-copper/30 hover:border-copper'
                                    }`}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>

                    {/* Ring Size Chart */}
                    {selectedType === 'ring' && (
                        <div className="space-y-8">
                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h2 className="text-2xl font-royal font-bold text-heritage mb-6 flex items-center gap-3">
                                    <Ruler className="text-copper" size={28} />
                                    Ring Size Chart
                                </h2>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-copper/10 border-b-2 border-copper/30">
                                                <th className="px-4 py-3 text-left font-bold text-heritage">Indian Size</th>
                                                <th className="px-4 py-3 text-left font-bold text-heritage">US Size</th>
                                                <th className="px-4 py-3 text-left font-bold text-heritage">UK Size</th>
                                                <th className="px-4 py-3 text-left font-bold text-heritage">Diameter (mm)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ringSizes.map((size, index) => (
                                                <tr key={index} className="border-b border-copper/10 hover:bg-copper/5 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-heritage">{size.indian}</td>
                                                    <td className="px-4 py-3 text-heritage/80">{size.us}</td>
                                                    <td className="px-4 py-3 text-heritage/80">{size.uk}</td>
                                                    <td className="px-4 py-3 text-heritage/80">{size.diameter}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* How to Measure */}
                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h3 className="text-xl font-bold text-heritage mb-6 flex items-center gap-2">
                                    <Info className="text-copper" size={24} />
                                    How to Measure Your Ring Size
                                </h3>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="font-semibold text-heritage mb-3">Method 1: Using a Ring</h4>
                                        <ol className="space-y-2 text-heritage/80 text-sm">
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">1.</span>
                                                <span>Take a ring that fits your finger well</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">2.</span>
                                                <span>Measure the inner diameter in millimeters</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">3.</span>
                                                <span>Match the measurement with the chart above</span>
                                            </li>
                                        </ol>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-heritage mb-3">Method 2: Using String</h4>
                                        <ol className="space-y-2 text-heritage/80 text-sm">
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">1.</span>
                                                <span>Wrap a string around your finger</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">2.</span>
                                                <span>Mark where the string overlaps</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="font-bold text-copper">3.</span>
                                                <span>Measure the length and divide by 3.14 to get diameter</span>
                                            </li>
                                        </ol>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-copper/10 border border-copper/30 rounded-sm">
                                    <p className="text-sm text-heritage/80">
                                        <strong>Pro Tip:</strong> Measure your finger at the end of the day when it's slightly larger. Fingers can swell in heat and shrink in cold.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bangle/Bracelet Size Chart */}
                    {selectedType === 'bangle' && (
                        <div className="space-y-8">
                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h2 className="text-2xl font-royal font-bold text-heritage mb-6 flex items-center gap-3">
                                    <Ruler className="text-copper" size={28} />
                                    Bangle & Bracelet Size Chart
                                </h2>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-copper/10 border-b-2 border-copper/30">
                                                <th className="px-4 py-3 text-left font-bold text-heritage">Size</th>
                                                <th className="px-4 py-3 text-left font-bold text-heritage">Inner Diameter</th>
                                                <th className="px-4 py-3 text-left font-bold text-heritage">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bangleSizes.map((size, index) => (
                                                <tr key={index} className="border-b border-copper/10 hover:bg-copper/5 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-heritage">{size.size}</td>
                                                    <td className="px-4 py-3 text-heritage/80">{size.diameter}</td>
                                                    <td className="px-4 py-3 text-heritage/80">{size.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h3 className="text-xl font-bold text-heritage mb-6 flex items-center gap-2">
                                    <Info className="text-copper" size={24} />
                                    How to Measure Your Wrist
                                </h3>

                                <div className="space-y-4 text-heritage/80">
                                    <p>
                                        <strong className="text-heritage">For Bangles:</strong> Bring your thumb and little finger together and measure the widest part of your hand. The bangle should slide over this point.
                                    </p>
                                    <p>
                                        <strong className="text-heritage">For Bracelets:</strong> Measure your wrist circumference with a flexible measuring tape or string. Add 1-2 cm for a comfortable fit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Necklace Length Guide */}
                    {selectedType === 'necklace' && (
                        <div className="space-y-8">
                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h2 className="text-2xl font-royal font-bold text-heritage mb-6 flex items-center gap-3">
                                    <Ruler className="text-copper" size={28} />
                                    Necklace Length Guide
                                </h2>

                                <div className="space-y-4">
                                    {necklaceLengths.map((length, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 border border-copper/20 rounded-sm hover:bg-copper/5 transition-colors"
                                        >
                                            <div>
                                                <p className="font-bold text-heritage text-lg">{length.length}</p>
                                                <p className="text-sm text-heritage/70">{length.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white border border-copper/30 rounded-sm p-8">
                                <h3 className="text-xl font-bold text-heritage mb-6">Choosing the Right Length</h3>
                                <div className="space-y-3 text-heritage/80">
                                    <p>
                                        <strong className="text-heritage">Choker (14"):</strong> Best for V-neck or off-shoulder outfits. Draws attention to the neck and collarbone.
                                    </p>
                                    <p>
                                        <strong className="text-heritage">Princess (16"-18"):</strong> Most versatile length. Works with most necklines and occasions.
                                    </p>
                                    <p>
                                        <strong className="text-heritage">Matinee (20"-24"):</strong> Perfect for business attire and high necklines.
                                    </p>
                                    <p>
                                        <strong className="text-heritage">Opera (30"+):</strong> Ideal for formal events. Can be worn long or doubled.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Download & Contact */}
                    <div className="mt-12 grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-6 text-center">
                            <Download className="mx-auto mb-3 text-copper" size={40} />
                            <h3 className="text-lg font-bold text-heritage mb-2">Download Size Chart</h3>
                            <p className="text-sm text-heritage/70 mb-4">Get a printable PDF version of our size charts</p>
                            <button className="px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all">
                                Download PDF
                            </button>
                        </div>

                        <div className="bg-gradient-to-br from-copper/10 to-transparent border border-copper/30 rounded-sm p-6 text-center">
                            <Info className="mx-auto mb-3 text-copper" size={40} />
                            <h3 className="text-lg font-bold text-heritage mb-2">Need Help?</h3>
                            <p className="text-sm text-heritage/70 mb-4">Our experts can help you find the perfect size</p>
                            <Link
                                href="/contact"
                                className="inline-block px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
