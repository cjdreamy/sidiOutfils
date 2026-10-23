import React, { useState, useRef } from 'react';
import {
  Upload,
  Plus,
  Minus,
  Trash2,
  Check,
  Package,
  BarChart3,
  ClipboardList,
  Edit3,
  Save,
  X,
  AlertTriangle,
  Phone,
  MapPin,
  Sparkles,
  LogIn,
} from 'lucide-react';
import {
  CatalogProduct,
  BookingRecord,
  ProductCategory,
  Featured3DModelType,
  BookingStatus,
} from '../data/defaultCatalog';
import {
  compressImageFileToDataUri,
  formatFilenameToProductTitle,
} from '../utils/imageCompressor';

interface StagedBulkItem {
  tempId: string;
  name: string;
  category: ProductCategory;
  price: string;
  quantity: string;
  description: string;
  imageUrl: string;
  featured3dModel: Featured3DModelType;
}

interface OwnerDashboardProps {
  user: { uid: string; email: string | null; displayName: string | null } | null;
  isOwnerReady: boolean;
  onSignInOwner: () => Promise<void>;
  products: CatalogProduct[];
  bookings: BookingRecord[];
  onBulkCreateProducts: (
    items: Array<Omit<CatalogProduct, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  onUpdateProduct: (product: CatalogProduct) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateBookingStatus: (booking: BookingRecord, newStatus: BookingStatus) => Promise<void>;
  onSeedDefaultCatalog: () => Promise<void>;
}

const CATEGORIES: ProductCategory[] = [
  'Handbags',
  'Dresses',
  'Outfits',
  'Keychains',
  'Accessories',
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  isOwnerReady,
  onSignInOwner,
  products,
  bookings,
  onBulkCreateProducts,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateBookingStatus,
  onSeedDefaultCatalog,
}) => {
  const [subTab, setSubTab] = useState<'bookings' | 'inventory' | 'analytics'>('bookings');
  const [stagedItems, setStagedItems] = useState<StagedBulkItem[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPublishingBulk, setIsPublishingBulk] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CatalogProduct | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setStatusFeedback(msg);
    window.setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  if (!user || !isOwnerReady) {
    return (
      <section className="max-w-xl mx-auto my-12 px-4">
        <div className="bg-white border border-[#E4D9D2] rounded-2xl p-6 sm:p-8 text-center shadow-sm">
          <p className="text-xs font-medium text-[#6D5A78] mb-2">
            Sidi Outfits · Maison Management
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1E1028] mb-3">
            Owner Studio & Inventory Control
          </h2>
          <p className="text-sm text-[#574661] leading-relaxed mb-6">
            Sign in with your Google account to upload multiple product photos in bulk from your
            phone, adjust prices and stock levels, and manage live customer bookings.
          </p>
          <button
            type="button"
            onClick={onSignInOwner}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Google to Open Studio
          </button>
        </div>
      </section>
    );
  }

  const handleBulkFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsCompressing(true);
    try {
      const filesArray = Array.from(fileList);
      const newStaged: StagedBulkItem[] = [];

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const compressedDataUri = await compressImageFileToDataUri(file);
        const suggestedTitle = formatFilenameToProductTitle(
          file.name,
          stagedItems.length + i
        );
        const lowerName = file.name.toLowerCase();
        let defaultCat: ProductCategory = 'Handbags';
        let default3d: Featured3DModelType = 'handbag';

        if (lowerName.includes('dress') || lowerName.includes('gown')) {
          defaultCat = 'Dresses';
          default3d = 'dress';
        } else if (lowerName.includes('key') || lowerName.includes('charm')) {
          defaultCat = 'Keychains';
          default3d = 'keychain';
        } else if (lowerName.includes('outfit') || lowerName.includes('suit') || lowerName.includes('set')) {
          defaultCat = 'Outfits';
          default3d = 'outfit';
        }

        newStaged.push({
          tempId: `bulk-${Date.now()}-${i}`,
          name: suggestedTitle,
          category: defaultCat,
          price: '180',
          quantity: '10',
          description: `Signature ${defaultCat.toLowerCase().slice(0, -1)} crafted for the Sidi Outfits collection. Ready for immediate booking and delivery.`,
          imageUrl: compressedDataUri,
          featured3dModel: default3d,
        });
      }

      setStagedItems((prev) => [...prev, ...newStaged]);
      showToast(`${newStaged.length} photo${newStaged.length > 1 ? 's' : ''} staged for editing.`);
    } catch (err) {
      console.error(err);
      showToast('Could not process one or more photos. Please try another image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateStagedField = (
    tempId: string,
    field: keyof StagedBulkItem,
    value: string
  ) => {
    setStagedItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveStagedItem = (tempId: string) => {
    setStagedItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handlePublishAllStaged = async () => {
    if (stagedItems.length === 0) return;
    setIsPublishingBulk(true);
    try {
      const prepared = stagedItems.map((item, idx) => {
        const parsedPrice = Math.max(0, parseFloat(item.price) || 0);
        const parsedQty = Math.max(0, Math.round(parseFloat(item.quantity) || 0));
        const skuCode = `SD-${item.category.slice(0, 2).toUpperCase()}-${String(
          products.length + idx + 101
        )}`;
        return {
          name: item.name.trim().slice(0, 120) || `Sidi Piece #${idx + 1}`,
          category: item.category,
          price: parsedPrice,
          quantity: parsedQty,
          soldCount: 0,
          description:
            item.description.trim().slice(0, 1000) ||
            'Handcrafted Sidi Outfits boutique item.',
          imageUrl: item.imageUrl,
          sku: skuCode,
          featured3dModel: item.featured3dModel,
          isPublished: true,
        };
      });

      await onBulkCreateProducts(prepared);
      setStagedItems([]);
      showToast(`Published ${prepared.length} item${prepared.length > 1 ? 's' : ''} to Sidi Outfits!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to publish bulk items. Check values and try again.');
    } finally {
      setIsPublishingBulk(false);
    }
  };

  const handleQuickStockStep = async (product: CatalogProduct, delta: number) => {
    const nextQty = Math.max(0, product.quantity + delta);
    if (nextQty === product.quantity) return;
    await onUpdateProduct({
      ...product,
      quantity: nextQty,
    });
    showToast(`Updated "${product.name}" stock to ${nextQty}.`);
  };

  const startEditingProduct = (product: CatalogProduct) => {
    setEditingProductId(product.id);
    setEditDraft({ ...product });
  };

  const saveEditedProduct = async () => {
    if (!editDraft) return;
    await onUpdateProduct({
      ...editDraft,
      name: editDraft.name.trim().slice(0, 120) || 'Sidi Piece',
      price: Math.max(0, Number(editDraft.price) || 0),
      quantity: Math.max(0, Math.round(Number(editDraft.quantity) || 0)),
      description: editDraft.description.trim().slice(0, 1000) || 'Sidi Outfits piece.',
    });
    setEditingProductId(null);
    setEditDraft(null);
    showToast('Product details updated.');
  };

  // Analytics & Statistics Calculations
  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');
  const totalBookedRevenue = activeBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const pendingBookingsCount = bookings.filter((b) => b.status === 'Pending').length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalSoldUnits = products.reduce((sum, p) => sum + p.soldCount, 0);
  const lowStockProducts = products.filter((p) => p.quantity <= 3);
  const sellThroughRate =
    totalStockUnits + totalSoldUnits > 0
      ? Math.round((totalSoldUnits / (totalStockUnits + totalSoldUnits)) * 100)
      : 0;

  const categoryBreakdown = CATEGORIES.map((cat) => {
    const catProducts = products.filter((p) => p.category === cat);
    const stock = catProducts.reduce((s, p) => s + p.quantity, 0);
    const sold = catProducts.reduce((s, p) => s + p.soldCount, 0);
    const revenue = catProducts.reduce((s, p) => s + p.soldCount * p.price, 0);
    return { category: cat, count: catProducts.length, stock, sold, revenue };
  });

  const maxCategoryRevenue = Math.max(...categoryBreakdown.map((c) => c.revenue), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Studio Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4D9D2]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6D5A78]">
            <span>Owner Studio</span>
            <span aria-hidden="true">·</span>
            <span>{user.email}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-[#1E1028] mt-1">
            Maison Sidi Management
          </h1>
        </div>

        {/* Mobile-First Segmented Studio Switcher (44px min touch height) */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#EFEAE6] p-1.5 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSubTab('bookings')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'bookings'
                ? 'bg-[#4A154B] text-white shadow-sm'
                : 'text-[#3D2C47] hover:text-[#1E1028]'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Bookings ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('inventory')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-[#4A154B] text-white shadow-sm'
                : 'text-[#3D2C47] hover:text-[#1E1028]'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Bulk Upload & Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('analytics')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'analytics'
                ? 'bg-[#4A154B] text-white shadow-sm'
                : 'text-[#3D2C47] hover:text-[#1E1028]'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {statusFeedback && (
        <div className="mt-4 bg-[#4A154B] text-white px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{statusFeedback}</span>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: LIVE CUSTOMER BOOKINGS */}
      {subTab === 'bookings' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1E1028]">
                Customer Order Bookings
              </h2>
              <p className="text-xs sm:text-sm text-[#574661]">
                Every customer booking appears here immediately with delivery details and one-tap status updates.
              </p>
            </div>
            <div className="text-xs text-[#574661] font-mono tabular-nums">
              Pending: {pendingBookingsCount} · Total Orders: {bookings.length}
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-8 text-center">
              <p className="font-serif text-xl text-[#1E1028] mb-1">No Customer Bookings Yet</p>
              <p className="text-sm text-[#574661] max-w-md mx-auto">
                When a customer books handbags, dresses, keychains, or outfits from the storefront,
                their order will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white border border-[#E4D9D2] rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6D5A78]">
                      <span className="font-mono font-semibold text-[#1E1028] tabular-nums">
                        {booking.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#4A154B]">
                        Status: {booking.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {booking.totalQuantity} {booking.totalQuantity === 1 ? 'unit' : 'units'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[#1E1028] tabular-nums">
                        ${booking.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-[#1E1028]">
                      {booking.itemsSummary}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-[#574661]">
                      <span className="font-medium text-[#1E1028]">{booking.customerName}</span>
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="inline-flex items-center gap-1 text-[#4A154B] font-medium hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {booking.customerPhone}
                      </a>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6D5A78]" />
                        {booking.deliveryAddress}
                      </span>
                    </div>

                    {booking.notes && (
                      <p className="text-xs text-[#6D5A78] italic">
                        Customer Note: "{booking.notes}"
                      </p>
                    )}
                  </div>

                  {/* Mobile-Friendly Status Action Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#EFEAE6] shrink-0">
                    {(
                      ['Pending', 'Confirmed', 'Ready', 'Completed', 'Cancelled'] as BookingStatus[]
                    ).map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => onUpdateBookingStatus(booking, statusOption)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          booking.status === statusOption
                            ? 'bg-[#4A154B] text-white'
                            : 'bg-[#F4EFEA] text-[#3D2C47] hover:bg-[#E6DDD6]'
                        }`}
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BULK MULTI-IMAGE UPLOADER & LIVE STOCK CONTROL */}
      {subTab === 'inventory' && (
        <div className="mt-6 space-y-8">
          {/* Bulk Image Upload Box */}
          <div className="bg-white border border-[#E4D9D2] rounded-2xl p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1E1028]">
                  Bulk Mobile Photo Upload & Item Editor
                </h2>
                <p className="text-xs sm:text-sm text-[#574661] mt-1">
                  Select multiple photos at once from your phone camera roll. Edit each item's name,
                  price, quantity, category, and description before publishing all together.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBulkFilesSelected}
                  className="hidden"
                  id="sidi-bulk-upload-input"
                />
                <label
                  htmlFor="sidi-bulk-upload-input"
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  {isCompressing ? 'Optimizing Photos...' : 'Select Multiple Photos'}
                </label>

                <button
                  type="button"
                  onClick={onSeedDefaultCatalog}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-[#F4EFEA] hover:bg-[#E6DDD6] text-[#1E1028] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#4A154B]" />
                  Sync Default Atelier Catalog
                </button>
              </div>
            </div>

            {/* Staged Bulk Items Queue */}
            {stagedItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#E4D9D2] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#1E1028]">
                    Staged Bulk Batch ({stagedItems.length}{' '}
                    {stagedItems.length === 1 ? 'item' : 'items'} ready to edit)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStagedItems([])}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E4D9D2] text-xs font-medium text-[#574661] hover:text-[#1E1028] cursor-pointer"
                    >
                      Clear Batch
                    </button>
                    <button
                      type="button"
                      disabled={isPublishingBulk}
                      onClick={handlePublishAllStaged}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {isPublishingBulk
                        ? 'Publishing...'
                        : `Publish All ${stagedItems.length} Items`}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stagedItems.map((item, idx) => (
                    <div
                      key={item.tempId}
                      className="bg-[#FAF8F6] border border-[#E4D9D2] rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 rounded-xl object-cover border border-[#E4D9D2] shrink-0 bg-[#EFEAE6]"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-[#6D5A78]">
                              ITEM #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedItem(item.tempId)}
                              className="p-1.5 text-[#6D5A78] hover:text-red-700 cursor-pointer"
                              aria-label="Remove staged item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateStagedField(item.tempId, 'name', e.target.value)
                            }
                            placeholder="Item Name (e.g. Plum Leather Tote)"
                            className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-white border border-[#D9CEC5] text-sm font-medium text-[#1E1028]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#574661] mb-1">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateStagedField(
                                item.tempId,
                                'category',
                                e.target.value as ProductCategory
                              )
                            }
                            className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg bg-white border border-[#D9CEC5] text-xs font-medium text-[#1E1028]"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#574661] mb-1">
                            Price ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.price}
                            onChange={(e) =>
                              handleUpdateStagedField(item.tempId, 'price', e.target.value)
                            }
                            className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-white border border-[#D9CEC5] text-xs font-mono font-semibold text-[#1E1028] tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#574661] mb-1">
                            Stock Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateStagedField(item.tempId, 'quantity', e.target.value)
                            }
                            className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-white border border-[#D9CEC5] text-xs font-mono font-semibold text-[#1E1028] tabular-nums"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#574661] mb-1">
                          Description & Sizing Notes
                        </label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateStagedField(item.tempId, 'description', e.target.value)
                          }
                          placeholder="Materials, dimensions, colors..."
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#D9CEC5] text-xs text-[#1E1028]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Stock Control & Catalog List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#1E1028]">
                Active Catalog & Quick Stock Control ({products.length})
              </h3>
              <span className="text-xs text-[#574661] font-mono tabular-nums">
                Total Units: {totalStockUnits}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => {
                const isEditing = editingProductId === product.id && editDraft;

                return (
                  <div
                    key={product.id}
                    className="bg-white border border-[#E4D9D2] rounded-2xl p-4 flex flex-col justify-between gap-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#4A154B]">
                            Editing {product.sku}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(null);
                              setEditDraft(null);
                            }}
                            className="p-1 text-[#6D5A78] hover:text-[#1E1028] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, name: e.target.value })
                          }
                          className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#D9CEC5] text-sm font-medium text-[#1E1028]"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] text-[#574661] mb-1">
                              Category
                            </label>
                            <select
                              value={editDraft.category}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  category: e.target.value as ProductCategory,
                                })
                              }
                              className="w-full min-h-[42px] px-2 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#D9CEC5] text-xs font-medium"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#574661] mb-1">
                              Price ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editDraft.price}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#D9CEC5] text-xs font-mono tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#574661] mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editDraft.quantity}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  quantity: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-full min-h-[42px] px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#D9CEC5] text-xs font-mono tabular-nums"
                            />
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[#FAF8F6] border border-[#D9CEC5] text-xs"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={saveEditedProduct}
                            className="min-h-[42px] px-4 py-2 rounded-lg bg-[#4A154B] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3.5">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-xl object-cover bg-[#F4EFEA] border border-[#E4D9D2] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-[#6D5A78]">
                              <span>{product.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{product.sku}</span>
                            </div>
                            <h4 className="text-base font-semibold text-[#1E1028] truncate mt-0.5">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              <span className="font-mono font-semibold text-[#4A154B] tabular-nums">
                                ${product.price.toFixed(2)}
                              </span>
                              <span aria-hidden="true" className="text-[#C7B8C4]">
                                ·
                              </span>
                              <span
                                className={`font-mono text-xs font-medium tabular-nums ${
                                  product.quantity <= 3 ? 'text-amber-700 font-semibold' : 'text-[#574661]'
                                }`}
                              >
                                {product.quantity === 0
                                  ? 'Out of Stock (0)'
                                  : `In Stock: ${product.quantity}`}
                              </span>
                              <span aria-hidden="true" className="text-[#C7B8C4]">
                                ·
                              </span>
                              <span className="font-mono text-xs text-[#6D5A78] tabular-nums">
                                Booked: {product.soldCount}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile-Friendly Stock Steppers & Edit Actions */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F2ECE7]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickStockStep(product, -1)}
                              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#F4EFEA] hover:bg-[#E6DDD6] text-[#1E1028] flex items-center justify-center transition-colors cursor-pointer"
                              aria-label="Decrease stock by 1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-2.5 font-mono text-xs font-semibold text-[#1E1028] tabular-nums">
                              Qty: {product.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickStockStep(product, 1)}
                              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#F4EFEA] hover:bg-[#E6DDD6] text-[#1E1028] flex items-center justify-center transition-colors cursor-pointer"
                              aria-label="Increase stock by 1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditingProduct(product)}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#F4EFEA] hover:bg-[#E6DDD6] text-[#1E1028] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(product.id)}
                              className="min-w-[40px] min-h-[40px] rounded-lg bg-[#F4EFEA] hover:bg-red-50 text-[#6D5A78] hover:text-red-700 flex items-center justify-center transition-colors cursor-pointer"
                              aria-label="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS, STATISTICS & STOCK HEALTH */}
      {subTab === 'analytics' && (
        <div className="mt-6 space-y-6">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-4 sm:p-5">
              <span className="text-xs text-[#6D5A78]">Booked Revenue</span>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#1E1028] mt-1 tabular-nums">
                ${totalBookedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#574661] mt-1">
                Across {activeBookings.length} active orders
              </p>
            </div>

            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-4 sm:p-5">
              <span className="text-xs text-[#6D5A78]">Units Booked</span>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#4A154B] mt-1 tabular-nums">
                {totalSoldUnits}
              </p>
              <p className="text-xs text-[#574661] mt-1 font-mono tabular-nums">
                Sell-through rate: {sellThroughRate}%
              </p>
            </div>

            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-4 sm:p-5">
              <span className="text-xs text-[#6D5A78]">Available Inventory</span>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#1E1028] mt-1 tabular-nums">
                {totalStockUnits}
              </p>
              <p className="text-xs text-[#574661] mt-1">
                Across {products.length} catalog SKUs
              </p>
            </div>

            <div className="bg-white border border-[#E4D9D2] rounded-2xl p-4 sm:p-5">
              <span className="text-xs text-[#6D5A78]">Low-Stock Alerts</span>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-amber-700 mt-1 tabular-nums">
                {lowStockProducts.length}
              </p>
              <p className="text-xs text-[#574661] mt-1">
                Items with 3 or fewer units left
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Performance Breakdown */}
            <div className="lg:col-span-7 bg-white border border-[#E4D9D2] rounded-2xl p-5 sm:p-6">
              <h3 className="font-serif text-xl font-semibold text-[#1E1028] mb-1">
                Category Revenue & Inventory Velocity
              </h3>
              <p className="text-xs text-[#574661] mb-5">
                Cumulative sales value and stock distribution across Sidi Outfits lines.
              </p>

              <div className="space-y-4">
                {categoryBreakdown.map((row) => {
                  const widthPct = Math.max(
                    6,
                    Math.round((row.revenue / maxCategoryRevenue) * 100)
                  );
                  return (
                    <div key={row.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-semibold text-[#1E1028]">{row.category}</span>
                        <span className="font-mono text-xs text-[#574661] tabular-nums">
                          ${row.revenue.toLocaleString()} · {row.sold} sold · {row.stock} in stock
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F2ECE7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4A154B] rounded-full transition-all duration-300"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Restock Watchlist */}
            <div className="lg:col-span-5 bg-white border border-[#E4D9D2] rounded-2xl p-5 sm:p-6">
              <h3 className="font-serif text-xl font-semibold text-[#1E1028] mb-1">
                Stock Control Watchlist
              </h3>
              <p className="text-xs text-[#574661] mb-4">
                Items running low on stock. Tap +5 to replenish immediately from your phone.
              </p>

              {lowStockProducts.length === 0 ? (
                <div className="p-6 bg-[#FAF8F6] rounded-xl text-center">
                  <p className="text-sm font-medium text-[#1E1028]">
                    All Catalog Items Well Stocked
                  </p>
                  <p className="text-xs text-[#574661] mt-1">
                    Every piece currently has more than 3 units available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF8F6] border border-[#E4D9D2]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1E1028] truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-amber-800 font-mono flex items-center gap-1 mt-0.5 tabular-nums">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Only {item.quantity} left in stock
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickStockStep(item, 5)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#4A154B] hover:bg-[#380F39] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        +5 Stock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
