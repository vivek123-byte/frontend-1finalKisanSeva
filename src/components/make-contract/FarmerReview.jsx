import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import { getCookie } from "../../utils/cookieHelper";

const FarmerReview = () => {
  const location = useLocation();
  const { contractId } = location.state || {};
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [contract, setContract] = useState(null);
  const [farmerSignature, setFarmerSignature] = useState("");
  const [errors, setErrors] = useState({ signature: false });
  const [loading, setLoading] = useState(false);

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
      await axios.get(`${API_BASE_URL}/user/me`, config);
      return true;
    } catch (err) {
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

  // Fetch contract details
  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        console.log("I am in fetch");
        const isTokenValid = await checkToken();
        if (!isTokenValid || !user) {
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }
        const { data } = await apiCallWithRetry(
          "get",
          `${API_BASE_URL}/contracts/${contractId}`
        );
        console.log("data of review", data);
        setContract(data.contract);
      } catch (err) {
        const errorMsg =
          err.response?.status === 401
            ? "Unauthorized: Please log in again"
            : err.response?.status === 404
            ? "Contract not found"
            : err.response?.data?.message || "Failed to load contract";
        toast.error(errorMsg);
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [contractId, navigate, user]);

  // Handle signature upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFarmerSignature(reader.result);
        setErrors({ signature: false });
      };
      reader.onerror = () => {
        toast.error("Error reading signature file.");
      };
      reader.readAsDataURL(file);
    } else {
      setErrors({ signature: true });
      toast.error("Please upload a valid image file.");
    }
  };

  // Handle contract acceptance
  const handleAccept = async () => {
    if (!farmerSignature) {
      setErrors({ signature: true });
      toast.error("Signature is required.");
      return;
    }

    try {
      setLoading(true);
      await apiCallWithRetry(
        "patch",
        `${API_BASE_URL}/contracts/${contractId}/accept`,
        { farmerSignature }
      );

      // Mark the notification as read
      const { data: notifications } = await apiCallWithRetry(
        "get",
        `${API_BASE_URL}/contracts/notifications`
      );
      const notification = notifications.notifications.find(
        (n) => n.contractId._id === contractId && !n.read
      );
      if (notification) {
        await apiCallWithRetry(
          "patch",
          `${API_BASE_URL}/contracts/notifications/${notification._id}/read`
        );
      }

      toast.success("Contract accepted successfully!");
      navigate(`/contract-final`, {
        state: {
          contractId,
        },
      });
    } catch (err) {
      const errorMsg =
        err.response?.status === 401
          ? "Unauthorized: Please log in again"
          : err.response?.data?.message || "Failed to accept contract";
      toast.error(errorMsg);
      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!contract) return <div>Contract not found</div>;

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
          Contract Review Portal - Farmer Section
        </p>
      </header>

      <div
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
        <h3>Contract Details</h3>
        <p>
          <strong>Contract Number:</strong> {contract.contractNumber}
        </p>
        <p>
          <strong>Buyer:</strong> {contract.buyerUsername}
        </p>
        <p>
          <strong>Farmer:</strong> {contract.farmerUsername}
        </p>
        <p>
          <strong>Crop:</strong> {contract.crop}
        </p>
        <p>
          <strong>Price:</strong> ₹{contract.price}/kg
        </p>
        <p>
          <strong>Agreement Date:</strong> {contract.agreementDate}
        </p>
        <p>
          <strong>Delivery Date:</strong> {contract.deliveryDate}
        </p>
        <p>
          <strong>Terms:</strong> {contract.terms}
        </p>
        <p>
          <strong>Buyer Signature:</strong>
        </p>
        <img
          src={contract.buyerSignature}
          alt="Buyer Signature"
          style={{ maxWidth: "200px" }}
        />

        <label
          className="required"
          htmlFor="farmerSignature"
          style={{ fontWeight: "bold", marginTop: "15px", display: "block" }}
        >
          Upload Farmer's Signature:
        </label>
        <input
          type="file"
          id="farmerSignature"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "5px",
            padding: "10px",
            border: "1px solid #888",
            borderRadius: "5px",
            boxSizing: "border-box",
          }}
        />
        <div
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
          onClick={handleAccept}
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
          {loading ? "Accepting..." : "Accept Contract"}
        </button>
      </div>

      <style jsx>{`
        .required::after {
          content: " *";
          color: #ff4444;
        }
        @media (max-width: 600px) {
          div {
            margin: 15px;
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default FarmerReview;
