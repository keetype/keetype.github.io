/**
 * Keetype v2 Configuration
 * 
 * Configure categories, Google Sheets identifiers, and app settings.
 * To add a new category (e.g. Mice, Cloth Mousepads, MX Keyboards):
 * Simply update status from 'coming-soon' to 'active', add its Google Sheets gid,
 * and define its fields.
 */

window.KEETYPE_CONFIG = {
  // Primary Google Spreadsheet ID
  spreadsheetId: "1RE3oq8_rLnmXhUCqya681PJXSbFBRTcT6tQeFjdJa3I",

  // Default referral code copied when none is overridden per-product
  defaultReferralCode: "KEETYPE",

  // Categories configuration
  categories: [
    {
      id: "keyboards",
      name: "Hall Effect Keyboards",
      shortName: "HE Keyboards",
      icon: "⌨️",
      gid: "491680755",
      type: "keyboards",
      status: "active",
      description: "Ranked by quality, best → worst (top to bottom in each size of each category)",
      credits: "By aasd"
    },
    {
      id: "mousepads",
      name: "Glass Mousepads",
      shortName: "Glass Pads",
      icon: "🧊",
      gid: "0",
      type: "mousepads",
      status: "active",
      description: "Ordered Speed → Control (top to bottom)",
      credits: "By dangly, aasd, micro (and Ness)"
    },
    {
      id: "skates",
      name: "Skates",
      shortName: "Skates",
      icon: "⚪",
      gidCloth: "1497121162",
      gidGlass: "270660286",
      type: "skates",
      status: "active",
      description: "Ordered Speed → Control for cloth and glass mousepads",
      credits: "By aasd, based on Shwamper's sheet"
    },
    {
      id: "mice",
      name: "Mice",
      shortName: "Mice",
      icon: "🖱️",
      gid: null,
      type: "mice",
      status: "coming-soon",
      description: "Currently testing and benchmarking top mice. Recommendations coming soon!",
      credits: "Curated by Keetype"
    },
    {
      id: "cloth-mousepads",
      name: "Cloth Mousepads",
      shortName: "Cloth Pads",
      icon: "⬛",
      gid: null,
      type: "cloth-mousepads",
      status: "coming-soon",
      description: "Artisan and performance cloth mousepads list currently in testing. Coming soon!",
      credits: "Curated by Keetype"
    },
    {
      id: "mx-keyboards",
      name: "MX Keyboards",
      shortName: "MX Keyboards",
      icon: "⌨️",
      gid: null,
      type: "mx-keyboards",
      status: "coming-soon",
      description: "Traditional mechanical MX switch keyboards. Coming soon!",
      credits: "Curated by Keetype"
    }
  ]
};
