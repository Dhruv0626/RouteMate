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
 * Open Razorpay checkout and immediately verify + process payment on our backend.
 * This approach works in both development (no webhook needed) and production.
 *
 * @param {{ amount, purpose, tripId, rideId, passengerId, driverId, name, email, contact, description }} opts
 * @returns {Promise<{ success, newBalance?, ... } | null>} — backend verify response, or null if dismissed
 */
export const openRazorpayCheckout = async (opts) => {
  const loaded = await loadRazorpay();
  if (!loaded) throw new Error("Razorpay SDK failed to load");

  // 1. Create order on backend
  const { data } = await api.post("/payments/create-order", {
    amount:  opts.amount,
    purpose: opts.purpose,
    tripId:  opts.tripId,
    rideId:  opts.rideId,
  });
  if (!data.success) throw new Error(data.message || "Order creation failed");

  // 2. Open Razorpay — on success, immediately verify & process payment server-side
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key:       data.key,
      amount:    data.order.amount,
      currency:  data.order.currency,
      order_id:  data.order.id,
      name:      "RouteMate",
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
      handler: async (response) => {
        try {
          // Verify and process payment directly — no webhook required
          const verifyRes = await api.post("/payments/verify-payment", {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            purpose:     opts.purpose,
            tripId:      opts.tripId      || data.order.notes?.tripId,
            passengerId: opts.passengerId || data.order.notes?.passengerId,
            driverId:    opts.driverId    || data.order.notes?.driverId,
          });
          resolve(verifyRes.data);
        } catch (err) {
          reject(new Error(err.response?.data?.message || "Payment verification failed"));
        }
      },
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
