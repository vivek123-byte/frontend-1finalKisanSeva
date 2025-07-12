import React, { useState, useEffect } from "react";
import styles from "./buyerDashboard.module.css";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { getCookie } from "../../utils/cookieHelper";

const BuyerDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [marketItems, setMarketItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const API_BASE_URL = "http://localhost:3000/api/v1";

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
      console.log("Token check successful:", data);
      return true;
    } catch (err) {
      console.error(
        "Token check failed:",
        err.response?.status,
        err.response?.data
      );
      return false;
    }
  };

  // Retry logic for API calls
  const apiCallWithRetry = async (
    method,
    url,
    data = null,
    retries = 3,
    delay = 1000
  ) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("chattu-token")}`,
          },
        };

        let response;
        if (method === "get" || method === "delete") {
          response = await axios[method](url, config);
        } else {
          response = await axios[method](url, data, config);
        }

        return response;
      } catch (err) {
        if (err.response?.status === 404) {
          throw new Error(`Endpoint not found: ${url}`);
        }
        if (attempt === retries) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
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
        const { data } = await apiCallWithRetry(
          "get",
          `${API_BASE_URL}/market-items/all`
        );
        console.log("Market items fetched:", data);
        setMarketItems(data.marketItems || []);
        setError("");
      } catch (err) {
        const errorMsg =
          err.response?.status === 401
            ? "Unauthorized: Please log in again"
            : err.response?.status === 404
            ? "Market items endpoint not found (404). Check backend routes."
            : err.response?.data?.error || "Failed to load market items";
        console.error("Fetch error:", err.response?.status, err.response?.data);
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

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const isTokenValid = await checkToken();
        if (!isTokenValid) {
          navigate("/login");
          throw new Error("Unauthorized: Please log in again");
        }
        const { data } = await apiCallWithRetry(
          "get",
          `${API_BASE_URL}/contracts/notifications`
        );
        console.log("Notifications response:", data);
        setNotifications(data.notifications || []);
        setError("");
      } catch (err) {
        const errorMsg =
          err.response?.status === 401
            ? "Unauthorized: Please log in again"
            : err.response?.status === 404
            ? "Notifications endpoint not found (404). Check backend routes."
            : err.response?.data?.message || "Failed to load notifications";
        console.error(
          "Fetch notifications error:",
          err.response?.status,
          err.response?.data
        );
        setError(errorMsg);
        toast.error(errorMsg);
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchNotifications();
  }, [user, navigate]);

  // Initialize Socket.IO connection for real-time notifications
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      auth: { token: getCookie("chattu-token") },
    });

    socket.on(
      "CONTRACT_ACCEPTED",
      ({ contractId, message, contractStatus, role }) => {
        if (user?._id && role === "buyer") {
          setNotifications((prev) => [
            {
              _id: Date.now().toString(),
              message,
              userId: user._id,
              role: "buyer",
              contractId: { _id: contractId, status: contractStatus },
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          toast.success(message);
        }
      }
    );

    return () => socket.disconnect();
  }, [user]);

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiCallWithRetry(
        "patch",
        `${API_BASE_URL}/contracts/notifications/${notificationId}/read`,
        {}
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Mark as read error:", err.response?.data);
      const errorMsg =
        err.response?.status === 404
          ? "Notification not found"
          : err.response?.status === 403
          ? "Unauthorized action"
          : err.response?.data?.message ||
            "Failed to mark notification as read";
      toast.error(errorMsg);
    }
  };

  const filteredItems = marketItems.filter((item) =>
    item.crop.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (item) => {
    localStorage.setItem("marketItemId", item._id);
    setSelectedItem({
      username: item.userId.username,
      crop: item.crop,
      quantity: item.quantity,
      price: item.price,
    });
  };

  const handleChatClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.username === selectedItem?.username) {
      toast.error("You cannot chat with yourself");
      return;
    }
    navigate("/chat-home", { state: { from: "buyer-dashboard" } });
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/", { state: { from: "buyer-dashboard" } });
  };

  const handleContractClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.username === selectedItem?.username) {
      toast.error("You cannot make a contract with yourself");
      return;
    }
    navigate("/contract-form", { state: { selectedItem } });
  };

  const renderNotifications = () => {
    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return <div className={styles.empty}>No notifications</div>;
    }

    const buyerNotifications = notifications.filter(
      (notification) =>
        notification?.userId === user?._id && notification?.role === "buyer"
    );

    if (buyerNotifications.length === 0) {
      return <div className={styles.empty}>No notifications</div>;
    }

    return buyerNotifications
      .filter((notification) => notification?.contractId?._id)
      .map((notification) => {
        const contractStatus = notification.contractId?.status;
        const isAwaitingPayment = contractStatus === "AWAITING_PAYMENT";
        return (
          <div
            key={notification._id}
            className={`${styles.notificationCard} ${
              notification.read ? styles.read : ""
            }`}
          >
            <p>{notification.message}</p>
            <div className={styles.notificationActions}>
              <button
                onClick={() =>
                  navigate("/contract-final", {
                    state: { contractId: notification.contractId._id },
                  })
                }
                className={styles.actionButton}
              >
                {!notification.read ? "Make Payment" : "View Contract"}
              </button>
              {!notification.read && (
                <button
                  onClick={() => handleMarkAsRead(notification._id)}
                  className={styles.actionButton}
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        );
      });
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Farmer Buyer Portal</h1>
      </header>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sectionToggle}>
            <button
              onClick={() => setActiveSection("dashboard")}
              className={`${styles.toggleButton} ${
                activeSection === "dashboard" ? styles.active : ""
              }`}
            >
              Market Items
            </button>
            <button
              onClick={() => setActiveSection("notifications")}
              className={`${styles.toggleButton} ${
                activeSection === "notifications" ? styles.active : ""
              }`}
            >
              Notifications
            </button>
            <button onClick={handleHomeClick} className={styles.toggleButton}>
              Home
            </button>
          </div>
          {activeSection === "dashboard" && (
            <div className={styles.searchSection}>
              <input
                type="text"
                placeholder="Search crops (e.g., Wheat, Rice)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className={styles.searchInput}
              />
              {loading ? (
                <div className={styles.loading}>Loading...</div>
              ) : error ? (
                <div className={styles.error}>{error}</div>
              ) : filteredItems.length === 0 ? (
                <div className={styles.empty}>No market items found</div>
              ) : (
                <ul className={styles.farmerList}>
                  {filteredItems.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleItemClick(item)}
                      className={styles.farmerItem}
                    >
                      <span>{item.userId.username}</span>
                      <span>{item.crop}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {activeSection === "notifications" && (
            <div className={styles.notificationsSection}>
              {renderNotifications()}
            </div>
          )}
        </aside>
        <main className={styles.content}>
          <h2>Market Item Details</h2>
          <div className={styles.farmerDetails}>
            {selectedItem ? (
              <>
                <h3>{selectedItem.username}</h3>
                <p>
                  <strong>Crop:</strong> {selectedItem.crop}
                </p>
                <p>
                  <strong>Quantity:</strong> {selectedItem.quantity}kg
                </p>
                <p>
                  <strong>Price:</strong> ₹{selectedItem.price}/kg
                </p>
                <div className={styles.buttonGroup}>
                  <button
                    className={`${styles.actionButton} ${
                      user?.username === selectedItem.username
                        ? styles.disabled
                        : ""
                    }`}
                    onClick={handleChatClick}
                    disabled={user?.username === selectedItem.username}
                  >
                    Chat with Farmer
                  </button>
                  <button
                    className={`${styles.actionButton} ${
                      user?.username === selectedItem.username
                        ? styles.disabled
                        : ""
                    }`}
                    onClick={handleContractClick}
                    disabled={user?.username === selectedItem.username}
                  >
                    Make Contract
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.empty}>Select an item to view details.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BuyerDashboard;