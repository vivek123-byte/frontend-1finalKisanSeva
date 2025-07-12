import React, { useState, useEffect } from "react";
import "./style.css";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getCookie } from "../../utils/cookieHelper";
import { io } from "socket.io-client";
import cropImage from "./image.png";

const FarmerDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [marketItems, setMarketItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [popupText, setPopupText] = useState("");
  const [newItem, setNewItem] = useState({ crop: "", quantity: "", price: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

// At the top of your file, after imports
const API_BASE_URL = import.meta.env.VITE_SERVER + "/api/v1";
  // Initialize Socket.IO connection for real-time notifications
  useEffect(() => {
    const socket = io("import.meta.env.VITE_SERVER", {
      auth: { token: getCookie("chattu-token") },
    });

    socket.on("NEW_CONTRACT", ({ contractId, message, role }) => {
      if (user?._id && role === "farmer") {
        setNotifications((prev) => [
          {
            _id: Date.now().toString(),
            message,
            userId: user._id,
            role: "farmer",
            contractId: { _id: contractId, status: "PENDING_FARMER" },
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        toast.success(message);
      }
    });

    return () => socket.disconnect();
  }, [user]);

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
          `${API_BASE_URL}/market-items`
        );
        console.log("Market items response:", data);
        setMarketItems(data.marketItems || []);
        setError("");
      } catch (err) {
        const errorMsg =
          err.response?.status === 401
            ? "Unauthorized: Please log in again"
            : err.response?.status === 404
            ? "Market items endpoint not found (404). Check backend routes."
            : err.response?.data?.error ||
              err.message ||
              "Failed to load market items";
        console.error(
          "Fetch error details:",
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
    if (user) fetchMarketItems();
  }, [user, navigate]);

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

  // Handle adding new market item
  const handleAddItem = async (e) => {
    e.preventDefault();
    const { crop, quantity, price } = newItem;
    if (!crop || !quantity || !price) {
      setError("All fields are required");
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        crop,
        quantity: parseInt(quantity, 10),
        price: parseInt(price, 10),
      };
      console.log("POST payload:", payload);
      const { data } = await apiCallWithRetry(
        "post",
        `${API_BASE_URL}/market-items`,
        payload
      );
      setMarketItems([...marketItems, data.marketItem]);
      setNewItem({ crop: "", quantity: "", price: "" });
      setError("");
      toast.success("Item added successfully");
    } catch (err) {
      const errorMsg =
        err.response?.status === 401
          ? "Unauthorized: Please log in again"
          : err.response?.status === 400
          ? `Invalid data: ${err.response?.data?.error || "Check input fields"}`
          : err.response?.data?.error || "Failed to add item";
      console.error(
        "Add item error:",
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

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiCallWithRetry(
        "patch",
        `${API_BASE_URL}/contracts/notifications/${notificationId}/read`
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Mark as read error:", err.response?.data);
      toast.error("Failed to mark notification as read");
    }
  };

  // Render the notifications section
  const renderNotifications = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return <div>No notifications</div>;
    }

    // Filter notifications for the current farmer with role "farmer"
    const farmerNotifications = notifications.filter(
      (notification) =>
        notification?.userId === user?._id && notification?.role === "farmer"
    );

    if (farmerNotifications.length === 0) {
      return <div>No notifications</div>;
    }

    return farmerNotifications
      .filter((notification) => notification?.contractId?._id)
      .map((notification) => {
        const contractStatus = notification.contractId?.status;
        const isPending = contractStatus === "PENDING_FARMER";
        return (
          <div
            key={notification._id}
            className={`notification-card ${
              notification.read ? "read" : "unread"
            }`}
          >
            <p>{notification.message}</p>
            <div className="notification-actions">
              <button
                onClick={() =>
                  navigate(isPending ? "/farmer-review" : "/contract-final", {
                    state: {
                      contractId: notification.contractId._id,
                    },
                  })
                }
              >
                Review Contract
              </button>
              {!notification.read && (
                <button onClick={() => handleMarkAsRead(notification._id)}>
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        );
      });
  };

  const handleSectionChange = (section) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Section Change: ${section}`);
    setActiveSection(section);
  };

  const handleClosePopup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Close Popup Clicked");
    setPopupText("");
  };

  const handleChatClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Chat Button Clicked");
    navigate("/chat-home", { state: { from: "farmer-dashboard" } });
  };
  const handleHomeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Home Button Clicked");
    navigate("/", { state: { from: "farmer-dashboard" } });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        const uniqueCrops = [...new Set(marketItems.map((item) => item.crop))]
          .length;
        const totalContracts = notifications.length;
        const marketReach = marketItems.length * 50; // Mock: Replace with API if available
        return (
          <div id="dashboard" className="section active-section">
            <h2>Overview</h2>
            <div className="stats">
              <div
                className="stat"
                onClick={() => {
                  console.log("Total Contracts Clicked");
                  setPopupText(`Total Contracts: ${totalContracts}`);
                }}
                role="button"
                tabIndex={0}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  setPopupText(`Total Contracts: ${totalContracts}`)
                }
                aria-label="Total Contracts"
                style={{ zIndex: 1 }}
              >
                Total Contracts
                <br />
                <strong>{totalContracts}</strong>
              </div>
              <div
                className="stat"
                onClick={() => {
                  console.log("Market Reach Clicked");
                  setPopupText(
                    `Market Reach: ${marketReach} users viewed your items`
                  );
                }}
                role="button"
                tabIndex={0}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  setPopupText(
                    `Market Reach: ${marketReach} users viewed your items`
                  )
                }
                aria-label="Market Reach"
                style={{ zIndex: 1 }}
              >
                Market Reach
                <br />
                <strong>{marketReach}</strong>
              </div>
              <div
                className="stat"
                onClick={() => {
                  console.log("Active Crops Clicked");
                  setPopupText(`Active Crops: ${uniqueCrops}`);
                }}
                role="button"
                tabIndex={0}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  setPopupText(`Active Crops: ${uniqueCrops}`)
                }
                aria-label="Active Crops"
                style={{ zIndex: 1 }}
              >
                Active Crops
                <br />
                <strong>{uniqueCrops}</strong>
              </div>
            </div>
          </div>
        );

      case "market":
        return (
          <div id="market" className="section">
            <h2>Market Status</h2>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : marketItems.length === 0 ? (
              <div>No items in market</div>
            ) : (
              <div className="card-list">
                {marketItems.map((item, idx) => (
                  <div key={idx} className="card">
                    <img className="cropImage" src={cropImage} alt="cropImg" />

                    <h4>{item.crop}</h4>
                    <p>
                      {item.quantity}kg @ ₹{item.price}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "addItem":
        return (
          <div id="addItem" className="section">
            <h2>Add Item</h2>
            {error && <div className="error">{error}</div>}
            <input
              type="text"
              value={newItem.crop}
              onChange={(e) => setNewItem({ ...newItem, crop: e.target.value })}
              placeholder="Crop Name"
              aria-label="Crop Name"
              disabled={loading}
            />
            <input
              type="number"
              value={newItem.quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, quantity: e.target.value })
              }
              placeholder="Quantity (kg)"
              aria-label="Quantity"
              disabled={loading}
            />
            <input
              type="number"
              value={newItem.price}
              onChange={(e) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
              placeholder="Price (₹)"
              aria-label="Price"
              disabled={loading}
            />
            <button
              onClick={handleAddItem}
              aria-label="Add Item"
              style={{ zIndex: 1 }}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        );

      case "notifications":
        return (
          <div id="notifications" className="section">
            <h2>Notifications</h2>
            {renderNotifications()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="farmer-dashboard">
      <div className="body">
        <div className="sidebar">
          {user ? (
            <div
              className="username"
              aria-label={`Logged in as ${
                user.username || user.name || "User"
              }`}
            >
              {user.username || user.name || "User"}
            </div>
          ) : null}
          <h1 id="dashboardTitle">🌾 Farmer Dashboard</h1>
          <button
            onClick={handleSectionChange("dashboard")}
            aria-label="Dashboard"
            style={{ zIndex: 1 }}
          >
            Dashboard
          </button>
          <button
            onClick={handleSectionChange("market")}
            aria-label="Market Status"
            style={{ zIndex: 1 }}
          >
            Market Status
          </button>
          <button
            onClick={handleSectionChange("addItem")}
            aria-label="Add Item"
            style={{ zIndex: 1 }}
          >
            Add Item
          </button>
          <button
            onClick={handleSectionChange("notifications")}
            aria-label="Notifications"
            style={{ zIndex: 1 }}
          >
            Notifications
          </button>
          {user ? (
            <button
              className="btn1"
              onClick={handleChatClick}
              aria-label="Go to Chat"
              style={{ zIndex: 1 }}
            >
              Chat
            </button>
          ) : null}
          <button
            className="btn1"
            onClick={handleHomeClick}
            aria-label="Home"
            style={{ zIndex: 1 }}
          >
            Home
          </button>
        </div>

        <div className="main">
          {renderSection()}
          {popupText && (
            <div className="popup-overlay">
              <div className="popup">
                <div>{popupText}</div>
                <button
                  onClick={handleClosePopup}
                  aria-label="Close Popup"
                  style={{ zIndex: 2 }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
