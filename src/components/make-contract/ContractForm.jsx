import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import { getCookie } from "../../utils/cookieHelper";

const ContractForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    marketItemId: localStorage.getItem("marketItemId"),
    buyerName: "",
    farmerName: "",
    crop: "",
    price: "",
    agreementDate: "",
    deliveryDate: "",
    terms: "",
    buyerSignature: "",
  });
  const [errors, setErrors] = useState({
    price: false,
    agreementDate: false,
    deliveryDate: false,
    signature: false,
  });
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const API_BASE_URL = "http://localhost:3000/api/v1";

  // Check token validity
  const checkToken = async () => {
    try {
      const token = getCookie("chattu-token");
      console.log("Checking token:", token || "No token found");
      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
      const { data } = await axios.get(`${API_BASE_URL}/user/me`, config);
      console.log("Token check successful:", data);
      return true;
    } catch (err) {
      console.error(
        "Token check failed:",
        err.response?.status,
        err.response?.data,
        err.message
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
    console.log("Initiating API call:", method, url);
    console.log("All cookies in apiCallWithRetry:", document.cookie);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        };
        console.log(`API call attempt ${attempt}: ${method} ${url}`, {
          data,
          config,
        });

        let response;
        if (method === "get" || method === "delete") {
          response = await axios[method](url, config);
        } else {
          response = await axios[method](url, data, config);
        }

        console.log(`API call successful: ${method} ${url}`, response.data);
        return response;
      } catch (err) {
        console.error(
          `API call failed (attempt ${attempt}): ${method} ${url}`,
          {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          }
        );
        if (err.response?.status === 401) {
          throw new Error("Unauthorized: Invalid or missing token");
        }
        if (err.response?.status === 404) {
          throw new Error(`Endpoint not found: ${url}`);
        }
        if (err.response?.status === 400) {
          throw new Error(
            `Invalid request: ${
              err.response?.data?.message || "Check input data"
            }`
          );
        }
        if (attempt === retries) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Prefill form and check auth
  useEffect(() => {
    setIsMounted(true);
    const token = getCookie("chattu-token");
    console.log("Initial token check:", token || "No token found");
    console.log("All cookies on mount:", document.cookie);
    console.log("Redux user:", user);

    if (!user) {
      console.log("No user in Redux, redirecting to login");
      toast.error("Please log in to access the contract form.");
      navigate("/login");
      return;
    }

    const verifyToken = async () => {
      const isValid = await checkToken();
      if (!isValid) {
        console.log("Token invalid or missing, redirecting to login");
        toast.error("Session expired. Please log in again.");
        navigate("/login");
      }
    };
    verifyToken();

    const selectedItem = location.state?.selectedItem;
    if (selectedItem) {
      console.log("Prefilling form with selectedItem:", selectedItem);
      setFormData((prev) => ({
        ...prev,
        farmerName: selectedItem.username || "",
        crop: selectedItem.crop || "",
        price: selectedItem.price || "",
      }));
    }
    setFormData((prev) => ({
      ...prev,
      buyerName: user?.username || user?.name || "",
    }));

    // Set min date for agreementDate
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("agreementDate")?.setAttribute("min", today);
  }, [location.state, user, navigate]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, buyerSignature: reader.result }));
      };
      reader.onerror = () => {
        toast.error("Error reading signature file. Please try again.");
      };
      reader.readAsDataURL(file);
    } else {
      setErrors((prev) => ({ ...prev, signature: true }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMounted) {
      console.log("Component not mounted, aborting submission");
      return;
    }

    const {
      buyerName,
      farmerName,
      crop,
      price,
      agreementDate,
      deliveryDate,
      terms,
      buyerSignature,
      marketItemId,
    } = formData;

    // Reset errors
    setErrors({
      price: false,
      agreementDate: false,
      deliveryDate: false,
      signature: false,
    });

    // Validation
    if (!buyerName || !farmerName || !crop || !terms) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setErrors((prev) => ({ ...prev, price: true }));
      toast.error("Price must be a positive number.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (!agreementDate || agreementDate < today) {
      setErrors((prev) => ({ ...prev, agreementDate: true }));
      toast.error("Agreement date cannot be in the past.");
      return;
    }
    if (!deliveryDate || deliveryDate <= agreementDate) {
      setErrors((prev) => ({ ...prev, deliveryDate: true }));
      toast.error("Delivery date must be after agreement date.");
      return;
    }
    if (!buyerSignature) {
      setErrors((prev) => ({ ...prev, signature: true }));
      toast.error("Signature is required.");
      return;
    }
    if (!user) {
      console.log("No user in Redux during submission, redirecting to login");
      toast.error("You must be logged in to create a contract.");
      navigate("/login");

      return;
    }
    // Create contract
    try {
      setLoading(true);
      const contractData = {
        farmerUsername: farmerName,
        crop,
        marketItemId,
        price: parseFloat(price),
        agreementDate: new Date(agreementDate).toISOString(),
        deliveryDate: new Date(deliveryDate).toISOString(),
        terms,
        buyerSignature,
      };
      console.log("Creating contract with data:", contractData);
      const { data } = await apiCallWithRetry(
        "post",
        `${API_BASE_URL}/contracts`,
        contractData
      );
      console.log("Contract created:", data);
      toast.success(
        "Contract created successfully! Waiting for farmer review..."
      );

      setTimeout(() => navigate(`/`), 1000);
    } catch (err) {
      const errorMsg =
        err.message === "Unauthorized: Invalid or missing token"
          ? "Session expired. Please log in again."
          : err.response?.status === 401
          ? "Unauthorized: Please log in again"
          : err.response?.status === 400
          ? `Invalid data: ${
              err.response?.data?.message || "Check input fields"
            }`
          : err.response?.status === 404
          ? "Contracts endpoint not found. Check backend routes."
          : err.response?.status === 500
          ? err.response?.data?.message?.includes("duplicate key")
            ? "Failed to create contract: Contract number already exists. Please try again."
            : `Server error: ${
                err.response?.data?.message || "Failed to create contract"
              }`
          : err.message === "Failed to fetch"
          ? "Network error: Could not reach the server. Please check if the backend is running."
          : err.response?.data?.message || "Failed to create contract";
      console.error(
        "Create contract error:",
        err.response?.status,
        err.response?.data,
        err.message
      );
      toast.error(errorMsg);
      if (err.response?.status === 401 || err.message.includes("token")) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header
        style={{
          backgroundColor: "#003366",
          color: "white",
          padding: "15px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "24px" }}>
          Ministry of Agriculture and Farmers Welfare
        </h2>
        <p style={{ margin: "5px 0", fontSize: "16px" }}>
          Contract Agreement Portal - Buyer Section
        </p>
      </header>

      <form
        id="contractForm"
        noValidate
        onSubmit={handleSubmit}
        style={{
          maxWidth: "600px",
          margin: "30px auto",
          background: "#fff",
          padding: "25px",
          border: "2px solid #003366",
          borderRadius: "10px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <label
          className="required"
          htmlFor="buyerName"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Buyer Name:
        </label>
        <input
          type="text"
          id="buyerName"
          required
          placeholder="Enter your full name"
          value={formData.buyerName}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        <label
          className="required"
          htmlFor="farmerName"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Farmer Name:
        </label>
        <input
          type="text"
          id="farmerName"
          required
          placeholder="Enter farmer's full name"
          value={formData.farmerName}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        <label
          className="required"
          htmlFor="crop"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Crop:
        </label>
        <input
          type="text"
          id="crop"
          required
          placeholder="e.g., Wheat, Rice"
          value={formData.crop}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        <label
          className="required"
          htmlFor="price"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Price (per kg):
        </label>
        <input
          type="number"
          id="price"
          required
          min="1"
          step="1"
          placeholder="Enter price in ₹"
          value={formData.price}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div
          id="priceError"
          className="error"
          style={{
            color: "#ff4444",
            fontSize: "12px",
            marginTop: "5px",
            display: errors.price ? "block" : "none",
          }}
        >
          Price must be a positive number.
        </div>

        <label
          className="required"
          htmlFor="agreementDate"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Agreement Date:
        </label>
        <input
          type="date"
          id="agreementDate"
          required
          value={formData.agreementDate}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "8px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div
          id="agreementDateError"
          className="error"
          style={{
            color: "#ff4444",
            fontSize: "12px",
            marginTop: "5px",
            display: errors.agreementDate ? "block" : "none",
          }}
        >
          Agreement date cannot be in the past.
        </div>

        <label
          className="required"
          htmlFor="deliveryDate"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Delivery Date:
        </label>
        <input
          type="date"
          id="deliveryDate"
          required
          value={formData.deliveryDate}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "8px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div
          id="deliveryDateError"
          className="error"
          style={{
            color: "#ff4444",
            fontSize: "12px",
            marginTop: "5px",
            display: errors.deliveryDate ? "block" : "none",
          }}
        >
          Delivery date must be after agreement date.
        </div>

        <label
          className="required"
          htmlFor="terms"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Terms & Conditions:
        </label>
        <textarea
          id="terms"
          rows="5"
          required
          placeholder="Specify payment terms, delivery, etc."
          value={formData.terms}
          onChange={handleChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        <label
          className="required"
          htmlFor="buyerSignature"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Upload Buyer's Signature:
        </label>
        <input
          type="file"
          id="buyerSignature"
          accept="image/*"
          required
          onChange={handleFileChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div
          id="signatureError"
          className="error"
          style={{
            color: "#ff4444",
            fontSize: "12px",
            marginTop: "5px",
            display: errors.signature ? "block" : "none",
          }}
        >
          Please upload a valid image file.
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#003366",
            color: "white",
            padding: "10px 20px",
            marginTop: "20px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: "5px",
            fontSize: "16px",
            width: "100%",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Submitting..." : "Send to Farmer"}
        </button>
      </form>

      <style jsx>{`
        input:invalid:focus,
        textarea:invalid:focus {
          border-color: #ff4444;
          box-shadow: 0 0 3px #ff4444;
        }
        .required::after {
          content: " *";
          color: #ff4444;
        }
        @media (max-width: 600px) {
          form {
            margin: 15px;
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContractForm;
