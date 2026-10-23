export type ProductCategory = 'Handbags' | 'Dresses' | 'Outfits' | 'Keychains' | 'Accessories';
export type Featured3DModelType = 'handbag' | 'dress' | 'keychain' | 'outfit' | 'none';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Ready' | 'Completed' | 'Cancelled';

export interface CatalogProduct {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  soldCount: number;
  description: string;
  imageUrl: string;
  sku: string;
  featured3dModel: Featured3DModelType;
  isPublished: boolean;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BookingRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string;
  itemsSummary: string;
  itemIds: string;
  totalQuantity: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  product: CatalogProduct;
  cartQuantity: number;
}

/**
 * Generates high-resolution studio luxury SVG product photography data URIs
 * so every product card and hero banner displays rich, crisp visual craft with zero broken URLs.
 */
function createLuxuryProductSvgDataUri(config: {
  bgTop: string;
  bgBottom: string;
  plinthColor: string;
  accentColor: string;
  goldColor: string;
  silhouette: 'handbag' | 'dress' | 'keychain' | 'outfit' | 'tote' | 'clutch' | 'scarf' | 'silk_set';
  label: string;
  edition: string;
}): string {
  const { bgTop, bgBottom, plinthColor, accentColor, goldColor, silhouette, label, edition } = config;

  let subjectMarkup = '';

  if (silhouette === 'handbag') {
    subjectMarkup = `
      <!-- Soft contact shadow -->
      <ellipse cx="400" cy="465" rx="145" ry="22" fill="#1E1028" opacity="0.22" />
      <!-- Arch Top Handle -->
      <path d="M 325 220 C 325 125, 475 125, 475 220" fill="none" stroke="${accentColor}" stroke-width="18" stroke-linecap="round" />
      <path d="M 325 220 C 325 132, 475 132, 475 220" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25" />
      <!-- Brass Handle Rings -->
      <rect x="314" y="208" width="22" height="16" rx="4" fill="${goldColor}" />
      <rect x="464" y="208" width="22" height="16" rx="4" fill="${goldColor}" />
      <!-- Main Trapezoid Calfskin Body -->
      <path d="M 255 220 L 545 220 L 570 448 C 570 458, 560 465, 548 465 L 252 465 C 240 465, 230 458, 230 448 Z" fill="${accentColor}" />
      <!-- Subtle Side Gusset Shading -->
      <path d="M 255 220 L 285 220 L 270 465 L 245 465 Z" fill="#120517" opacity="0.24" />
      <path d="M 515 220 L 545 220 L 555 465 L 530 465 Z" fill="#ffffff" opacity="0.08" />
      <!-- Sculpted Front Flap -->
      <path d="M 252 220 L 548 220 L 536 332 C 534 348, 518 356, 498 356 L 302 356 C 282 356, 266 348, 264 332 Z" fill="${accentColor}" stroke="#2A0B2E" stroke-width="2" />
      <path d="M 262 228 L 538 228 L 527 326 C 525 339, 512 346, 495 346 L 305 346 C 288 346, 275 339, 273 326 Z" fill="none" stroke="${goldColor}" stroke-width="1.2" stroke-dasharray="5,4" opacity="0.55" />
      <!-- Brushed Gold Turn-Lock Hardware -->
      <rect x="376" y="330" width="48" height="52" rx="8" fill="${goldColor}" />
      <rect x="383" y="337" width="34" height="38" rx="5" fill="#DFB951" />
      <ellipse cx="400" cy="356" rx="7" ry="13" fill="#8C6712" />
      <!-- Hanging Leather Clochette & Gold Charm -->
      <path d="M 472 222 L 508 320" stroke="${accentColor}" stroke-width="6" />
      <path d="M 495 315 L 522 315 L 530 362 L 488 362 Z" fill="#370E3B" />
      <circle cx="510" cy="374" r="10" fill="${goldColor}" />
    `;
  } else if (silhouette === 'dress') {
    subjectMarkup = `
      <ellipse cx="400" cy="480" rx="135" ry="20" fill="#1E1028" opacity="0.2" />
      <!-- Atelier Brass Stand Pole & Finial -->
      <rect x="396" y="105" width="8" height="375" fill="${goldColor}" />
      <circle cx="400" cy="102" r="11" fill="${goldColor}" />
      <path d="M 335 480 L 465 480 L 445 462 L 355 462 Z" fill="${goldColor}" />
      <!-- Sculpted Velvet Bodice -->
      <path d="M 340 145 L 372 135 L 400 175 L 428 135 L 460 145 L 448 258 L 352 258 Z" fill="${accentColor}" />
      <!-- Draped Waist Cinch Belt -->
      <rect x="350" y="252" width="100" height="18" rx="4" fill="#2A092D" />
      <rect x="386" y="249" width="28" height="24" rx="4" fill="none" stroke="${goldColor}" stroke-width="4" />
      <!-- Architectural Pleated Midi Skirt -->
      <path d="M 352 270 L 448 270 L 525 452 C 480 468, 320 468, 275 452 Z" fill="${accentColor}" />
      <!-- Pleat Highlights & Shadows -->
      <path d="M 372 270 L 325 456" stroke="#18061B" stroke-width="5" opacity="0.35" />
      <path d="M 392 270 L 378 460" stroke="#ffffff" stroke-width="3" opacity="0.16" />
      <path d="M 412 270 L 432 460" stroke="#18061B" stroke-width="5" opacity="0.35" />
      <path d="M 432 270 L 485 455" stroke="#ffffff" stroke-width="3" opacity="0.16" />
    `;
  } else if (silhouette === 'keychain') {
    subjectMarkup = `
      <ellipse cx="400" cy="468" rx="120" ry="18" fill="#1E1028" opacity="0.2" />
      <!-- Brushed Brass Split Ring -->
      <circle cx="400" cy="175" r="46" fill="none" stroke="${goldColor}" stroke-width="14" />
      <circle cx="400" cy="175" r="46" fill="none" stroke="#FFF2B2" stroke-width="2" opacity="0.6" />
      <!-- Swivel Clasp Connector -->
      <rect x="386" y="216" width="28" height="36" rx="8" fill="${goldColor}" />
      <!-- Braided Plum Leather Loop -->
      <path d="M 392 248 L 340 365 C 332 385, 368 400, 382 375 L 400 252" fill="${accentColor}" />
      <!-- Embossed Sidi Monogram Tag -->
      <rect x="372" y="268" width="92" height="145" rx="22" transform="rotate(-8 418 340)" fill="${accentColor}" stroke="${goldColor}" stroke-width="3" />
      <circle cx="422" cy="342" r="26" fill="${goldColor}" />
      <circle cx="422" cy="342" r="20" fill="${accentColor}" />
      <!-- Silk Tassel Fringe -->
      <path d="M 346 378 L 315 452 L 378 452 Z" fill="#320B36" />
      <rect x="333" y="372" width="28" height="12" rx="3" fill="${goldColor}" />
    `;
  } else if (silhouette === 'outfit' || silhouette === 'silk_set') {
    subjectMarkup = `
      <ellipse cx="400" cy="476" rx="150" ry="20" fill="#1E1028" opacity="0.2" />
      <!-- Tailored Blazer Silhouette -->
      <path d="M 310 148 L 368 128 L 400 198 L 432 128 L 490 148 L 512 310 L 468 315 L 456 210 L 452 332 L 348 332 L 344 210 L 332 315 L 288 310 Z" fill="${accentColor}" />
      <!-- Satin Lapels -->
      <path d="M 368 128 L 400 202 L 362 232 L 346 155 Z" fill="#2A082E" />
      <path d="M 432 128 L 400 202 L 438 232 L 454 155 Z" fill="#2A082E" />
      <!-- Double-Breasted Gold Buttons -->
      <circle cx="384" cy="242" r="6" fill="${goldColor}" />
      <circle cx="416" cy="242" r="6" fill="${goldColor}" />
      <circle cx="384" cy="274" r="6" fill="${goldColor}" />
      <circle cx="416" cy="274" r="6" fill="${goldColor}" />
      <!-- Wide-Leg Tailored Trousers -->
      <path d="M 352 332 L 448 332 L 472 468 L 412 468 L 400 375 L 388 468 L 328 468 Z" fill="#2D0C31" />
      <line x1="370" y1="336" x2="358" y2="465" stroke="#ffffff" stroke-width="1.5" opacity="0.2" />
      <line x1="430" y1="336" x2="442" y2="465" stroke="#ffffff" stroke-width="1.5" opacity="0.2" />
    `;
  } else if (silhouette === 'tote') {
    subjectMarkup = `
      <ellipse cx="400" cy="465" rx="160" ry="22" fill="#1E1028" opacity="0.22" />
      <path d="M 335 205 C 335 120, 465 120, 465 205" fill="none" stroke="${accentColor}" stroke-width="14" />
      <path d="M 225 200 L 575 200 L 545 458 L 255 458 Z" fill="${accentColor}" />
      <path d="M 245 218 L 555 218 L 530 442 L 270 442 Z" fill="none" stroke="${goldColor}" stroke-width="1.5" opacity="0.5" />
      <rect x="365" y="255" width="70" height="32" rx="4" fill="${goldColor}" />
    `;
  } else {
    subjectMarkup = `
      <ellipse cx="400" cy="455" rx="150" ry="20" fill="#1E1028" opacity="0.2" />
      <rect x="245" y="255" width="310" height="185" rx="28" fill="${accentColor}" />
      <path d="M 245 275 L 400 365 L 555 275" fill="none" stroke="${goldColor}" stroke-width="4" />
      <circle cx="400" cy="360" r="18" fill="${goldColor}" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgTop}" />
        <stop offset="100%" stop-color="${bgBottom}" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" />
    <!-- Architectural Studio Plinth -->
    <path d="M 140 450 L 660 450 L 720 600 L 80 600 Z" fill="${plinthColor}" />
    <rect x="140" y="450" width="520" height="12" fill="#D9CEC5" />
    <!-- Studio Rim Arch -->
    <path d="M 210 500 L 210 220 C 210 110, 590 110, 590 220 L 590 500" fill="none" stroke="${goldColor}" stroke-width="1.2" opacity="0.32" />
    ${subjectMarkup}
    <!-- Subtle Editorial Corner Stamp -->
    <text x="54" y="58" font-family="Georgia, serif" font-size="13" fill="#4A154B" letter-spacing="3" opacity="0.65">${edition}</text>
    <text x="54" y="80" font-family="Georgia, serif" font-size="18" font-style="italic" fill="#1E1028" opacity="0.8">${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const HERO_BANNER_IMAGE = createLuxuryProductSvgDataUri({
  bgTop: '#F5EFEA',
  bgBottom: '#E6DDD6',
  plinthColor: '#EAE1DA',
  accentColor: '#4A154B',
  goldColor: '#C59B27',
  silhouette: 'handbag',
  label: 'Sidi Outfits — Autumn / Winter Atelier',
  edition: 'MAISON SIDI · N° 01',
});

export const INITIAL_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'sidi-royal-plum-top-handle',
    name: 'Sidi Sovereign Structured Handbag',
    category: 'Handbags',
    price: 340,
    quantity: 14,
    soldCount: 28,
    description:
      'Hand-stitched full-grain plum calfskin structured top-handle bag with solid brushed brass rotary turn-lock, suede interior lining, and detachable clochette charm.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F7F3F0',
      bgBottom: '#EAE2DC',
      plinthColor: '#E5DBD3',
      accentColor: '#4A154B',
      goldColor: '#C59B27',
      silhouette: 'handbag',
      label: 'Sovereign Calfskin Top-Handle',
      edition: 'HANDBAG · ATELIER SERIES',
    }),
    sku: 'SD-HB-001',
    featured3dModel: 'handbag',
    isPublished: true,
    ownerId: 'system_seed',
  },
  {
    id: 'sidi-mulberry-velvet-midi-dress',
    name: 'Mulberry Draped Silk-Velvet Midi Dress',
    category: 'Dresses',
    price: 420,
    quantity: 9,
    soldCount: 19,
    description:
      'Architectural bias-cut silk-velvet evening dress featuring an asymmetrical pleated skirt, structured bodice, and a removable brushed gold waist cinch belt.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F6F1EE',
      bgBottom: '#E8DFD9',
      plinthColor: '#E2D7CF',
      accentColor: '#5B1865',
      goldColor: '#C59B27',
      silhouette: 'dress',
      label: 'Mulberry Silk-Velvet Midi',
      edition: 'EVENING WEAR · EDITION 02',
    }),
    sku: 'SD-DR-002',
    featured3dModel: 'dress',
    isPublished: true,
    ownerId: 'system_seed',
  },
  {
    id: 'sidi-braided-brass-charm-keychain',
    name: 'Artisanal Braided Leather & Brass Keychain',
    category: 'Keychains',
    price: 68,
    quantity: 32,
    soldCount: 64,
    description:
      'Solid turned brass split ring and spring carabiner paired with hand-braided imperial purple calfskin, embossed Sidi medallion tag, and silk tassel accent.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F8F5F2',
      bgBottom: '#EBE3DD',
      plinthColor: '#E4DAD2',
      accentColor: '#4A154B',
      goldColor: '#C59B27',
      silhouette: 'keychain',
      label: 'Artisanal Brass & Leather Charm',
      edition: 'KEYCHAIN · HARDWARE 03',
    }),
    sku: 'SD-KC-003',
    featured3dModel: 'keychain',
    isPublished: true,
    ownerId: 'system_seed',
  },
  {
    id: 'sidi-imperial-tailored-linen-outfit',
    name: 'Imperial Double-Breasted Linen Suit Outfit',
    category: 'Outfits',
    price: 510,
    quantity: 7,
    soldCount: 15,
    description:
      'Two-piece coordinated runway outfit combining a peak-lapel double-breasted plum linen blazer with high-waisted wide-leg pleated trousers and gold bullion buttons.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F5F0EC',
      bgBottom: '#E7DDD6',
      plinthColor: '#E0D5CD',
      accentColor: '#3B103E',
      goldColor: '#C59B27',
      silhouette: 'outfit',
      label: 'Imperial Tailored Two-Piece',
      edition: 'COMPLETE OUTFIT · 04',
    }),
    sku: 'SD-OT-004',
    featured3dModel: 'outfit',
    isPublished: true,
    ownerId: 'system_seed',
  },
  {
    id: 'sidi-aubergine-atelier-shopper-tote',
    name: 'Aubergine Architectural Gallery Tote',
    category: 'Handbags',
    price: 295,
    quantity: 11,
    soldCount: 22,
    description:
      'Generously proportioned everyday gallery tote in pebbled aubergine leather with reinforced saddle stitching, internal laptop sleeve, and solid brass feet.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F7F4F1',
      bgBottom: '#E9E0DA',
      plinthColor: '#E3D9D1',
      accentColor: '#310D33',
      goldColor: '#C59B27',
      silhouette: 'tote',
      label: 'Aubergine Gallery Tote',
      edition: 'HANDBAG · EDITION 05',
    }),
    sku: 'SD-HB-005',
    featured3dModel: 'handbag',
    isPublished: true,
    ownerId: 'system_seed',
  },
  {
    id: 'sidi-amethyst-evening-clutch',
    name: 'Amethyst Envelope Evening Clutch & Chain',
    category: 'Accessories',
    price: 185,
    quantity: 18,
    soldCount: 31,
    description:
      'Minimalist geometric envelope clutch in satin-finish amethyst leather with a concealed magnetic clasp and removable solid brass serpentine shoulder chain.',
    imageUrl: createLuxuryProductSvgDataUri({
      bgTop: '#F6F2EE',
      bgBottom: '#E8DFD8',
      plinthColor: '#E1D6CE',
      accentColor: '#63206E',
      goldColor: '#C59B27',
      silhouette: 'clutch',
      label: 'Amethyst Envelope Clutch',
      edition: 'ACCESSORIES · EDITION 06',
    }),
    sku: 'SD-AC-006',
    featured3dModel: 'keychain',
    isPublished: true,
    ownerId: 'system_seed',
  },
];
