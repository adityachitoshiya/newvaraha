import { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react';

export default function BookingModal({ product, customization, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    if (!formData.preferredDate) newErrors.preferredDate = 'Date is required';
    if (!formData.preferredTime) newErrors.preferredTime = 'Time is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-copper to-heritage text-white p-6 sm:p-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
            Book Your Consultation
          </h2>
          <p className="text-white/90 text-sm sm:text-base">
            Our master craftsmen will discuss your custom design in detail
          </p>
        </div>

        {/* Product Summary */}
        <div className="px-6 sm:px-8 py-4 bg-warm-sand/20 border-b border-gray-200">
          <h3 className="font-semibold text-heritage mb-2">Your Selection:</h3>
          <p className="text-sm text-gray-700">
            <strong>{product?.name}</strong> — {customization?.metal} 
            {customization?.carat && ` (${customization.carat})`}
            {customization?.purity && ` (${customization.purity}% purity)`}
            {customization?.stone && ` with ${customization.stone}`}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <User size={16} className="text-copper" />
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-copper transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Mail size={16} className="text-copper" />
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-copper transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Phone size={16} className="text-copper" />
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-copper transition-colors ${
                errors.phone ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} className="text-copper" />
                Preferred Date *
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                min={minDate}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-copper transition-colors ${
                  errors.preferredDate ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.preferredDate && <p className="text-red-500 text-xs mt-1">{errors.preferredDate}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Clock size={16} className="text-copper" />
                Preferred Time *
              </label>
              <select
                name="preferredTime"
                value={formData.preferredTime}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-copper transition-colors ${
                  errors.preferredTime ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                <option value="">Select time</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="2:00 PM">2:00 PM</option>
                <option value="3:00 PM">3:00 PM</option>
                <option value="4:00 PM">4:00 PM</option>
                <option value="5:00 PM">5:00 PM</option>
                <option value="6:00 PM">6:00 PM</option>
              </select>
              {errors.preferredTime && <p className="text-red-500 text-xs mt-1">{errors.preferredTime}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare size={16} className="text-copper" />
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-copper transition-colors resize-none"
              placeholder="Any specific requirements or questions..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="mb-2">
              <strong>What happens next?</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>We'll confirm your appointment within 24 hours</li>
              <li>Our expert will call you at your preferred time</li>
              <li>We'll discuss design, pricing, and timeline</li>
              <li>No obligation to proceed after consultation</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-copper to-heritage text-white font-bold text-lg rounded-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Booking...
              </span>
            ) : (
              '📅 Confirm Appointment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
