import React, { useState, useEffect } from "react";
import styles from "./MarketG.module.css";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getCookie } from "../../utils/cookieHelper";

const MarketG = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [marketItems, setMarketItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
// At the top of your file, after imports
const API_BASE_URL = import.meta.env.VITE_SERVER + "/api/v1";
  // Check token validity
  const checkToken = async () => {
    try {
      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("chattu-token")}`,
        },
      };
      const { data } = await axios.get(`${API_BASE_URL}/user/me`, config);
      return true;
    } catch (err) {
      return false;
    }
  };

  // Fetch market items
  useEffect(() => {
    const fetchMarketItems = async () => {
      try {
        setLoading(true);
        const isTokenValid = await checkToken();
        if (!isTokenValid) {
          navigate("/login");
          throw new Error("Unauthorized: Please log in again");
        }
        const { data } = await axios.get(`${API_BASE_URL}/market-items/all`, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("chattu-token")}`,
          },
        });
        setMarketItems(data.marketItems || []);
        setError("");
      } catch (err) {
        const errorMsg =
          err.response?.status === 401
            ? "Unauthorized: Please log in again"
            : err.response?.status === 404
            ? "Market items endpoint not found"
            : err.response?.data?.error || "Failed to load market items";
        setError(errorMsg);
        toast.error(errorMsg);
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMarketItems();
  }, [navigate]);

  const filteredItems = marketItems.filter((item) =>
    item.crop.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (item) => {
    setSelectedItem({
      username: item.userId.username,
      crop: item.crop,
      quantity: item.quantity,
      price: item.price,
      location: item.location || "Not specified",
      harvestDate: item.harvestDate || "Recent",
    });
  };

  const handleChatClick = () => {
    if (user?.username === selectedItem?.username) {
      toast.error("You cannot chat with yourself");
      return;
    }
    navigate("/chat-home", { state: { from: "market-g" } });
  };

  return (
    <div className={styles.marketplace}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Farm Fresh Marketplace</h1>
          <p className={styles.subtitle}>
            Discover the best local produce directly from farmers
          </p>
        </div>
      </header>

      <div className={styles.mainContainer}>
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search for crops (rice, wheat, vegetables...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>
          <div className={styles.resultsCount}>
            {loading ? "Loading..." : `${filteredItems.length} fresh listings`}
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.itemsGrid}>
            {loading ? (
              <div className={styles.loadingGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.itemCardSkeleton}></div>
                ))}
              </div>
            ) : error ? (
              <div className={styles.errorMessage}>{error}</div>
            ) : filteredItems.length === 0 ? (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🌱</div>
                <h3>No crops matching your search</h3>
                <p>Try different keywords or check back later</p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div
                  key={index}
                  className={`${styles.itemCard} ${
                    selectedItem?.username === item.userId.username
                      ? styles.selected
                      : ""
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.itemImage}>
                    {item.crop[0].toUpperCase()}
                  </div>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.cropName}>{item.crop}</h3>
                    <p className={styles.farmerName}>{item.userId.username}</p>
                    <div className={styles.priceTag}>₹{item.price}/kg</div>
                    <div className={styles.itemMeta}>
                      <span>{item.quantity} kg available</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.detailsPanel}>
            {selectedItem ? (
              <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                  <h2>{selectedItem.crop}</h2>
                  <span className={styles.organicBadge}>Organic</span>
                </div>
                <div className={styles.farmerInfo}>
                  <div className={styles.farmerAvatar}>
                    {selectedItem.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedItem.username}</h3>
                    <p className={styles.location}>{selectedItem.location}</p>
                  </div>
                </div>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      Available Quantity
                    </span>
                    <span className={styles.detailValue}>
                      {selectedItem.quantity} kg
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Price</span>
                    <span className={styles.detailValue}>
                      ₹{selectedItem.price}/kg
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Harvest Date</span>
                    <span className={styles.detailValue}>
                      {selectedItem.harvestDate}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Quality</span>
                    <span className={styles.detailValue}>Premium Grade A</span>
                  </div>
                </div>
                <button
                  className={`${styles.actionButton} ${
                    user?.username === selectedItem.username
                      ? styles.disabledButton
                      : ""
                  }`}
                  onClick={handleChatClick}
                  disabled={user?.username === selectedItem.username}
                >
                  {user?.username === selectedItem.username
                    ? "Your Listing"
                    : "Contact Farmer"}
                </button>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <div className={styles.placeholderIcon}>🌻</div>
                <h3>Select a crop</h3>
                <p>Choose an item to view full details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketG;
