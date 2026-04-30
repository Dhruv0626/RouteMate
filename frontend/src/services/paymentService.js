import api from "./api.js";

/** Load Razorpay checkout script */
export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Open Razorpay checkout.
 * @param {{ amount, purpose, tripId, name, email, contact, description }} opts
 * @returns {Promise<{ razorpay_payment_id, razorpay_order_id, razorpay_signature } | null>}
 */
export const openRazorpayCheckout = async (opts) => {
  const loaded = await loadRazorpay();
  if (!loaded) throw new Error("Razorpay SDK failed to load");

  // Create order on backend
  const { data } = await api.post("/payments/create-order", {
    amount: opts.amount,
    purpose: opts.purpose,
    tripId: opts.tripId,
  });
  if (!data.success) throw new Error(data.message || "Order creation failed");

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: data.key,
      amount: data.order.amount,
      currency: data.order.currency,
      order_id: data.order.id,
      name: "RouteMate",
      description: opts.description || "Payment",
      prefill: {
        name:    opts.name    || "",
        email:   opts.email   || "",
        contact: opts.contact || "",
      },
      theme: { color: "#c8f65d" },
      modal: {
        ondismiss: () => resolve(null),
      },
      handler: (response) => resolve(response),
    });
    rzp.on("payment.failed", (resp) => reject(new Error(resp.error.description)));
    rzp.open();
  });
};

/** Fetch wallet info + transactions for current user */
export const getMyWallet = () => api.get("/payments/my-wallet");

/** Passenger pays trip via wallet */
export const walletPayment = (tripId) => api.post("/payments/wallet-pay", { tripId });

/** Driver marks cash received for a trip */
export const cashReceived = (tripId) => api.post("/payments/cash-received", { tripId });

/** Driver requests bank withdrawal */
export const driverWithdrawal = (amount) => api.post("/payments/driver-withdrawal", { amount });
