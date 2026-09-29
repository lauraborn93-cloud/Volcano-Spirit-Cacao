/*
 * Central config for the shop, checkout and forms.
 * The Formspree endpoints actually used by the site live directly on the
 * <form action="..."> in checkout.html and index.html; the values below
 * are kept in sync for reference only.
 */
window.VSC = {
  products: [
    {
      id: "ceremonial-cacao-454g",
      name: "100% Ceremonial Cacao, 454g Block (1 lb)",
      name_de: "100% Zeremonieller Kakao, 454g Block",
      price: 49.0,
      currency: "EUR",
      image: "images/product-packaging.jpg",
    },
    {
      id: "ceremonial-cacao-1kg",
      name: "100% Ceremonial Cacao, 1kg Block",
      name_de: "100% Zeremonieller Kakao, 1kg Block",
      price: 75.0,
      currency: "EUR",
      image: "images/product-packaging.jpg",
    },
  ],
  formspree: {
    order: "https://formspree.io/f/mvkpkyal",
    newsletter: "https://formspree.io/f/meajadzz",
  },
  contactEmail: "hello@atitlanspiritcacao.com",
};
