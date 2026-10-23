import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ShoppingBag,
  Search,
  Box,
  Sparkles,
  Store,
  ClipboardCheck,
  Plus,
  Check,
  X,
  ArrowRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import {
  auth,
  db,
  signInWithGoogle,
  ensureOwnerRole,
  logOutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  CatalogProduct,
  BookingRecord,
  CartItem,
  ProductCategory,
  Featured3DModelType,
  BookingStatus,
  INITIAL_CATALOG_PRODUCTS,
  HERO_BANNER_IMAGE,
} from './data/defaultCatalog';
import { Atelier3DShowcase } from './components/Atelier3DShowcase';
import { OwnerDashboard } from './components/OwnerDashboard';
import { CartBookingDrawer } from './components/CartBookingDrawer';

type ActiveView = 'collection' | 'atelier3d' | 'mybookings' | 'owner';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('collection');
  const [user, setUser] = useState<User | null>(null);
  const [isOwnerReady, setIsOwnerReady] = useState<boolean>(false);

  // Catalog & Filter state
  const [cloudProducts, setCloudProducts] = useState<CatalogProduct[]>([]);
  const [hasLoadedCloudProducts, setHasLoadedCloudProducts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductModal, setSelectedProductModal] = useState<CatalogProduct | null>(null);
  const [active3DModel, setActive3DModel] = useState<Featured3DModelType>('handbag');

  // Shopping Bag & Bookings state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  // Combine cloud products with initial catalog fallback when Firestore is empty
  const products: CatalogProduct[] =
    cloudProducts.length > 0 ? cloudProducts : INITIAL_CATALOG_PRODUCTS;

  // 1. Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await ensureOwnerRole(currentUser.uid, currentUser.email);
          setIsOwnerReady(true);
        } catch {
          setIsOwnerReady(false);
        }
      } else {
        setIsOwnerReady(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Real-time Public Storefront Catalog Listener (no login required to browse!)
  useEffect(() => {
    const productsQuery = query(
      collection(db, 'products'),
      where('isPublished', '==', true)
    );
    const unsub = onSnapshot(
      productsQuery,
      (snapshot) => {
        const loaded: CatalogProduct[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: String(data.name || ''),
            category: (data.category as ProductCategory) || 'Handbags',
            price: Number(data.price || 0),
            quantity: Number(data.quantity || 0),
            soldCount: Number(data.soldCount || 0),
            description: String(data.description || ''),
            imageUrl: String(data.imageUrl || HERO_BANNER_IMAGE),
            sku: String(data.sku || 'SD-001'),
            featured3dModel: (data.featured3dModel as Featured3DModelType) || 'handbag',
            isPublished: Boolean(data.isPublished),
            ownerId: String(data.ownerId || ''),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setCloudProducts(loaded);
        setHasLoadedCloudProducts(true);
      },
      (error) => {
        console.warn('Catalog snapshot fallback active:', error.message);
        setHasLoadedCloudProducts(true);
      }
    );
    return () => unsub();
  }, []);

  // 3. Real-time Bookings Listener (when authenticated as customer or owner)
  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    // If owner role is active, listen to all store bookings; otherwise listen to customer's own bookings
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = isOwnerReady
      ? bookingsRef
      : query(bookingsRef, where('customerId', '==', user.uid));

    const unsub = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const list: BookingRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            orderNumber: String(d.orderNumber || 'SIDI-1001'),
            customerId: String(d.customerId || ''),
            customerName: String(d.customerName || ''),
            customerPhone: String(d.customerPhone || ''),
            deliveryAddress: String(d.deliveryAddress || ''),
            notes: String(d.notes || ''),
            itemsSummary: String(d.itemsSummary || ''),
            itemIds: String(d.itemIds || ''),
            totalQuantity: Number(d.totalQuantity || 1),
            totalAmount: Number(d.totalAmount || 0),
            status: (d.status as BookingStatus) || 'Pending',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        });
        // Sort newest first by orderNumber or id
        list.sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
        setBookings(list);
      },
      (error) => {
        console.warn('Bookings listener notice:', error.message);
      }
    );

    return () => unsub();
  }, [user, isOwnerReady]);

  // Helper: Seed default products into Firestore if cloud catalog is still empty
  const ensureCatalogSeededInCloud = async (ownerUid: string) => {
    if (cloudProducts.length > 0) return;
    for (const item of INITIAL_CATALOG_PRODUCTS) {
      const docPath = `products/${item.id}`;
      try {
        await setDoc(doc(db, 'products', item.id), {
          name: item.name.slice(0, 120),
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          soldCount: item.soldCount,
          description: item.description.slice(0, 1000),
          imageUrl: item.imageUrl.slice(0, 650000),
          sku: item.sku.slice(0, 40),
          featured3dModel: item.featured3dModel,
          isPublished: true,
          ownerId: ownerUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
    }
  };

  // Cart Handlers (No login required to add to bag!)
  const handleAddToCart = (product: CatalogProduct, qty = 1) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.quantity, existing.cartQuantity + qty);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, cartQuantity: nextQty } : item
        );
      }
      return [...prev, { product, cartQuantity: Math.min(product.quantity, qty) }];
    });

    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === product.id ? null : prev));
    }, 1200);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.cartQuantity + delta;
          return next > 0 && next <= item.product.quantity
            ? { ...item, cartQuantity: next }
            : next <= 0
            ? null
            : item;
        })
        .filter((Boolean as unknown) as (x: CartItem | null) => x is CartItem)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Deferred Authentication at Booking Submission
  const handleSubmitBooking = async (details: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    notes: string;
  }): Promise<BookingRecord | null> => {
    if (cart.length === 0) return null;

    let activeUser = user;
    if (!activeUser) {
      activeUser = await signInWithGoogle();
      setUser(activeUser);
      await ensureOwnerRole(activeUser.uid, activeUser.email);
      setIsOwnerReady(true);
    }

    // Ensure cloud products exist so stock decrements persist cleanly
    if (cloudProducts.length === 0) {
      await ensureCatalogSeededInCloud(activeUser.uid);
    }

    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `SIDI-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsSummary = cart
      .map((c) => `${c.cartQuantity}x ${c.product.name}`)
      .join(', ')
      .slice(0, 1500);
    const itemIds = cart
      .map((c) => c.product.id)
      .join(',')
      .slice(0, 600);
    const totalQuantity = cart.reduce((sum, c) => sum + c.cartQuantity, 0);
    const totalAmount = cart.reduce((sum, c) => sum + c.product.price * c.cartQuantity, 0);

    const payload = {
      orderNumber,
      customerId: activeUser.uid,
      customerName: details.customerName.slice(0, 100),
      customerPhone: details.customerPhone.slice(0, 40),
      deliveryAddress: details.deliveryAddress.slice(0, 300),
      notes: (details.notes || '').slice(0, 400),
      itemsSummary,
      itemIds,
      totalQuantity,
      totalAmount,
      status: 'Pending' as BookingStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'bookings', bookingId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bookings/${bookingId}`);
    }

    // Update stock & soldCount for each booked item
    for (const cartItem of cart) {
      const targetProd = products.find((p) => p.id === cartItem.product.id) || cartItem.product;
      const newQty = Math.max(0, targetProd.quantity - cartItem.cartQuantity);
      const newSold = targetProd.soldCount + cartItem.cartQuantity;
      try {
        await updateDoc(doc(db, 'products', targetProd.id), {
          quantity: newQty,
          soldCount: newSold,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Stock update notice:', err);
      }
    }

    setCart([]);
    return {
      id: bookingId,
      ...payload,
    };
  };

  // Owner Studio Handlers
  const handleSignInOwner = async () => {
    const signedIn = await signInWithGoogle();
    setUser(signedIn);
    await ensureOwnerRole(signedIn.uid, signedIn.email);
    setIsOwnerReady(true);
  };

  const handleBulkCreateProducts = async (
    newItems: Array<Omit<CatalogProduct, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!user) return;
    if (cloudProducts.length === 0) {
      await ensureCatalogSeededInCloud(user.uid);
    }

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const newId = `sidi_${Date.now()}_${i}`;
      try {
        await setDoc(doc(db, 'products', newId), {
          name: item.name.slice(0, 120),
          category: item.category,
          price: Number(item.price),
          quantity: Math.round(Number(item.quantity)),
          soldCount: Number(item.soldCount || 0),
          description: item.description.slice(0, 1000),
          imageUrl: item.imageUrl.slice(0, 650000),
          sku: item.sku.slice(0, 40),
          featured3dModel: item.featured3dModel,
          isPublished: true,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `products/${newId}`);
      }
    }
  };

  const handleUpdateProduct = async (updated: CatalogProduct) => {
    if (!user) return;
    if (cloudProducts.length === 0) {
      await ensureCatalogSeededInCloud(user.uid);
    }
    try {
      await updateDoc(doc(db, 'products', updated.id), {
        name: updated.name.slice(0, 120),
        category: updated.category,
        price: Number(updated.price),
        quantity: Math.round(Number(updated.quantity)),
        soldCount: Math.round(Number(updated.soldCount)),
        description: updated.description.slice(0, 1000),
        imageUrl: updated.imageUrl.slice(0, 650000),
        sku: updated.sku.slice(0, 40),
        featured3dModel: updated.featured3dModel,
        isPublished: updated.isPublished,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updated.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!user) return;
    if (cloudProducts.length === 0) {
      await ensureCatalogSeededInCloud(user.uid);
    }
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleUpdateBookingStatus = async (
    booking: BookingRecord,
    newStatus: BookingStatus
  ) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus,
        notes: booking.notes.slice(0, 400),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  // Filtered Storefront Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const totalBagCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  const myCustomerBookings = user
    ? bookings.filter((b) => b.customerId === user.uid)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F6] text-[#1E1028] pb-20 md:pb-0">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="md:sticky md:top-0 z-30 bg-[#FAF8F6]/95 border-b border-[#E4D9D2] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single Text Element Handwritten Wordmark */}
        <a
          href="#collection"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('collection');
          }}
          className="font-logo text-3xl sm:text-4xl text-[#4A154B] tracking-normal whitespace-nowrap shrink-0 leading-none py-0.5"
        >
          Sidi Outfits
        </a>

        {/* Zone 2: 4 Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#473652]">
          <button
            type="button"
            onClick={() => setActiveView('collection')}
            className={`hover:text-[#1E1028] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'collection'
                ? 'text-[#4A154B] font-semibold underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Collection
          </button>
          <button
            type="button"
            onClick={() => setActiveView('atelier3d')}
            className={`hover:text-[#1E1028] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'atelier3d'
                ? 'text-[#4A154B] font-semibold underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            3D Atelier
          </button>
          <button
            type="button"
            onClick={() => setActiveView('mybookings')}
            className={`hover:text-[#1E1028] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'mybookings'
                ? 'text-[#4A154B] font-semibold underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            My Bookings
          </button>
          <button
            type="button"
            onClick={() => setActiveView('owner')}
            className={`hover:text-[#1E1028] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'owner'
                ? 'text-[#4A154B] font-semibold underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Owner Studio
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Booking Bag ({totalBagCount})</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT ROUTER */}
      <main className="flex-1">
        {activeView === 'collection' && (
          <div>
            {/* SECTION 1: STOREFRONT HERO SPLIT + FULL-WIDTH ATELIER STRIP */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                {/* Left Column: Campaign Editorial Anchor */}
                <div className="lg:col-span-6 bg-[#310D33] text-white rounded-3xl p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium tracking-wide">
                      <span>Maison Sidi Couture</span>
                      <span aria-hidden="true">·</span>
                      <span>Direct Booking Boutique</span>
                    </div>

                    <h1
                      className="font-serif font-semibold text-white leading-[1.08] tracking-tight"
                      style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.6rem)' }}
                    >
                      Sculpted Handbags, Silk Dresses & Artisanal Keychains.
                    </h1>

                    <p className="text-sm sm:text-base text-[#E2D4E6] leading-relaxed max-w-xl">
                      Explore our curated house collection in high-contrast studio detail or rotate
                      every stitch in the interactive 3D Atelier. Add your favorite pieces to your
                      bag and book immediately—no sign-up wall while you browse.
                    </p>
                  </div>

                  <div className="pt-8 flex flex-wrap items-center gap-3">
                    <a
                      href="#catalog-grid"
                      className="min-h-[48px] px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E2BE46] text-[#1E1028] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Explore Collection</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setActiveView('atelier3d')}
                      className="min-h-[48px] px-5 py-3 rounded-xl bg-[#4A154B] hover:bg-[#5E1B60] text-white border border-white/15 text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Box className="w-4 h-4 text-[#D4AF37]" />
                      <span>Open 3D Atelier</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Interactive 3D Atelier Live Plinth Preview */}
                <div className="lg:col-span-6 flex flex-col">
                  <Atelier3DShowcase
                    activeModel={active3DModel}
                    onSelectModel={setActive3DModel}
                    products={products}
                    onAddToCart={(prod) => handleAddToCart(prod, 1)}
                  />
                </div>
              </div>

              {/* Full-Width 4-Column Atelier Craft & Booking Promise Strip Below Hero Split */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E4D9D2]">
                <div>
                  <p className="text-xs text-[#6D5A78]">01. Frictionless Browsing</p>
                  <p className="text-sm font-semibold text-[#1E1028] mt-0.5">
                    Browse & add to bag with zero early login gates
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6D5A78]">02. 360° 3D Inspection</p>
                  <p className="text-sm font-semibold text-[#1E1028] mt-0.5">
                    Inspect calfskin grain, velvet drape & brass clasps
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6D5A78]">03. Direct Owner Sync</p>
                  <p className="text-sm font-semibold text-[#1E1028] mt-0.5">
                    Bookings appear immediately in the Owner Dashboard
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6D5A78]">04. Live Stock Control</p>
                  <p className="text-sm font-semibold text-[#1E1028] mt-0.5 font-mono tabular-nums">
                    {products.reduce((s, p) => s + p.quantity, 0)} verified units ready to ship
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 2: FEATURED COLLECTION GRID */}
            <section
              id="catalog-grid"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-[#E4D9D2]"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs text-[#6D5A78]">
                    Curated Ready-to-Wear & Leather Goods
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1E1028] mt-1">
                    The Signature Collection
                  </h2>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-[#6D5A78] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search handbags, dresses..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white border border-[#D9CEC5] text-sm text-[#1E1028] placeholder:text-[#84728E] focus:outline-none focus:border-[#4A154B]"
                  />
                </div>
              </div>

              {/* Interactive Category Filter Controls (Functional Buttons) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-8">
                {(['All', 'Handbags', 'Dresses', 'Outfits', 'Keychains', 'Accessories'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#4A154B] text-white'
                          : 'bg-[#EFEAE6] text-[#3D2C47] hover:bg-[#E4DAD2] hover:text-[#1E1028]'
                      }`}
                    >
                      {cat === 'All' ? 'All Pieces' : cat}
                    </button>
                  )
                )}
              </div>

              {/* 3-Column Desktop / 2-Column Tablet / 1-Column Mobile Product Grid */}
              {!hasLoadedCloudProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white border border-[#E4D9D2] rounded-2xl h-96 animate-pulse p-4"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-[#E4D9D2] rounded-2xl p-12 text-center">
                  <p className="font-serif text-2xl text-[#1E1028]">
                    No Matching Pieces Found
                  </p>
                  <p className="text-sm text-[#574661] mt-1 mb-4">
                    Try clearing your search or selecting another category.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#4A154B] text-white text-xs font-semibold cursor-pointer"
                  >
                    Show All Pieces
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredProducts.map((product) => {
                    const isAdded = recentlyAddedId === product.id;
                    const isOutOfStock = product.quantity <= 0;

                    return (
                      <article
                        key={product.id}
                        className="group bg-white border border-[#E4D9D2] rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div>
                          {/* Product Image Container (4:3 uniform aspect ratio) */}
                          <div
                            onClick={() => setSelectedProductModal(product)}
                            className="relative aspect-[4/3] w-full bg-[#F4EFEA] overflow-hidden cursor-pointer"
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                            />
                            {product.featured3dModel !== 'none' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActive3DModel(product.featured3dModel);
                                  setActiveView('atelier3d');
                                }}
                                className="absolute bottom-3 right-3 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1E1028]/90 hover:bg-[#4A154B] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Box className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>3D View</span>
                              </button>
                            )}
                          </div>

                          {/* Card Details with Clean Unboxed Metadata */}
                          <div className="p-5">
                            <div className="flex items-center gap-2 text-xs text-[#6D5A78]">
                              <span className="uppercase tracking-wider font-medium">
                                {product.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {isOutOfStock
                                  ? 'Sold Out'
                                  : `${product.quantity} in stock`}
                              </span>
                            </div>

                            <h3
                              onClick={() => setSelectedProductModal(product)}
                              className="text-base font-semibold text-[#1E1028] mt-1.5 hover:text-[#4A154B] cursor-pointer line-clamp-1"
                            >
                              {product.name}
                            </h3>

                            <p className="text-xs text-[#574661] mt-1.5 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        {/* Contiguous Price + Add to Bag Row */}
                        <div className="px-5 pb-5 pt-3 border-t border-[#F4EFEA] flex items-center justify-between gap-3">
                          <span className="font-mono text-[15px] font-bold text-[#1E1028] tabular-nums">
                            ${product.price.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(product, 1)}
                            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isOutOfStock
                                ? 'bg-[#EFEAE6] text-[#8E7D96] cursor-not-allowed'
                                : isAdded
                                ? 'bg-[#285B3A] text-white'
                                : 'bg-[#4A154B] hover:bg-[#380F39] text-white'
                            }`}
                          >
                            {isOutOfStock ? (
                              <span>Out of Stock</span>
                            ) : isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added to Bag</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Bag</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 3: ATELIER CRAFTSMANSHIP & OWNER MOBILE STUDIO CALLOUT */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#E4D9D2]">
              <div className="bg-[#F2ECE7] border border-[#E4D9D2] rounded-3xl p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#4A154B] font-semibold">
                    <span>Maison Sidi · Mobile Owner Studio</span>
                    <span aria-hidden="true">·</span>
                    <span>Bulk Catalog & Live Bookings</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1E1028]">
                    Manage Sidi Outfits Directly From Your Phone
                  </h2>
                  <p className="text-sm text-[#574661] leading-relaxed">
                    Are you the store owner? Upload multiple product photos in bulk from your mobile
                    gallery, set each item's name, price, stock quantity, and description, and see
                    customer bookings the moment they are placed.
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveView('owner')}
                    className="min-h-[48px] px-6 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Store className="w-4 h-4" />
                    <span>Open Owner Dashboard</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: FULL-SCREEN 3D ATELIER */}
        {activeView === 'atelier3d' && (
          <section className="w-full">
            <Atelier3DShowcase
              activeModel={active3DModel}
              onSelectModel={setActive3DModel}
              products={products}
              onAddToCart={(prod) => {
                handleAddToCart(prod, 1);
                setIsCartOpen(true);
              }}
              fullScreenMode={true}
            />
          </section>
        )}

        {/* VIEW 3: CUSTOMER BOOKINGS TRACKER */}
        {activeView === 'mybookings' && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="mb-6">
              <p className="text-xs text-[#6D5A78]">Sidi Outfits · Order Verification</p>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1E1028] mt-1">
                My Booked Orders
              </h1>
              <p className="text-sm text-[#574661] mt-1">
                Track the live preparation status of your booked handbags, dresses, keychains, and
                outfits.
              </p>
            </div>

            {!user ? (
              <div className="bg-white border border-[#E4D9D2] rounded-2xl p-8 text-center space-y-4">
                <p className="font-serif text-2xl text-[#1E1028]">
                  View Your Saved Bookings
                </p>
                <p className="text-sm text-[#574661] max-w-md mx-auto">
                  You can browse the entire store and fill your bag without signing in. Sign in with
                  Google when you want to place or track a booking.
                </p>
                <button
                  type="button"
                  onClick={handleSignInOwner}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign in with Google to View Bookings</span>
                </button>
              </div>
            ) : myCustomerBookings.length === 0 ? (
              <div className="bg-white border border-[#E4D9D2] rounded-2xl p-8 text-center space-y-4">
                <p className="font-serif text-2xl text-[#1E1028]">
                  No Bookings Placed Yet
                </p>
                <p className="text-sm text-[#574661] max-w-md mx-auto">
                  Add items from our collection to your Booking Bag to reserve your order.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('collection')}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#4A154B] text-white text-sm font-semibold cursor-pointer"
                >
                  Browse Collection
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myCustomerBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white border border-[#E4D9D2] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#6D5A78]">
                        <span className="font-mono font-semibold text-[#1E1028] tabular-nums">
                          {booking.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#4A154B]">
                          Status: {booking.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-[#1E1028] tabular-nums">
                          ${booking.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#1E1028]">
                        {booking.itemsSummary}
                      </h3>
                      <p className="text-xs text-[#574661]">
                        Delivery to: {booking.deliveryAddress} · Phone: {booking.customerPhone}
                      </p>
                    </div>

                    {booking.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateBookingStatus(booking, 'Cancelled')}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#E4D9D2] text-xs font-medium text-[#574661] hover:text-red-700 hover:border-red-200 transition-colors self-start sm:self-center cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VIEW 4: OWNER STUDIO (BULK UPLOAD, STOCK CONTROL, BOOKINGS & ANALYTICS) */}
        {activeView === 'owner' && (
          <OwnerDashboard
            user={user}
            isOwnerReady={isOwnerReady}
            onSignInOwner={handleSignInOwner}
            products={products}
            bookings={bookings}
            onBulkCreateProducts={handleBulkCreateProducts}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onSeedDefaultCatalog={async () => {
              if (user) {
                await ensureCatalogSeededInCloud(user.uid);
              }
            }}
          />
        )}
      </main>

      {/* CONTIGUOUS PRODUCT DETAIL MODAL (PDP) */}
      {selectedProductModal && (
        <div
          onClick={() => setSelectedProductModal(null)}
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E4D9D2] rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12"
          >
            <div className="md:col-span-6 bg-[#F4EFEA] relative aspect-[4/3] md:aspect-auto">
              <img
                src={selectedProductModal.imageUrl}
                alt={selectedProductModal.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#6D5A78]">
                    <span className="uppercase tracking-wider font-medium">
                      {selectedProductModal.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{selectedProductModal.sku}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProductModal(null)}
                    className="p-1.5 rounded-lg text-[#574661] hover:bg-[#F2ECE7] cursor-pointer"
                    aria-label="Close product detail"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1E1028]">
                  {selectedProductModal.name}
                </h2>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-[#4A154B] tabular-nums">
                    ${selectedProductModal.price.toFixed(2)}
                  </span>
                  <span aria-hidden="true" className="text-[#C7B8C4]">
                    ·
                  </span>
                  <span className="font-mono text-xs text-[#574661] tabular-nums">
                    {selectedProductModal.quantity > 0
                      ? `${selectedProductModal.quantity} available in stock`
                      : 'Currently Sold Out'}
                  </span>
                </div>

                <p className="text-sm text-[#574661] leading-relaxed pt-2">
                  {selectedProductModal.description}
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-[#EFEAE6]">
                <button
                  type="button"
                  disabled={selectedProductModal.quantity <= 0}
                  onClick={() => {
                    handleAddToCart(selectedProductModal, 1);
                    setSelectedProductModal(null);
                    setIsCartOpen(true);
                  }}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#4A154B] hover:bg-[#380F39] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Booking Bag</span>
                </button>

                {selectedProductModal.featured3dModel !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      const m = selectedProductModal.featured3dModel;
                      setSelectedProductModal(null);
                      setActive3DModel(m);
                      setActiveView('atelier3d');
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F4EFEA] hover:bg-[#E6DDD6] text-[#1E1028] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Box className="w-4 h-4 text-[#4A154B]" />
                    <span>Inspect This Piece in 3D Atelier</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER CART & BOOKING CHECKOUT DRAWER */}
      <CartBookingDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateCartQty={handleUpdateCartQty}
        onRemoveFromCart={handleRemoveFromCart}
        user={user}
        onSubmitBooking={handleSubmitBooking}
      />

      {/* CLEAN EDITORIAL FOOTER */}
      <footer className="bg-white border-t border-[#E4D9D2] py-8 px-4 sm:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6D5A78]">
          <div className="flex items-center gap-3">
            <span className="font-logo text-2xl text-[#4A154B]">Sidi Outfits</span>
            <span aria-hidden="true">·</span>
            <span>Handbags, Dresses, Outfits & Artisanal Keychains</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <button
                type="button"
                onClick={logOutUser}
                className="inline-flex items-center gap-1 text-[#4A154B] hover:underline cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({user.email})</span>
              </button>
            )}
            <span>© {new Date().getFullYear()} Sidi Outfits</span>
          </div>
        </div>
      </footer>

      {/* MOBILE FIXED BOTTOM TAB BAR (Single Sticky Element on Mobile, <= 8% Viewport Height, 44x44px Hitboxes) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white border-t border-[#E4D9D2] grid grid-cols-4 items-center px-1"
      >
        <button
          type="button"
          onClick={() => setActiveView('collection')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'collection' ? 'text-[#4A154B] font-semibold' : 'text-[#6D5A78]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Collection</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('atelier3d')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'atelier3d' ? 'text-[#4A154B] font-semibold' : 'text-[#6D5A78]'
          }`}
        >
          <Box className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">3D Atelier</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('mybookings')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'mybookings' ? 'text-[#4A154B] font-semibold' : 'text-[#6D5A78]'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Bookings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('owner')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'owner' ? 'text-[#4A154B] font-semibold' : 'text-[#6D5A78]'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Owner</span>
        </button>
      </nav>
    </div>
  );
}
