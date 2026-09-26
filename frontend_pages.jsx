import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { authApi } from "../services/api";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await authApi.signup(form);
      setMessage("Account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-2xl font-extrabold">Stock<span className="text-indigo-600">Sense</span></div>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Set up your inventory management account.</p>
        {error && <div className="alert-error mb-4">{error}</div>}
        {message && <div className="alert-success mb-4">{message}</div>}
        <form onSubmit={submit} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
          <Button type="submit" loading={loading} className="w-full">Create Account</Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-indigo-600">Login</Link></p>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import { settingsApi } from "../services/api";

export default function Settings(){
  const [data,setData]=useState({profile:{name:"",email:""},warehouse:{name:"",location:""},categories:[],reorderingRules:[]});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  useEffect(()=>{Promise.all([settingsApi.get().catch(()=>({})),settingsApi.profile().catch(()=>({}))]).then(([settings,profile])=>setData({...settings,profile:profile.profile||profile.user||profile||settings.profile||{}})).finally(()=>setLoading(false))},[]);
  const save=async e=>{e.preventDefault();setSaving(true);setError("");try{await settingsApi.update(data);setMessage("Settings saved successfully.")}catch(e){setError(e.response?.data?.message||"Could not save settings.")}finally{setSaving(false)}};
  if(loading)return <div className="py-12 text-center text-slate-500">Loading settings...</div>;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Settings</h2><p className="text-sm text-slate-500">Manage profile, warehouse and inventory configuration.</p></div>{message&&<div className="alert-success">{message}</div>}{error&&<div className="alert-error">{error}</div>}<form onSubmit={save} className="space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 text-lg font-bold">User Profile</h3><div className="grid gap-4 sm:grid-cols-2"><Input label="Name" value={data.profile?.name||""} onChange={e=>setData({...data,profile:{...data.profile,name:e.target.value}})}/><Input label="Email" type="email" value={data.profile?.email||""} onChange={e=>setData({...data,profile:{...data.profile,email:e.target.value}})}/></div></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 text-lg font-bold">Warehouse Settings</h3><div className="grid gap-4 sm:grid-cols-2"><Input label="Warehouse Name" value={data.warehouse?.name||""} onChange={e=>setData({...data,warehouse:{...data.warehouse,name:e.target.value}})}/><Input label="Location" value={data.warehouse?.location||""} onChange={e=>setData({...data,warehouse:{...data.warehouse,location:e.target.value}})}/></div></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold">Categories</h3><p className="mt-1 text-sm text-slate-500">{(data.categories||[]).length} categories returned by the backend.</p></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold">Reordering Rules</h3><p className="mt-1 text-sm text-slate-500">{(data.reorderingRules||[]).length} rules returned by the backend.</p></section>
    <Button type="submit" loading={saving}>Save Settings</Button>
  </form></div>;
}
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { receiptsApi } from "../services/api";

export default function Receipts() {
  const [rows, setRows] = useState([]); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", warehouse: "", product: "", quantity: "", unit: "" });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");

  const load = async () => { setLoading(true); try { const d = await receiptsApi.list(); setRows(d.receipts || d.data || d || []); } catch (e) { setError(e.response?.data?.message || "Could not load receipts."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async e => { e.preventDefault(); setSaving(true); setError(""); try { await receiptsApi.create({ ...form, quantity: Number(form.quantity) }); setOpen(false); setForm({ supplier:"", warehouse:"", product:"", quantity:"", unit:"" }); setMessage("Receipt saved."); load(); } catch(e) { setError(e.response?.data?.message || "Could not save receipt."); } finally { setSaving(false); } };
  const validate = async id => { setError(""); try { await receiptsApi.validate(id); setMessage("Receipt validated successfully."); load(); } catch(e) { setError(e.response?.data?.message || "Could not validate receipt."); } };

  const columns = [
    {key:"receiptNo",label:"Receipt No.",render:r=>r.receiptNo||r.number||r.id},
    {key:"supplier",label:"Supplier"},
    {key:"date",label:"Date",render:r=>r.date||r.createdAt},
    {key:"status",label:"Status"},
    {key:"warehouse",label:"Warehouse"},
    {key:"actions",label:"Actions",render:r=>!["done","validated","completed"].includes(String(r.status).toLowerCase()) ? <Button className="px-3 py-1.5" onClick={()=>validate(r.id||r._id)}>Validate</Button> : <span className="text-xs text-emerald-600">Validated</span>}
  ];

  return <OperationPage title="Receipts" description="Incoming goods. Validation is handled by the backend." button="New Receipt" open={open} setOpen={setOpen} error={error} message={message} rows={rows} columns={columns} loading={loading} onSubmit={create} saving={saving} form={form} setForm={setForm} fields={["supplier","warehouse","product","quantity","unit"]} />;
}

function OperationPage({title,description,button,open,setOpen,error,message,rows,columns,loading,onSubmit,saving,form,setForm,fields}) {
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold">{title}</h2><p className="text-sm text-slate-500">{description}</p></div><Button onClick={()=>setOpen(true)}><Plus size={17}/>{button}</Button></div>{message&&<div className="alert-success">{message}</div>}{error&&<div className="alert-error">{error}</div>}<Table columns={columns} rows={rows} loading={loading}/><Modal open={open} onClose={()=>setOpen(false)} title={button}><form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">{fields.map(f=><Input key={f} label={f.replace(/^\w/,c=>c.toUpperCase())} type={f==="quantity"?"number":"text"} required={["supplier","warehouse","product","quantity"].includes(f)} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/>) }<div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Save Receipt</Button></div></form></Modal></div>;
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { productsApi } from "../services/api";

const emptyForm = { name: "", sku: "", category: "", unit: "", initialStock: "", location: "", reorderLevel: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: "", category: "", warehouse: "" });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await productsApi.list(filters);
      setProducts(data.products || data.data || data || []);
    } catch (err) { setError(err.response?.data?.message || "Could not load products."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await productsApi.create({ ...form, initialStock: form.initialStock === "" ? undefined : Number(form.initialStock), reorderLevel: form.reorderLevel === "" ? undefined : Number(form.reorderLevel) });
      setOpen(false); setForm(emptyForm); setMessage("Product created successfully."); load();
    } catch (err) { setError(err.response?.data?.message || "Could not create product."); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: "name", label: "Product" },
    { key: "sku", label: "SKU" },
    { key: "category", label: "Category" },
    { key: "unit", label: "Unit" },
    { key: "stock", label: "Stock", render: r => r.stock ?? r.currentStock ?? 0 },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", render: r => <Status status={r.status || (Number(r.stock) === 0 ? "Out of Stock" : "In Stock")} /> },
    { key: "actions", label: "Actions", render: r => <Link to={`/products/${r.id || r._id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline"><Eye size={16} /> View</Link> }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h2 className="text-2xl font-bold">Products</h2><p className="text-sm text-slate-500">Manage products and view backend-provided stock.</p></div>
        <Button onClick={() => setOpen(true)}><Plus size={17} /> Add Product</Button>
      </div>
      {message && <div className="alert-success">{message}</div>}
      {error && <div className="alert-error">{error}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm" placeholder="Search SKU / Product" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === "Enter" && load()} /></div>
        <input className="rounded-lg border border-slate-300 px-3 text-sm" placeholder="Category" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} />
        <input className="rounded-lg border border-slate-300 px-3 text-sm" placeholder="Warehouse" value={filters.warehouse} onChange={e => setFilters({ ...filters, warehouse: e.target.value })} />
      </div>
      <Button variant="secondary" onClick={load}>Apply Filters</Button>
      <Table columns={columns} rows={products} loading={loading} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add Product">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Input label="Product Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="SKU / Code" required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
          <Input label="Category" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Input label="Unit of Measure" required placeholder="kg / pcs / units" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          <Input label="Initial Stock" type="number" min="0" value={form.initialStock} onChange={e => setForm({ ...form, initialStock: e.target.value })} />
          <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Input label="Reorder Level" type="number" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Create Product</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function Status({ status }) {
  const s = String(status).toLowerCase();
  const cls = s.includes("out") || s.includes("cancel") ? "bg-red-50 text-red-700" : s.includes("low") || s.includes("waiting") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { productsApi } from "../services/api";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    productsApi.get(id).then(data => setProduct(data.product || data.data || data)).catch(err => setError(err.response?.data?.message || "Could not load product.")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-12 text-center text-slate-500">Loading product...</div>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!product) return <div className="alert-error">Product not found.</div>;

  const locations = product.stockByLocation || product.locations || [];

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><ArrowLeft size={16} /> Back to Products</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Package size={25} /></div>
          <div><h2 className="text-2xl font-bold">{product.name}</h2><p className="mt-1 text-sm text-slate-500">SKU: {product.sku}</p></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Info label="Category" value={product.category} /><Info label="Unit" value={product.unit || product.unitOfMeasure} /><Info label="Total Stock" value={product.stock ?? product.totalStock ?? 0} /><Info label="Reorder Level" value={product.reorderLevel ?? "—"} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">Stock by Location</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Location</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Unit</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{locations.map((x, i) => <tr key={x.id || i}><td className="px-4 py-3">{x.location || x.name}</td><td className="px-4 py-3 font-semibold">{x.quantity ?? x.stock}</td><td className="px-4 py-3">{x.unit || product.unit}</td></tr>)}</tbody>
          </table>
          {!locations.length && <p className="p-6 text-center text-sm text-slate-500">No location breakdown was returned by the backend.</p>}
        </div>
      </section>
    </div>
  );
}
function Info({ label, value }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value ?? "—"}</p></div>; }
import { useEffect, useState } from "react";
import Table from "../components/Table";
import { ledgerApi } from "../services/api";

export default function MoveHistory(){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{ledgerApi.list().then(d=>setRows(d.moves||d.ledger||d.data||d||[])).catch(e=>setError(e.response?.data?.message||"Could not load stock ledger.")).finally(()=>setLoading(false))},[]);
  const columns=[
    {key:"date",label:"Date",render:r=>r.date||r.createdAt},
    {key:"product",label:"Product",render:r=>r.product?.name||r.productName||r.product},
    {key:"operation",label:"Operation"},
    {key:"quantity",label:"Quantity"},
    {key:"from",label:"From",render:r=>r.from||r.fromLocation||"—"},
    {key:"to",label:"To",render:r=>r.to||r.toLocation||"—"},
    {key:"user",label:"User",render:r=>r.user?.name||r.userName||r.user||"—"},
    {key:"reference",label:"Reference"}
  ];
  return <div className="space-y-5"><div><h2 className="text-2xl font-bold">Move History</h2><p className="text-sm text-slate-500">Stock ledger records returned by the backend.</p></div>{error&&<div className="alert-error">{error}</div>}<Table columns={columns} rows={rows} loading={loading}/></div>;
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { authApi } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(form);
      const token = data.token || data.accessToken || data.data?.token;
      if (!token) throw new Error("Backend did not return an authentication token.");
      localStorage.setItem("stocksense_token", token);
      localStorage.setItem("stocksense_user", JSON.stringify(data.user || data.data?.user || { email: form.email }));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your inventory.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="alert-error">{error}</div>}
        <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        <Input label="Password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</Link></div>
        <Button type="submit" loading={loading} className="w-full">Login</Button>
        <p className="text-center text-sm text-slate-500">Don't have an account? <Link to="/signup" className="font-semibold text-indigo-600">Create one</Link></p>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-3xl font-extrabold">Stock<span className="text-indigo-400">Sense</span></div>
          <h1 className="text-4xl font-bold leading-tight">One place for your entire inventory.</h1>
          <p className="mt-5 text-slate-400">Track products, receipts, deliveries, transfers and stock adjustments with a clean real-time workflow.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-2xl font-extrabold">Stock<span className="text-indigo-600">Sense</span></div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-2 mb-7 text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { transfersApi } from "../services/api";

export default function InternalTransfers(){
  const [rows,setRows]=useState([]),[open,setOpen]=useState(false),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [form,setForm]=useState({product:"",quantity:"",fromLocation:"",toLocation:""});
  const load=async()=>{setLoading(true);try{const d=await transfersApi.list();setRows(d.transfers||d.data||d||[])}catch(e){setError(e.response?.data?.message||"Could not load transfers.")}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const create=async e=>{e.preventDefault();setSaving(true);try{await transfersApi.create({...form,quantity:Number(form.quantity)});setOpen(false);setMessage("Transfer saved.");setForm({product:"",quantity:"",fromLocation:"",toLocation:""});load()}catch(e){setError(e.response?.data?.message||"Could not save transfer.")}finally{setSaving(false)}};
  const validate=async id=>{try{await transfersApi.validate(id);setMessage("Transfer completed.");load()}catch(e){setError(e.response?.data?.message||"Could not complete transfer.")}};
  const columns=[{key:"product",label:"Product",render:r=>r.product?.name||r.productName||r.product},{key:"quantity",label:"Quantity"},{key:"fromLocation",label:"From",render:r=>r.fromLocation||r.from},{key:"toLocation",label:"To",render:r=>r.toLocation||r.to},{key:"status",label:"Status"},{key:"actions",label:"Actions",render:r=>String(r.status).toLowerCase()!=="done"?<Button className="px-3 py-1.5" onClick={()=>validate(r.id||r._id)}>Transfer</Button>:<span className="text-xs text-emerald-600">Completed</span>}];
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold">Internal Transfers</h2><p className="text-sm text-slate-500">Move stock between locations without changing total inventory.</p></div><Button onClick={()=>setOpen(true)}><Plus size={17}/>New Transfer</Button></div>{message&&<div className="alert-success">{message}</div>}{error&&<div className="alert-error">{error}</div>}<Table columns={columns} rows={rows} loading={loading}/><Modal open={open} onClose={()=>setOpen(false)} title="New Transfer"><form onSubmit={create} className="grid gap-4 sm:grid-cols-2"><Input label="Product" required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/><Input label="Quantity" type="number" min="0" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/><Input label="From Location" required value={form.fromLocation} onChange={e=>setForm({...form,fromLocation:e.target.value})}/><Input label="To Location" required value={form.toLocation} onChange={e=>setForm({...form,toLocation:e.target.value})}/><div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Save Transfer</Button></div></form></Modal></div>;
}
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { authApi } from "../services/api";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      await authApi.sendResetOtp({ email: form.email });
      setMessage("OTP sent. Check your registered email.");
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || "Could not send OTP."); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    if (form.newPassword !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await authApi.resetPassword(form);
      setMessage("Password reset successfully. You can now log in.");
      setStep(3);
    } catch (err) { setError(err.response?.data?.message || "Password reset failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-2xl font-extrabold">Stock<span className="text-indigo-600">Sense</span></div>
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Reset your password using a one-time password.</p>
        {error && <div className="alert-error mb-4">{error}</div>}
        {message && <div className="alert-success mb-4">{message}</div>}
        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-4">
            <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Button type="submit" loading={loading} className="w-full">Send OTP</Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={reset} className="space-y-4">
            <Input label="OTP" required value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value })} />
            <Input label="New Password" type="password" required value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
            <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
            <Button type="submit" loading={loading} className="w-full">Reset Password</Button>
          </form>
        )}
        {step === 3 && <Link to="/login" className="block"><Button className="w-full">Go to Login</Button></Link>}
        <p className="mt-5 text-center text-sm"><Link to="/login" className="font-semibold text-indigo-600">Back to Login</Link></p>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { deliveriesApi } from "../services/api";

export default function Deliveries() {
  const [rows,setRows]=useState([]), [open,setOpen]=useState(false), [saving,setSaving]=useState(false), [loading,setLoading]=useState(true), [error,setError]=useState(""), [message,setMessage]=useState("");
  const [form,setForm]=useState({customer:"",warehouse:"",product:"",quantity:""});
  const load=async()=>{setLoading(true);try{const d=await deliveriesApi.list();setRows(d.deliveries||d.data||d||[])}catch(e){setError(e.response?.data?.message||"Could not load deliveries.")}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const create=async e=>{e.preventDefault();setSaving(true);try{await deliveriesApi.create({...form,quantity:Number(form.quantity)});setOpen(false);setMessage("Delivery saved.");setForm({customer:"",warehouse:"",product:"",quantity:""});load()}catch(e){setError(e.response?.data?.message||"Could not save delivery.")}finally{setSaving(false)}};
  const validate=async id=>{try{await deliveriesApi.validate(id);setMessage("Delivery validated successfully.");load()}catch(e){setError(e.response?.data?.message||"Could not validate delivery.")}};
  const columns=[{key:"deliveryNo",label:"Delivery No.",render:r=>r.deliveryNo||r.number||r.id},{key:"customer",label:"Customer"},{key:"date",label:"Date",render:r=>r.date||r.createdAt},{key:"status",label:"Status"},{key:"warehouse",label:"Warehouse"},{key:"actions",label:"Actions",render:r=>!["done","validated","completed"].includes(String(r.status).toLowerCase())?<Button className="px-3 py-1.5" onClick={()=>validate(r.id||r._id)}>Validate</Button>:<span className="text-xs text-emerald-600">Validated</span>}];
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold">Deliveries</h2><p className="text-sm text-slate-500">Outgoing stock. Validation is handled by the backend.</p></div><Button onClick={()=>setOpen(true)}><Plus size={17}/>New Delivery</Button></div>{message&&<div className="alert-success">{message}</div>}{error&&<div className="alert-error">{error}</div>}<Table columns={columns} rows={rows} loading={loading}/><Modal open={open} onClose={()=>setOpen(false)} title="New Delivery"><form onSubmit={create} className="grid gap-4 sm:grid-cols-2"><Input label="Customer" required value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})}/><Input label="Warehouse" required value={form.warehouse} onChange={e=>setForm({...form,warehouse:e.target.value})}/><Input label="Product" required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/><Input label="Quantity" type="number" min="0" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/><div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Save</Button></div></form></Modal></div>;
}
import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, PackageCheck, Truck, ArrowLeftRight, ClipboardList } from "lucide-react";
import { dashboardApi } from "../services/api";

const cards = [
  ["totalProducts", "Total Products in Stock", Boxes],
  ["lowStock", "Low Stock Items", AlertTriangle],
  ["outOfStock", "Out of Stock Items", ClipboardList],
  ["pendingReceipts", "Pending Receipts", PackageCheck],
  ["pendingDeliveries", "Pending Deliveries", Truck],
  ["scheduledTransfers", "Scheduled Transfers", ArrowLeftRight]
];

export default function Dashboard() {
  const [data, setData] = useState({});
  const [filters, setFilters] = useState({ type: "", status: "", warehouse: "", category: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setData(await dashboardApi.get(filters)); }
    catch (err) { setError(err.response?.data?.message || "Could not load dashboard."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const value = (key) => data[key] ?? data.kpis?.[key] ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory Overview</h2>
        <p className="mt-1 text-sm text-slate-500">Real-time inventory snapshot provided by the backend.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([key, label, Icon]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon size={19} /></div>
            </div>
            <p className="mt-4 text-3xl font-bold">{loading ? "—" : value(key)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><h3 className="font-bold">Filters</h3><p className="text-xs text-slate-500">Filters are sent to the backend; the frontend does not calculate stock.</p></div>
        <div className="grid gap-3 md:grid-cols-4">
          <Select label="Document Type" value={filters.type} onChange={v => setFilters({ ...filters, type: v })} options={["Receipts", "Delivery", "Internal", "Adjustments"]} />
          <Select label="Status" value={filters.status} onChange={v => setFilters({ ...filters, status: v })} options={["Draft", "Waiting", "Ready", "Done", "Canceled"]} />
          <Select label="Warehouse" value={filters.warehouse} onChange={v => setFilters({ ...filters, warehouse: v })} options={data.warehouses || []} />
          <Select label="Category" value={filters.category} onChange={v => setFilters({ ...filters, category: v })} options={data.categories || []} />
        </div>
        <button onClick={load} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Apply Filters</button>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">Recent Inventory Activity</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Reference</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(data.recentActivity || data.recentMoves || []).map((row, i) => (
                <tr key={row.id || i}><td className="px-4 py-3">{row.date || row.createdAt}</td><td className="px-4 py-3">{row.product?.name || row.productName}</td><td className="px-4 py-3">{row.operation}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3">{row.reference || "—"}</td></tr>
              ))}
              {!loading && !(data.recentActivity || data.recentMoves || []).length && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No recent activity.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" value={value} onChange={e => onChange(e.target.value)}><option value="">All</option>{options.map((o, i) => <option key={i} value={typeof o === "object" ? o.id : o}>{typeof o === "object" ? o.name : o}</option>)}</select></label>;
}
import { useEffect, useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { adjustmentsApi } from "../services/api";

export default function Adjustments(){
  const [rows,setRows]=useState([]),[open,setOpen]=useState(false),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [form,setForm]=useState({product:"",location:"",physicalCount:"",reason:""});
  const load=async()=>{setLoading(true);try{const d=await adjustmentsApi.list();setRows(d.adjustments||d.data||d||[])}catch(e){setError(e.response?.data?.message||"Could not load adjustments.")}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const create=async e=>{e.preventDefault();setSaving(true);try{await adjustmentsApi.create({...form,physicalCount:Number(form.physicalCount)});setOpen(false);setMessage("Adjustment applied. Stock calculation was performed by the backend.");setForm({product:"",location:"",physicalCount:"",reason:""});load()}catch(e){setError(e.response?.data?.message||"Could not apply adjustment.")}finally{setSaving(false)}};
  const columns=[{key:"date",label:"Date",render:r=>r.date||r.createdAt},{key:"product",label:"Product",render:r=>r.product?.name||r.productName||r.product},{key:"location",label:"Location"},{key:"currentStock",label:"System Stock"},{key:"physicalCount",label:"Physical Count"},{key:"difference",label:"Difference"},{key:"reason",label:"Reason"}];
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold">Stock Adjustments</h2><p className="text-sm text-slate-500">Submit physical counts; the backend calculates and records the adjustment.</p></div><Button onClick={()=>setOpen(true)}>+ Apply Adjustment</Button></div>{message&&<div className="alert-success">{message}</div>}{error&&<div className="alert-error">{error}</div>}<Table columns={columns} rows={rows} loading={loading}/><Modal open={open} onClose={()=>setOpen(false)} title="Stock Adjustment"><form onSubmit={create} className="space-y-4"><Input label="Product" required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/><Input label="Location" required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/><Input label="Physical Count" type="number" required min="0" value={form.physicalCount} onChange={e=>setForm({...form,physicalCount:e.target.value})}/><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Reason</span><textarea required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" rows="3" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Damaged material, counting mismatch, etc."/></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Apply Adjustment</Button></div></form></Modal></div>;
}
