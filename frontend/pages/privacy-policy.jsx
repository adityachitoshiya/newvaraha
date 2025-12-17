import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Shield, Cookie, Lock, Eye, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'information',
      icon: Eye,
      title: 'Information We Collect',
      content: `We collect information that you provide directly to us, including:
      
      • Personal information (name, email, phone number, shipping address)
      • Payment information (processed securely through our payment partners)
      • Order history and preferences
      • Communication preferences
      • Device and browsing information`
    },
    {
      id: 'cookies',
      icon: Cookie,
      title: 'How We Use Cookies',
      content: `We use cookies and similar technologies to:
      
      • Provide and maintain our services
      • Improve user experience and website functionality
      • Analyze website traffic and usage patterns
      • Personalize content and advertisements
      • Remember your preferences and settings
      
      You can control cookie preferences through our cookie consent banner.`
    },
    {
      id: 'usage',
      icon: Shield,
      title: 'How We Use Your Information',
      content: `We use the information we collect to:
      
      • Process and fulfill your orders
      • Communicate with you about your orders
      • Send promotional emails (with your consent)
      • Improve our products and services
      • Prevent fraud and ensure security
      • Comply with legal obligations`
    },
    {
      id: 'sharing',
      icon: Lock,
      title: 'Information Sharing',
      content: `We may share your information with:
      
      • Service providers (payment processors, shipping companies)
      • Analytics providers (Google Analytics, if you've consented)
      • Marketing partners (with your explicit consent)
      • Legal authorities (when required by law)
      
      We never sell your personal information to third parties.`
    },
    {
      id: 'security',
      icon: Lock,
      title: 'Data Security',
      content: `We implement industry-standard security measures to protect your data:
      
      • SSL/TLS encryption for all data transmission
      • Secure payment processing through trusted partners
      • Regular security audits and updates
      • Access controls and authentication
      • Data backup and recovery procedures`
    },
    {
      id: 'rights',
      icon: Shield,
      title: 'Your Rights',
      content: `You have the right to:
      
      • Access your personal data
      • Correct inaccurate information
      • Request deletion of your data
      • Opt-out of marketing communications
      • Withdraw cookie consent at any time
      • Export your data in a portable format
      
      Contact us to exercise any of these rights.`
    }
  ];

  return (
    <>
      <Head>
        <title>Privacy Policy - Varaha Jewels</title>
        <meta name="description" content="Privacy Policy for Varaha Jewels - Learn how we collect, use, and protect your personal information." />
        <meta name="robots" content="index, follow" />
      </Head>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-warm-sand/30 via-white to-warm-sand/30">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-r from-heritage to-copper text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mb-6">
                <Shield className="w-10 h-10" />
              </div>
              <h1 className="font-royal text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
                Privacy Policy
              </h1>
              <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
                Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
              </p>
              <p className="mt-4 text-sm text-white/70">
                Last Updated: November 20, 2025
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Introduction */}
              <div className="mb-12 p-6 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-2xl sm:text-3xl font-bold text-heritage mb-4">
                  Welcome to Varaha Jewels
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  At Varaha Jewels, we are committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 
                  or make a purchase.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  By using our website, you agree to the collection and use of information in accordance with this policy.
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <div
                      key={section.id}
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl"
                    >
                      <button
                        onClick={() => setActiveSection(isActive ? null : section.id)}
                        className="w-full p-6 sm:p-8 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-copper to-heritage rounded-xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-heritage">
                            {section.title}
                          </h3>
                        </div>
                        <div className={`flex-shrink-0 transform transition-transform ${isActive ? 'rotate-180' : ''}`}>
                          <svg className="w-6 h-6 text-heritage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isActive && (
                        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                              {section.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Contact Section */}
              <div className="mt-12 p-6 sm:p-8 bg-gradient-to-br from-copper/10 to-heritage/10 rounded-2xl border border-copper/20">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-copper to-heritage rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-heritage mb-3">
                      Questions About Privacy?
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      If you have any questions about this Privacy Policy or our data practices, please contact us at:
                    </p>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Email:</strong> privacy@varahajewels.com</p>
                      <p><strong>Phone:</strong> +91 XXXXX XXXXX</p>
                      <p><strong>Address:</strong> Your Business Address Here</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cookie Settings Link */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    localStorage.removeItem('cookieConsent');
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <Cookie className="w-5 h-5" />
                  Manage Cookie Preferences
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
