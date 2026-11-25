const key = (eventId) => `giliran-kupon-${eventId}`;

export function saveCoupons(eventId, coupons) {
  try {
    sessionStorage.setItem(key(eventId), JSON.stringify(coupons));
  } catch {
    /* penyimpanan penuh atau diblokir */
  }
}

export function appendCoupons(eventId, coupons) {
  const current = readCoupons(eventId);
  const ids = new Set(coupons.map((coupon) => coupon.recipientId));
  saveCoupons(eventId, [...current.filter((coupon) => !ids.has(coupon.recipientId)), ...coupons]);
}

export function readCoupons(eventId) {
  try {
    const raw = sessionStorage.getItem(key(eventId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearCoupons(eventId) {
  try {
    sessionStorage.removeItem(key(eventId));
  } catch {
    /* diabaikan */
  }
}