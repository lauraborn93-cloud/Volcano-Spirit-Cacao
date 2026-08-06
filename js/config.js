/*
 * Central config for the shop, checkout and forms.
 * Replace the placeholder values below before going live:
 *   - product.price      → your real price
 *   - formspree.order / formspree.newsletter → your own Formspree form endpoints
 *     (free account at https://formspree.io — create two forms, paste their
 *     "https://formspree.io/f/xxxxxxxx" endpoints in below)
 */
window.VSC = {
  product: {
    id: "ceremonial-cacao-1kg",
    name: "100% Ceremonial Cacao — 1kg Block",
    price: 48.0,
    currency: "USD",
    image: "images/product-packaging.jpg",
  },
  formspree: {
    order: "https://formspree.io/f/YOUR_ORDER_FORM_ID",
    newsletter: "https://formspree.io/f/YOUR_NEWSLETTER_FORM_ID",
  },
  contactEmail: "hello@atitlanspiritcacao.com",
};
