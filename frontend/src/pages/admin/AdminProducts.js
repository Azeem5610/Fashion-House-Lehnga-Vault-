import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil } from "react-icons/hi";
import { GiDress } from "react-icons/gi";
import { toast } from "react-toastify";

const FABRIC_TYPES = [
  "Net (China)", "Pure China Krinkle", "Tussle Silk",
  "Organza", "Barosha", "Velvet (Winter)", "Shafon Krinkle",
];

const SIZES = ["S", "M", "L", "XL"];

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "ready-made",
    fabricType: FABRIC_TYPES[0], price: "", sizes: [], inStock: true,
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/products");
      setProducts(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", category: "ready-made", fabricType: FABRIC_TYPES[0], price: "", sizes: [], inStock: true });
    setFiles([]);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name, description: product.description || "",
      category: product.category, fabricType: product.fabricType,
      price: product.price, sizes: product.sizes || [], inStock: product.inStock,
    });
    setFiles([]);
    setShowModal(true);
  };

  const toggleSize = (size) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("fabricType", form.fabricType);
      formData.append("price", form.price);
      formData.append("sizes", JSON.stringify(form.sizes));
      formData.append("inStock", form.inStock);
      files.forEach((file) => formData.append("images", file));

      if (editing) {
        await API.put(`/products/${editing._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Product updated!");
      } else {
        await API.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Product created!");
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await API.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Products</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> Add Product
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Fabric</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No products yet</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt={p.name} className="admin-table-image" />
                      ) : (
                        <GiDress style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }} />
                      )}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                    <td><span className={`badge badge-${p.category === 'ready-made' ? 'shipped' : 'confirmed'}`}>{p.category}</span></td>
                    <td>{p.fabricType}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>Rs. {p.price?.toLocaleString()}</td>
                    <td>{p.inStock ? <span className="badge badge-completed">In Stock</span> : <span className="badge badge-pending">Out</span>}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button className="btn-edit" onClick={() => openEdit(p)}><HiPencil /></button>
                        <button className="btn-delete" onClick={() => handleDelete(p._id)}><HiTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? "Edit Product" : "Add Product"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="ready-made">Ready-Made</option>
                  <option value="customized">Customized</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fabric Type</label>
                <select className="form-select" value={form.fabricType}
                  onChange={(e) => setForm({ ...form, fabricType: e.target.value })}>
                  {FABRIC_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (PKR)</label>
                <input className="form-input" type="number" required value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              {form.category === "ready-made" && (
                <div className="form-group">
                  <label className="form-label">Sizes</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {SIZES.map((s) => (
                      <button key={s} type="button"
                        className={`size-btn ${form.sizes.includes(s) ? "active" : ""}`}
                        onClick={() => toggleSize(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Images</label>
                <input type="file" accept="image/*" multiple
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  style={{ color: 'var(--text-secondary)' }} />
                {editing && editing.images?.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {editing.images.map((img, i) => (
                      <img key={i} src={img.url} alt="" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover' }} />
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Product" : "Create Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
