import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../lib/config';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
    Package, Truck, CheckCircle, Clock, MapPin,
    ChevronLeft, Star, Upload, Video, Image as ImageIcon
} from 'lucide-react';

export default function OrderDetails() {
    const router = useRouter();
    const { orderId } = router.query;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // Review State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/orders/${orderId}`);
            if (response.ok) {
                const data = await response.json();

                // Parse items and history
                let products = [];
                try { products = JSON.parse(data.items_json); } catch (e) { }

                let history = [];
                try {
                    history = data.status_history ? JSON.parse(data.status_history) : [];
                } catch (e) {
                    // If it's not JSON, it might be empty or legacy
                }

                // If no history exists but status does, create initial history point (polyfill)
                if (history.length === 0 && data.status) {
                    history.push({
                        status: data.status,
                        timestamp: data.created_at,
                        comment: 'Order placed'
                    });
                }

                setOrder({
                    ...data,
                    items: products,
                    history: history,
                    // Normalize status for comparison
                    statusLower: data.status.toLowerCase()
                });

                // Check if already reviewed? (Not implemented in backend yet, skipping for now)

            } else {
                console.error("Failed to fetch order");
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!comment) return;

        setSubmittingReview(true);
        try {
            // We need a product ID. Assuming single product or main product for now.
            // In a real app we'd loop through items.
            const productId = order.items[0]?.id || 'unknown';

            const response = await fetch(`${getApiUrl()}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    customer_name: order.customer_name,
                    rating: rating,
                    comment: comment,
                    media_urls: mediaUrl ? [mediaUrl] : []
                })
            });

            if (response.ok) {
                setReviewSubmitted(true);
                alert("Review submitted successfully!");
            } else {
                alert("Failed to submit review.");
            }
        } catch (err) {
            console.error(err);
            alert("Error submitting review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-warm-sand flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-copper border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-warm-sand flex flex-col items-center justify-center">
                <h1 className="text-2xl font-royal text-heritage mb-4">Order Not Found</h1>
                <Link href="/orders" className="text-copper hover:underline">Back to Orders</Link>
            </div>
        );
    }

    const isDelivered = ['delivered', 'completed'].includes(order.statusLower);

    return (
        <>
            <Head>
                <title>Order #{order.order_id} - Varaha Jewels</title>
            </Head>
            <Header />

            <main className="min-h-screen bg-warm-sand py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <Link href="/orders" className="inline-flex items-center text-heritage/60 hover:text-heritage mb-6 transition-colors">
                        <ChevronLeft size={20} /> Back to Orders
                    </Link>

                    <h1 className="text-3xl font-royal font-bold text-heritage mb-2">Order Tracking</h1>
                    <p className="text-heritage/60 mb-8">Order ID: <span className="font-mono text-heritage">{order.order_id}</span></p>

                    {/* Timeline */}
                    <div className="bg-white p-8 rounded-sm border border-copper/30 mb-8">
                        <h2 className="text-xl font-royal font-bold text-heritage mb-6">Delivery Status</h2>
                        <div className="relative border-l-2 border-copper/20 ml-2 space-y-8 pl-8">
                            {order.history.map((step, index) => (
                                <div key={index} className="relative">
                                    <span className="absolute -left-[43px] bg-warm-sand border-2 border-copper rounded-full p-1.5 text-copper">
                                        {step.status.toLowerCase().includes('delivered') ? <CheckCircle size={16} /> :
                                            step.status.toLowerCase().includes('shipped') ? <Truck size={16} /> :
                                                <Clock size={16} />}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-bold text-heritage capitalize">{step.status}</h3>
                                        <p className="text-sm text-heritage/70">{step.comment}</p>
                                        <p className="text-xs text-heritage/50 mt-1">
                                            {new Date(step.timestamp).toLocaleString('en-IN', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Future Steps Visualization (Static) */}
                            {!isDelivered && (
                                <div className="relative opacity-40">
                                    <span className="absolute -left-[43px] bg-gray-200 rounded-full p-1.5 text-gray-400">
                                        <Package size={16} />
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-500">Delivered</h3>
                                    <p className="text-sm text-gray-400">Expected soon...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Items Summary */}
                    <div className="bg-white p-8 rounded-sm border border-copper/30 mb-8">
                        <h2 className="text-xl font-royal font-bold text-heritage mb-4">Items</h2>
                        <div className="space-y-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                    <div>
                                        <p className="font-medium text-heritage">{item.name}</p>
                                        <p className="text-sm text-heritage/60">Qty: {item.quantity} | {item.variant || 'Standard'}</p>
                                    </div>
                                    <p className="font-bold text-copper">₹{item.price}</p>
                                </div>
                            ))}
                        </div>

                        {/* Price Breakdown */}
                        <div className="mt-6 pt-4 border-t border-copper/20 space-y-2">
                            {/* Calculate subtotal from items */}
                            {(() => {
                                const subtotal = order.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
                                const codCharges = order.payment_method === 'cod' ? 59 : 0;
                                const discount = subtotal + codCharges - order.total_amount;

                                return (
                                    <>
                                        {/* Subtotal */}
                                        <div className="flex justify-between text-sm text-heritage/70">
                                            <span>Subtotal</span>
                                            <span>₹{subtotal.toLocaleString()}</span>
                                        </div>

                                        {/* Discount if any */}
                                        {discount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Discount</span>
                                                <span>-₹{discount.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* COD Charges */}
                                        {codCharges > 0 && (
                                            <div className="flex justify-between text-sm text-heritage/70">
                                                <span>COD Charges</span>
                                                <span>₹{codCharges}</span>
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-copper/30">
                                            <span className="font-bold text-heritage">Total Amount</span>
                                            <span className="text-xl font-royal font-bold text-copper">₹{order.total_amount.toLocaleString()}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Review Section - Only if Delivered */}
                    {isDelivered && !reviewSubmitted && (
                        <div className="bg-white p-8 rounded-sm border border-copper/30">
                            <h2 className="text-xl font-royal font-bold text-heritage mb-2">Rate & Review</h2>
                            <p className="text-heritage/60 mb-6">Tell us about your experience with the product.</p>

                            <form onSubmit={handleSubmitReview}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-heritage mb-2">Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className={`transition-colors ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                            >
                                                <Star size={28} fill={star <= rating ? "currentColor" : "none"} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-heritage mb-2">Review (Text)</label>
                                    <textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-sm focus:ring-1 focus:ring-copper focus:border-copper"
                                        rows="4"
                                        placeholder="Write your feedback here..."
                                        required
                                    ></textarea>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-heritage mb-2">Add Media (Optional)</label>
                                    <div className="flex gap-4 mb-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={mediaUrl}
                                                onChange={e => setMediaUrl(e.target.value)}
                                                placeholder="Paste image or video URL..."
                                                className="w-full p-2 border border-gray-200 rounded-sm text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-heritage/50 flex gap-2 items-center">
                                        <ImageIcon size={14} /> Supports Images
                                        <Video size={14} /> Supports Video URLs
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="w-full py-3 bg-heritage text-warm-sand font-bold rounded-sm hover:bg-copper transition-colors disabled:opacity-50"
                                >
                                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </form>
                        </div>
                    )}

                    {reviewSubmitted && (
                        <div className="bg-green-50 border border-green-200 p-8 rounded-sm text-center">
                            <CheckCircle className="mx-auto text-green-600 mb-2" size={48} />
                            <h3 className="text-xl font-bold text-green-800">Thank You!</h3>
                            <p className="text-green-700">Your review has been submitted successfully.</p>
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </>
    );
}
