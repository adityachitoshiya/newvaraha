import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      // Here you can add API call to send email or store in database
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Contact form submitted:', formData);
      
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us - Varaha Jewels</title>
        <meta name="description" content="Get in touch with Varaha Jewels. We're here to help with your queries about our exquisite jewelry collection." />
      </Head>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-warm-sand via-white to-warm-sand pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-heritage mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-heritage/70 max-w-2xl mx-auto">
              Have a question about our jewelry? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border border-copper/20">
                <h2 className="text-2xl font-bold text-heritage mb-6">Get In Touch</h2>
                
                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-heritage to-copper p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-warm-sand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-heritage mb-1">Email</h3>
                      <a href="mailto:support@varahajewels.com" className="text-heritage/70 hover:text-copper transition-colors">
                        help@varahajewels.in
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-heritage to-copper p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-warm-sand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-heritage mb-1">Phone</h3>
                      <a href="tel:+919876543210" className="text-heritage/70 hover:text-copper transition-colors">
                        +91 98XXX 43210
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-heritage to-copper p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-warm-sand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-heritage mb-1">Address</h3>
                      <p className="text-heritage/70">
                        123 Heritage Lane<br />
                        Jewelry District<br />
                        Mumbai, Maharashtra 400001
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="mt-8 pt-6 border-t border-copper/20">
                  <h3 className="font-semibold text-heritage mb-3">Business Hours</h3>
                  <div className="space-y-2 text-sm text-heritage/70">
                    <div className="flex justify-between">
                      <span>Monday - Saturday</span>
                      <span className="font-medium">10:00 AM - 8:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="font-medium">11:00 AM - 6:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 border border-copper/20">
                <h2 className="text-2xl font-bold text-heritage mb-6">Send us a Message</h2>

                {submitted && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-800">Message Sent Successfully!</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Thank you for contacting us. We'll get back to you within 24 hours.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-heritage mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-heritage mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-heritage mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                        placeholder="+91 98XXX 43210"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-heritage mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                      placeholder="How can we help you?"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-heritage mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-heritage via-copper to-heritage text-warm-sand font-semibold rounded-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-warm-sand border-t-transparent rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8 border border-copper/20">
            <h2 className="text-2xl font-bold text-heritage mb-6 text-center">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-copper pl-4">
                <h3 className="font-semibold text-heritage mb-2">What are your shipping options?</h3>
                <p className="text-sm text-heritage/70">
                  We offer free shipping on all orders. Standard delivery takes 5-7 business days, and express delivery is available within 2-3 days.
                </p>
              </div>

              <div className="border-l-4 border-copper pl-4">
                <h3 className="font-semibold text-heritage mb-2">Do you provide certificates?</h3>
                <p className="text-sm text-heritage/70">
                  Yes, all our jewelry comes with authentic certification and a lifetime guarantee of purity.
                </p>
              </div>

              <div className="border-l-4 border-copper pl-4">
                <h3 className="font-semibold text-heritage mb-2">What is your return policy?</h3>
                <p className="text-sm text-heritage/70">
                  We offer a 30-day return policy on all products. Items must be in original condition with tags attached.
                </p>
              </div>

              <div className="border-l-4 border-copper pl-4">
                <h3 className="font-semibold text-heritage mb-2">Can I customize jewelry?</h3>
                <p className="text-sm text-heritage/70">
                  Yes! We offer customization services. Contact us with your design ideas and we'll create something unique for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
