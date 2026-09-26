import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("stocksense_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("stocksense_token");
      localStorage.removeItem("stocksense_user");
      if (!window.location.pathname.includes("/login")) window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const unwrap = (response) => response.data;

export const authApi = {
  signup: (data) => api.post("/api/auth/signup", data).then(unwrap),
  login: (data) => api.post("/api/auth/login", data).then(unwrap),
  sendResetOtp: (data) => api.post("/api/auth/forgot-password", data).then(unwrap),
  resetPassword: (data) => api.post("/api/auth/reset-password", data).then(unwrap)
};

export const dashboardApi = {
  get: (params) => api.get("/api/dashboard", { params }).then(unwrap)
};

export const productsApi = {
  list: (params) => api.get("/api/products", { params }).then(unwrap),
  get: (id) => api.get(`/api/products/${id}`).then(unwrap),
  create: (data) => api.post("/api/products", data).then(unwrap),
  update: (id, data) => api.put(`/api/products/${id}`, data).then(unwrap)
};

export const receiptsApi = {
  list: (params) => api.get("/api/receipts", { params }).then(unwrap),
  create: (data) => api.post("/api/receipts", data).then(unwrap),
  validate: (id) => api.post(`/api/receipts/${id}/validate`).then(unwrap)
};

export const deliveriesApi = {
  list: (params) => api.get("/api/deliveries", { params }).then(unwrap),
  create: (data) => api.post("/api/deliveries", data).then(unwrap),
  validate: (id) => api.post(`/api/deliveries/${id}/validate`).then(unwrap)
};

export const transfersApi = {
  list: (params) => api.get("/api/transfers", { params }).then(unwrap),
  create: (data) => api.post("/api/transfers", data).then(unwrap),
  validate: (id) => api.post(`/api/transfers/${id}/validate`).then(unwrap)
};

export const adjustmentsApi = {
  list: (params) => api.get("/api/adjustments", { params }).then(unwrap),
  create: (data) => api.post("/api/adjustments", data).then(unwrap)
};

export const ledgerApi = {
  list: (params) => api.get("/api/stock-ledger", { params }).then(unwrap)
};

export const settingsApi = {
  get: () => api.get("/api/settings").then(unwrap),
  update: (data) => api.put("/api/settings", data).then(unwrap),
  profile: () => api.get("/api/profile").then(unwrap),
  updateProfile: (data) => api.put("/api/profile", data).then(unwrap)
};
