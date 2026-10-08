/**
 * Keetype v2 - Product Information Overrides
 * 
 * Manually override information for any product based on its Product ID.
 * The Product ID is generated from the Model / Product Name (e.g. "atk-hex80", "statice-seraph").
 * 
 * Available fields you can override:
 * - images: Array of image URLs [ "url1", "url2", ... ]
 *           If multiple images are provided, an interactive carousel with preview dots will appear automatically!
 * - referralLink: Store / purchase URL assigned to the "Buy / View Deal" button.
 * - referralCode: Custom discount/referral code copied by the "Copy Code" button.
 * - notes: Custom or extended notes.
 * - category: Custom category tag.
 * - brand: Brand name.
 * - tier: Custom performance tier.
 * - any custom field you wish to display!
 */

window.PRODUCT_OVERRIDES = {
  // --- HALL EFFECT KEYBOARDS ---
  "atk-hex80": {
    referralLink: "https://atk.pro/products/hex80",
    referralCode: "HEX80AASD",
    notes: "ISSUES WITH FLASHING RGB SOLDERING CURRENTLY. Wait for batch 2 or contact support."
  },
  "tekkusai-titan75": {
    referralLink: "https://tekkusai.com",
    referralCode: "TEKKUSAI10"
  },
  "everglide-su75-pro-v2": {
    referralLink: "https://everglide.com",
    referralCode: "KEETYPE"
  },
  "nuphy-air75-he": {
    referralLink: "https://nuphy.com/collections/keyboards/products/air75-he",
    referralCode: "NUPHY-AIR"
  },

  // --- GLASS MOUSEPADS ---
  "statice-seraph": {
    // Demonstration of multiple preview images to showcase the image carousel feature!
    images: [],
    referralLink: "https://statice.gg/products/seraph",
    referralCode: "SERAPH5",
    notes: "Smooth, very fast, especially the coated option. Highly rated artisan surface."
  },
  "kyomi-yuyo": {
    referralLink: "https://kyomipads.com",
    referralCode: "YUYOPAD"
  },
  "dysphoria-rin": {
    referralLink: "https://dysphoriaglass.com",
    referralCode: "DYS-RIN"
  },
  "glsswrks-polarity": {
    referralLink: "https://glsswrks.com",
    referralCode: "GLSSWRKS"
  },

  // --- SKATES ---
  "phantum-cloud-s1": {
    referralLink: "https://phantum.gg/cloud-s1",
    referralCode: "PHANTUM-S1",
    notes: "Fastest PTFE tested on both cloth and glass surfaces."
  },
  "west-lab-cream": {
    referralLink: "https://westlab.shop",
    referralCode: "WESTCREAM"
  },
  "elite5-pom": {
    referralLink: "https://elite5gaming.com",
    referralCode: "ELITE5"
  }
};

/**
 * Helper to get merged product data with overrides applied
 */
window.applyProductOverrides = function(product) {
  if (!product || !product.id) return product;
  const overrides = window.PRODUCT_OVERRIDES[product.id] || {};
  return {
    ...product,
    ...overrides,
    // Ensure images is always an array
    images: Array.isArray(overrides.images) ? overrides.images : (product.images || []),
    // Referral code defaults to global code if not individually overridden
    referralCode: overrides.referralCode || product.referralCode || window.KEETYPE_CONFIG.defaultReferralCode || "",
    referralLink: overrides.referralLink || product.referralLink || ""
  };
};
