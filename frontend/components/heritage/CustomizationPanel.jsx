import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronRight, Check, Info } from 'lucide-react';
import { METAL_OPTIONS, STONE_OPTIONS, CUSTOMIZATION_STEPS } from '../../data/heritageProducts';

export default function CustomizationPanel({ product, onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(CUSTOMIZATION_STEPS.METAL);
  const [selectedMetal, setSelectedMetal] = useState(null);
  const [selectedCarat, setSelectedCarat] = useState(null);
  const [selectedPurity, setSelectedPurity] = useState(null);
  const [selectedStone, setSelectedStone] = useState(null);
  const [goldPolish, setGoldPolish] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    setCurrentStep(CUSTOMIZATION_STEPS.METAL);
    setSelectedMetal(null);
    setSelectedCarat(null);
    setSelectedPurity(null);
    setSelectedStone(null);
    setGoldPolish(false);
  }, [product]);

  const handleMetalSelect = (metal) => {
    setSelectedMetal(metal);
    setSelectedCarat(null);
    setSelectedPurity(null);
    setCurrentStep(CUSTOMIZATION_STEPS.SPECIFICATIONS);
  };

  const handleSpecificationSelect = (type, value) => {
    if (type === 'carat') setSelectedCarat(value);
    if (type === 'purity') setSelectedPurity(value);
    setCurrentStep(CUSTOMIZATION_STEPS.STONES);
  };

  const handleStoneSelect = (stone) => {
    setSelectedStone(stone);
    setCurrentStep(CUSTOMIZATION_STEPS.REVIEW);
  };

  const handleComplete = () => {
    const customizationData = {
      product,
      metal: selectedMetal,
      carat: selectedCarat,
      purity: selectedPurity,
      stone: selectedStone,
      goldPolish: goldPolish
    };
    onComplete(customizationData);
  };

  const canProceed = () => {
    if (currentStep === CUSTOMIZATION_STEPS.METAL) return selectedMetal;
    if (currentStep === CUSTOMIZATION_STEPS.SPECIFICATIONS) {
      if (selectedMetal === 'gold') return selectedCarat;
      if (selectedMetal === 'platinum') return selectedPurity;
      if (selectedMetal === 'silver') return true;
    }
    if (currentStep === CUSTOMIZATION_STEPS.STONES) return selectedStone;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
          >
            <X size={24} className="text-heritage" />
          </button>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: Image Preview */}
            <div className="relative bg-gradient-to-br from-warm-sand/30 to-copper/10 p-8 md:p-12 flex flex-col justify-center">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl mb-6">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="text-center">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-heritage mb-2">
                  {product.name}
                </h2>
                <p className="text-base md:text-lg text-gray-600 mb-4">
                  {product.isPremium
                    ? 'Premium — Personalized design & consultation'
                    : 'Ready to buy with customization'}
                </p>

                {product.isPremium && (
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span>⏱️ {product.craftingTime}</span>
                    <span>⚖️ Min. {product.minWeight}</span>
                  </div>
                )}
              </div>

              {/* Selected Summary */}
              {(selectedMetal || selectedStone) && (
                <div className="mt-6 p-4 bg-white rounded-xl shadow-md">
                  <h4 className="font-semibold text-heritage mb-3 text-sm">Your Selection:</h4>
                  <div className="space-y-2 text-sm">
                    {selectedMetal && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span>Metal: {METAL_OPTIONS[selectedMetal.toUpperCase()]?.label}</span>
                      </div>
                    )}
                    {selectedCarat && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span>Carat: {selectedCarat}</span>
                      </div>
                    )}
                    {selectedPurity && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span>Purity: {selectedPurity}%</span>
                      </div>
                    )}
                    {selectedStone && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span>Stones: {STONE_OPTIONS.find(s => s.value === selectedStone)?.label}</span>
                      </div>
                    )}
                    {selectedMetal === 'silver' && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span>Gold Polish: {goldPolish ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Customization Steps */}
            <div className="p-6 md:p-10 overflow-y-auto max-h-[90vh]">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all ${
                        step < currentStep
                          ? 'bg-green-500 text-white'
                          : step === currentStep
                          ? 'bg-copper text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step < currentStep ? <Check size={16} /> : step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-12 h-1 mx-1 ${
                          step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="space-y-6">
                {/* Step 1: Metal Selection */}
                {currentStep === CUSTOMIZATION_STEPS.METAL && (
                  <MetalSelection onSelect={handleMetalSelect} selected={selectedMetal} />
                )}

                {/* Step 2: Specifications */}
                {currentStep === CUSTOMIZATION_STEPS.SPECIFICATIONS && (
                  <SpecificationSelection
                    metal={selectedMetal}
                    onSelect={handleSpecificationSelect}
                    selectedCarat={selectedCarat}
                    selectedPurity={selectedPurity}
                    goldPolish={goldPolish}
                    onGoldPolishChange={setGoldPolish}
                  />
                )}

                {/* Step 3: Stone Selection */}
                {currentStep === CUSTOMIZATION_STEPS.STONES && (
                  <StoneSelection onSelect={handleStoneSelect} selected={selectedStone} />
                )}

                {/* Step 4: Review & Complete */}
                {currentStep === CUSTOMIZATION_STEPS.REVIEW && (
                  <ReviewStep
                    product={product}
                    customization={{
                      metal: selectedMetal,
                      carat: selectedCarat,
                      purity: selectedPurity,
                      stone: selectedStone,
                      goldPolish: goldPolish
                    }}
                    onComplete={handleComplete}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metal Selection Component
function MetalSelection({ onSelect, selected }) {
  return (
    <div>
      <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Select Metal</h3>
      <p className="text-gray-600 mb-6 text-sm">Choose your preferred metal for this piece</p>

      <div className="grid grid-cols-1 gap-4">
        {Object.values(METAL_OPTIONS).map((metal) => (
          <button
            key={metal.value}
            onClick={() => onSelect(metal.value)}
            className={`p-5 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
              selected === metal.value
                ? 'border-copper bg-copper/5'
                : 'border-gray-200 hover:border-copper/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{metal.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-heritage">{metal.label}</h4>
                {metal.purity && (
                  <p className="text-sm text-gray-600">{metal.purity}</p>
                )}
              </div>
              <ChevronRight className="text-copper" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Specification Selection Component
function SpecificationSelection({ metal, onSelect, selectedCarat, selectedPurity, goldPolish, onGoldPolishChange }) {
  if (metal === 'gold') {
    return (
      <div>
        <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Select Carat</h3>
        <p className="text-gray-600 mb-6 text-sm">Choose gold purity level</p>

        <div className="grid grid-cols-1 gap-3">
          {METAL_OPTIONS.GOLD.carats.map((carat) => (
            <button
              key={carat.value}
              onClick={() => onSelect('carat', carat.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                selectedCarat === carat.value
                  ? 'border-copper bg-copper/5'
                  : 'border-gray-200 hover:border-copper/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-heritage">{carat.label}</h4>
                  <p className="text-sm text-gray-600">Purity: {carat.purity}</p>
                </div>
                <ChevronRight className="text-copper" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (metal === 'platinum') {
    return (
      <div>
        <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Select Purity</h3>
        <p className="text-gray-600 mb-6 text-sm">Choose platinum grade</p>

        <div className="grid grid-cols-1 gap-3">
          {METAL_OPTIONS.PLATINUM.purities.map((purity) => (
            <button
              key={purity.value}
              onClick={() => onSelect('purity', purity.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                selectedPurity === purity.value
                  ? 'border-copper bg-copper/5'
                  : 'border-gray-200 hover:border-copper/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-heritage">{purity.label}</h4>
                  <p className="text-sm text-gray-600">{purity.description}</p>
                </div>
                <ChevronRight className="text-copper" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (metal === 'silver') {
    return (
      <div>
        <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Gold Polish Option</h3>
        <p className="text-gray-600 mb-6 text-sm">Would you like gold plating/polish?</p>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => {
              onGoldPolishChange(false);
              onSelect('polish', false);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
              !goldPolish
                ? 'border-copper bg-copper/5'
                : 'border-gray-200 hover:border-copper/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-heritage">No Gold Polish</h4>
                <p className="text-sm text-gray-600">Pure silver finish</p>
              </div>
              <ChevronRight className="text-copper" />
            </div>
          </button>

          <button
            onClick={() => {
              onGoldPolishChange(true);
              onSelect('polish', true);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
              goldPolish
                ? 'border-copper bg-copper/5'
                : 'border-gray-200 hover:border-copper/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-heritage">With Gold Polish</h4>
                <p className="text-sm text-gray-600">24k gold plating</p>
              </div>
              <ChevronRight className="text-copper" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Stone Selection Component
function StoneSelection({ onSelect, selected }) {
  return (
    <div>
      <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Select Stones</h3>
      <p className="text-gray-600 mb-6 text-sm">Choose stone type or skip</p>

      <div className="grid grid-cols-1 gap-4">
        {STONE_OPTIONS.map((stone) => (
          <button
            key={stone.value}
            onClick={() => onSelect(stone.value)}
            className={`p-5 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
              selected === stone.value
                ? 'border-copper bg-copper/5'
                : 'border-gray-200 hover:border-copper/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stone.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-heritage">{stone.label}</h4>
                <p className="text-sm text-gray-600">{stone.description}</p>
              </div>
              <ChevronRight className="text-copper" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Review Step Component
function ReviewStep({ product, customization, onComplete }) {
  return (
    <div>
      <h3 className="font-serif text-2xl font-bold text-heritage mb-2">Review Your Design</h3>
      <p className="text-gray-600 mb-6 text-sm">Confirm your customization before proceeding</p>

      <div className="bg-warm-sand/20 rounded-xl p-6 mb-6">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Product</span>
            <span className="font-semibold text-heritage">{product.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Metal</span>
            <span className="font-semibold text-heritage">
              {METAL_OPTIONS[customization.metal?.toUpperCase()]?.label}
            </span>
          </div>
          {customization.carat && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Carat</span>
              <span className="font-semibold text-heritage">{customization.carat}</span>
            </div>
          )}
          {customization.purity && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Purity</span>
              <span className="font-semibold text-heritage">{customization.purity}%</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Stones</span>
            <span className="font-semibold text-heritage">
              {STONE_OPTIONS.find(s => s.value === customization.stone)?.label}
            </span>
          </div>
          {customization.metal === 'silver' && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Gold Polish</span>
              <span className="font-semibold text-heritage">
                {customization.goldPolish ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          {product.isPremium ? (
            <p>
              <strong>Premium Product:</strong> Your design will be reviewed by our master craftsmen. 
              We'll contact you within 24 hours to schedule a consultation.
            </p>
          ) : (
            <p>
              <strong>Ready to Order:</strong> This customized piece will be added to your cart 
              and you can proceed to checkout.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-4 bg-gradient-to-r from-copper to-heritage text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        {product.isPremium ? '📅 Book an Appointment' : '🛒 Buy Now'}
      </button>
    </div>
  );
}
