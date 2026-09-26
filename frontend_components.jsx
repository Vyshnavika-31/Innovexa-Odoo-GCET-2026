
export default function Button({ children, variant = "primary", loading = false, className = "", ...props }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "text-slate-600 hover:bg-slate-100"
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
export default function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={`w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
import { X } from "lucide-react";

export default function Modal({ open, title, onClose, children, width = "max-w-2xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
import { Menu, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";

const titles = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/receipts": "Receipts",
  "/deliveries": "Deliveries",
  "/transfers": "Internal Transfers",
  "/adjustments": "Stock Adjustments",
  "/moves": "Move History",
  "/settings": "Settings"
};

export default function Navbar({ onMenu }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("stocksense_user") || "{}");
  const name = user.name || user.email || "User";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
        <h1 className="text-lg font-bold text-slate-900">{titles[location.pathname] || "StockSense"}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={19} /></button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-slate-500">Inventory User</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
          {String(name).charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, ClipboardList, Truck, ArrowLeftRight, SlidersHorizontal, History, Settings, X, LogOut, PackageCheck } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/products", label: "Products", icon: Boxes },
  { to: "/receipts", label: "Receipts", icon: PackageCheck },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/adjustments", label: "Adjustments", icon: SlidersHorizontal },
  { to: "/moves", label: "Move History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("stocksense_token");
    localStorage.removeItem("stocksense_user");
    navigate("/login");
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-950 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div>
            <div className="text-xl font-extrabold tracking-tight">Stock<span className="text-indigo-400">Sense</span></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Inventory Management</div>
          </div>
          <button className="lg:hidden" onClick={onClose}><X size={20} /></button>
        </div>

        <nav className="space-y-1 p-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-white/10 p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
export default function Table({ columns, rows, loading, emptyMessage = "No records found." }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => <th key={column.key} className="px-4 py-3 font-semibold">{column.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">{emptyMessage}</td></tr>
          ) : rows.map((row, index) => (
            <tr key={row.id ?? row._id ?? index} className="hover:bg-slate-50">
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
