# Volcano Spirit Cacao — website

A static site: no build step, no server required. Open `index.html` directly, or serve the folder with any static host (Netlify, GitHub Pages, Vercel, S3, etc).

## Before you launch — 4 things to finish

### 1. Connect the order + newsletter forms (2 minutes each)

Checkout and the newsletter signup currently show a "not connected yet" message instead of submitting, because they point at placeholder endpoints. To fix:

1. Create a free account at [formspree.io](https://formspree.io).
2. Create **two** forms: one named "Orders", one named "Newsletter". Formspree gives each one a URL like `https://formspree.io/f/abcd1234`.
3. Replace the placeholder `action="..."` values:
   - `checkout.html` → the form tag with `data-checkout-form`
   - `index.html` → the newsletter `<form>` near the bottom of the page
4. Set each new submission to forward to `hello@atitlanspiritcacao.com` in your Formspree dashboard.

Until you do this, checkout shows customers a message asking them to email their order instead, and the newsletter form shows a similar message — nothing is broken or hidden, it just won't collect emails automatically yet.

### 2. Set your real price

Edit `js/config.js` — the `product.price` field is a placeholder ($48.00). Update it (and `currency` if needed) and it updates everywhere: the product page, cart, and checkout.

### 3. Fill in your legal details

The four pages in `/legal/` (Privacy Policy, Terms, Shipping & Returns, Cookie Policy) are complete, real drafts — not filler text — but they are **not a substitute for a lawyer**. Before publishing:

- Fill in the bracketed placeholders in `legal/privacy-policy.html` and `legal/terms.html`: `[Legal Business Name]`, `[Registered Business Address]`, `[Country of Registration]`, `[Registration Number]`, `[Governing Law Jurisdiction]`.
- Have someone familiar with e-commerce law in your country (and the EU/US, if you ship there) review all four pages before you rely on them.

### 4. Decide how you actually want to get paid

Right now, checkout collects an order request (name, address, items) and emails it to you — **no card details are collected or processed anywhere on this site**. That's intentional: a fake "charge" form would be worse than no form at all. To take real payments, pick one:

- **Stripe Payment Links** — simplest; create a link per product, send it after confirming an order by email.
- **Snipcart** or **Shopify Buy Buttons** — adds a real hosted cart + checkout to this same site.

Ask if you want help wiring either of these in — it's a small follow-up job once you've picked one.

## Structure

```
index.html            Homepage
cart.html              Shopping bag
checkout.html          Order request form
order-received.html    Confirmation page
legal/                 Privacy, Terms, Shipping & Returns, Cookie Policy
css/                   style.css (brand), shop.css (cart/legal/consent), fonts.css (self-hosted type)
js/                    config.js (product + form endpoints), cart.js, cookie-consent.js, forms.js, main.js
images/                Web-optimized photos used on the site
originals/              Full-resolution source photos (not used directly on the site)
fonts/                 Self-hosted Fraunces + Jost .woff2 files
```
