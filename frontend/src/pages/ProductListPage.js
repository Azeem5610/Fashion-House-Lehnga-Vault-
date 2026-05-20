import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../utils/api";
import { HiArrowLeft, HiSortDescending, HiHeart, HiOutlineHeart } from "react-icons/hi";
import { GiDress } from "react-icons/gi";
import { toast } from "react-toastify";
import "./ProductListPage.css";

const ProductListPage = () => {
  const { categoryType, fabricType } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Fetch wishlist product IDs
  useEffect(() => {
    API.get("/wishlist").then(r => {
      const ids = (r.data.products || []).map(p => p._id || p);
      setWishlistIds(new Set(ids));
    }).catch(() => {});
  }, []);

  const toggleWishlist = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (wishlistIds.has(productId)) {
        await API.delete(`/wishlist/remove/${productId}`);
        setWishlistIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
        toast.success("Removed from wishlist");
      } else {
        await API.post("/wishlist/add", { productId });
        setWishlistIds(prev => new Set(prev).add(productId));
        toast.success("Added to wishlist!");
      }
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const decodedFabric = decodeURIComponent(fabricType);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [categoryType, fabricType, sort]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        category: categoryType,
        fabricType: decodedFabric,
      };
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (sort === "price-asc") params.sort = "price-asc";
      else if (sort === "price-desc") params.sort = "price-desc";

      const { data } = await API.get("/products", { params });
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const categoryLabel = categoryType === "ready-made" ? "Ready-Made" : "Customized";

  return (
    <div className="product-list-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate(`/category/${categoryType}/fabrics`)}>
          <HiArrowLeft /> Back to Fabrics
        </button>

        <div className="page-header">
          <h1 className="gradient-text">{decodedFabric}</h1>
          <p>{categoryLabel} Collection</p>
        </div>

        {/* Filters */}
        <form className="product-filters" onSubmit={handleFilter}>
          <div className="filter-group">
            <label>Min Price:</label>
            <input
              className="form-input"
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Max Price:</label>
            <input
              className="form-input"
              type="number"
              placeholder="999999"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Apply</button>
          <div className="filter-group">
            <HiSortDescending />
            <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
          <span className="product-count">{products.length} products</span>
        </form>

        {/* Products Grid */}
        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <GiDress style={{ fontSize: '3rem' }} />
            <h3>No products found</h3>
            <p>Check back later for new additions to this collection.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="product-card"
              >
                <div className="product-card-image">
                  {product.images?.length > 0 ? (
                    <img src={product.images[0].url} alt={product.name} />
                  ) : (
                    <div className="product-card-placeholder">
                      <GiDress />
                    </div>
                  )}
                  <span className={`product-card-category ${product.category}`}>
                    {product.category}
                  </span>
                  <button
                    className="product-card-wishlist"
                    onClick={(e) => toggleWishlist(e, product._id)}
                    title={wishlistIds.has(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    {wishlistIds.has(product._id) ? <HiHeart style={{ color: "var(--rose)" }} /> : <HiOutlineHeart />}
                  </button>
                </div>
                <div className="product-card-body">
                  <h3>{product.name}</h3>
                  <div className="product-card-fabric">{product.fabricType}</div>
                  <div className="product-card-price">
                    Rs. {product.price?.toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
