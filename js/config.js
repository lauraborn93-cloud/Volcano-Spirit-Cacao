/*
 * Central config for the shop, checkout and forms.
 * Replace the placeholder values below before going live:
 *   - products[].price   -> your real prices
 *   - formspree.order / formspree.newsletter -> your own Formspree form endpoints
 *     (free account at https://formspree.io, create two forms, paste their
 *     "https://formspree.io/f/xxxxxxxx" endpoints in below)
 */
window.VSC = {
  products: [
    {
      id: "ceremonial-cacao-454g",
      name: "100% Ceremonial Cacao, 454g Block (1 lb)",
      price: 49.0,
      currency: "EUR",
      image: "images/product-packaging.jpg",
    },
    {
      id: "ceremonial-cacao-1kg",
      name: "100% Ceremonial Cacao, 1kg Block",
      price: 75.0,
      currency: "EUR",
      image: "images/product-packaging.jpg",
    },
  ],
  formspree: {
    order: "https://formspree.io/f/YOUR_ORDER_FORM_ID",
    newsletter: "https://formspree.io/f/YOUR_NEWSLETTER_FORM_ID",
  },
  contactEmail: "hello@atitlanspiritcacao.com",
};
