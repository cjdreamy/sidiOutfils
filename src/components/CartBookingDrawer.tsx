import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, ArrowRight } from 'lucide-react';
import { CartItem, BookingRecord } from '../data/defaultCatalog';

interface CartBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  user: { uid: string; email: string | null; displayName: string | null } | null;
  onSubmitBooking: (details: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    notes: string;
  }) => Promise<BookingRecord | null>;
}

export const CartBookingDrawer: React.FC<CartBookingDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateCartQty,
  onRemoveFromCart,
  user,
  onSubmitBooking,
}) => {
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<BookingRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.cartQuantity,
    0
  );
  const totalUnits = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = (customerName || user?.displayName || '').trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedAddress = deliveryAddress.trim();

    if (trimmedName.length < 2) {
      setFormError('Please enter your full name for the booking.');
      return;
    }
    if (trimmedPhone.length < 5) {
      setFormError('Please provide a valid mobile phone number so we can confirm your order.');
      return;
    }
    if (trimmedAddress.length < 3) {
      setFormError('Please enter your delivery address or boutique pickup preference.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onSubmitBooking({
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        deliveryAddress: trimmedAddress,
        notes: notes.trim(),
      });
      if (created) {
        setConfirmedOrder(created);
      }
    } catch (err) {
      console.error(err);
      setFormError('Could not complete booking. Please verify your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55">
      <div className="w-full max-w-md bg-[#FAF8F6] h-full flex flex-col justify-between shadow-2xl border-l border-[#E4D9D2]">
        {/* Top Drawer Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E4D9D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#4A154B]" />
            <h2 className="font-serif text-xl font-semibold text-[#1E1028]">
              Your Booking Bag ({totalUnits})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              onClose();
            }}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#574661] hover:text-[#1E1028] hover:bg-[#F2ECE7] transition-colors cursor-pointer"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {confirmedOrder ? (
            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-6 text-center space-y-4 my-4">
              <div className="w-12 h-12 rounded-full bg-[#4A154B] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono text-[#4A154B] font-semibold">
                {confirmedOrder.orderNumber} · SENT TO OWNER STUDIO
              </p>
              <h3 className="font-serif text-2xl font-semibold text-[#1E1028]">
                Booking Confirmed
              </h3>
              <p className="text-sm text-[#574661] leading-relaxed">
                Thank you, <strong className="text-[#1E1028]">{confirmedOrder.customerName}</strong>.
                Your booking for <strong className="text-[#1E1028]">{confirmedOrder.itemsSummary}</strong>{' '}
                has been recorded in the Sidi Outfits Owner Dashboard.
              </p>
              <div className="bg-[#FAF8F6] rounded-xl p-4 text-left text-xs space-y-1.5 border border-[#E4D9D2]">
                <div className="flex justify-between">
                  <span className="text-[#6D5A78]">Order Total:</span>
                  <span className="font-mono font-semibold text-[#1E1028] tabular-nums">
                    ${confirmedOrder.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6D5A78]">Phone:</span>
                  <span className="font-mono text-[#1E1028]">{confirmedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6D5A78]">Delivery:</span>
                  <span className="text-[#1E1028] truncate max-w-[200px]">
                    {confirmedOrder.deliveryAddress}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full min-h-[48px] rounded-xl bg-[#4A154B] text-white text-sm font-semibold hover:bg-[#380F39] transition-colors cursor-pointer"
              >
                Continue Exploring Sidi Outfits
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="font-serif text-2xl text-[#1E1028]">Your Booking Bag is Empty</p>
              <p className="text-sm text-[#574661] max-w-xs mx-auto">
                Explore our signature handbags, silk-velvet dresses, tailored outfits, and artisanal
                keychains. No sign-up required until you book.
              </p>
            </div>
          ) : (
            <>
              {/* Itemized Cart List */}
              <div className="space-y-3">
                {cart.map(({ product, cartQuantity }) => (
                  <div
                    key={product.id}
                    className="bg-white border border-[#E4D9D2] rounded-2xl p-3.5 flex items-center gap-3.5"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-18 h-18 rounded-xl object-cover bg-[#F4EFEA] border border-[#E4D9D2] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#6D5A78]">{product.category}</p>
                      <h4 className="text-sm font-semibold text-[#1E1028] truncate">
                        {product.name}
                      </h4>
                      <p className="font-mono text-xs font-semibold text-[#4A154B] mt-0.5 tabular-nums">
                        ${(product.price * cartQuantity).toFixed(2)}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(product.id, -1)}
                            className="w-8 h-8 rounded-lg bg-[#F4EFEA] hover:bg-[#E6DDD6] flex items-center justify-center text-[#1E1028] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs font-semibold tabular-nums">
                            {cartQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(product.id, 1)}
                            disabled={cartQuantity >= product.quantity}
                            className="w-8 h-8 rounded-lg bg-[#F4EFEA] hover:bg-[#E6DDD6] flex items-center justify-center text-[#1E1028] disabled:opacity-40 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(product.id)}
                          className="p-1.5 text-[#6D5A78] hover:text-red-700 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Frictionless Booking Reservation Form */}
              <form
                id="sidi-booking-form"
                onSubmit={handleCheckoutSubmit}
                className="bg-white border border-[#E4D9D2] rounded-2xl p-4 space-y-3.5"
              >
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#1E1028]">
                    Delivery & Booking Details
                  </h3>
                  <p className="text-xs text-[#574661]">
                    Reserve your pieces now. Your booking is sent directly to the Sidi Outfits owner
                    dashboard.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#3D2C47] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Amina Sidi"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF8F6] border border-[#D9CEC5] text-sm text-[#1E1028]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D2C47] mb-1">
                    Mobile Phone (WhatsApp / SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +1 555 234 5678"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF8F6] border border-[#D9CEC5] text-sm font-mono text-[#1E1028]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D2C47] mb-1">
                    Delivery Address or Boutique Pickup *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street address, city, or Boutique Pickup"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF8F6] border border-[#D9CEC5] text-sm text-[#1E1028]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D2C47] mb-1">
                    Sizing / Gift Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Size M dress, gift box requested"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF8F6] border border-[#D9CEC5] text-sm text-[#1E1028]"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Sticky Bottom Checkout Confirmation Footer */}
        {!confirmedOrder && cart.length > 0 && (
          <div className="p-4 bg-white border-t border-[#E4D9D2] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#574661]">Total Booking Value ({totalUnits} items)</span>
              <span className="font-mono text-lg font-bold text-[#1E1028] tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <button
              type="submit"
              form="sidi-booking-form"
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>
                {isSubmitting
                  ? 'Confirming Booking...'
                  : user
                  ? 'Confirm & Book Order Now'
                  : 'Sign In & Confirm Booking'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
