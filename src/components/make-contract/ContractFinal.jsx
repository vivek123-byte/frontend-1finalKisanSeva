import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import { getCookie } from "../../utils/cookieHelper";
import { jsPDF } from "jspdf";
import html2pdf from "html2pdf.js";

const ContractFinal = () => {
  // State and hooks
  const location = useLocation();
  const { contractId } = location.state || {};
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [contract, setContract] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

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

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const isTokenValid = await checkToken();
        if (!isTokenValid) {
          navigate("/login");
          return;
        }
        const { data } = await apiCallWithRetry(
          "get",
          `${API_BASE_URL}/contracts/notifications`
        );
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error("Fetch notifications error:", err.response?.data);
        // Fallback to empty notifications if fetch fails
        setNotifications([]);
      }
    };

    if (contractId) {
      fetchContract();
      fetchNotifications();
    } else {
      setLoading(false);
      toast.error("No contract ID provided");
    }
  }, [contractId, navigate, user]);

  // Download contract as PDF
  const handleDownload = () => {
    const element = containerRef.current;
    if (!element) {
      toast.error("Failed to generate PDF: Content not found");
      return;
    }

    // Temporarily hide buttons
    const buttons = element.querySelector(".buttons");
    if (buttons) buttons.style.display = "none";

    // Configure html2pdf
    const opt = {
      margin: [10, 10, 10, 10], // mm
      filename: `contract_${contract.contractNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    // Generate PDF
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        // Restore buttons
        if (buttons) buttons.style.display = "block";
      })
      .catch((err) => {
        toast.error("Failed to generate PDF");
        console.error("PDF generation error:", err);
        if (buttons) buttons.style.display = "block";
      });
  };

  // Initiate payment
  const handlePayment = async () => {
    try {
      setLoading(true);
      const { data } = await apiCallWithRetry(
        "post",
        `${API_BASE_URL}/contracts/${contractId}/payment`
      );
      const options = {
        key: data.order.key,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verifyData = {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            };
            await apiCallWithRetry(
              "post",
              `${API_BASE_URL}/contracts/${contractId}/verify-payment`,
              verifyData
            );
            toast.success("Payment successful!");
            navigate(`/contract-final/${contractId}`);
          } catch (err) {
            toast.error("Payment verification failed.");
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  // Check if notification for this contract is unread
  const isNotificationUnread = notifications.some(
    (notification) =>
      notification.contractId?._id === contractId &&
      notification.userId === user?._id &&
      notification.role === "buyer" &&
      !notification.read
  );

  // Loading and error states
  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "12pt",
        }}
      >
        Loading...
      </div>
    );
  }
  if (!contract) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "12pt",
        }}
      >
        Contract not found
      </div>
    );
  }

  const paymentDue = contract.paymentDeadline
    ? new Date(contract.paymentDeadline).toLocaleDateString()
    : "N/A";

  // Main render
  return (
    <div>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#003366",
          color: "white",
          padding: "15px",
          textAlign: "center",
          borderBottom: "3px solid #00264d",
        }}
      >
        <h2 style={{ fontSize: "20pt", margin: 0 }}>Government of India</h2>
        <p style={{ fontSize: "12pt", margin: "3px 0" }}>
          <strong>Ministry of Agriculture and Farmers Welfare</strong>
        </p>
      </header>

      {/* Container */}
      <div
        ref={containerRef}
        className="container"
        style={{
          width: "85%",
          maxWidth: "800px",
          margin: "20px auto",
          backgroundColor: "white",
          padding: "20px",
          border: "1px solid #ddd",
          boxShadow: "0 0 5px rgba(0,0,0,0.1)",
        }}
      >
        {/* Title */}
        <div
          className="title"
          style={{
            fontSize: "18pt",
            margin: "0 0 15px",
            fontWeight: "bold",
            textAlign: "center",
            textDecoration: "underline",
          }}
        >
          Farmers' Crop Sale Agreement Contract
        </div>

        {/* Details */}
        <div className="details" style={{ fontSize: "12pt" }}>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Contract Number:</strong> {contract.contractNumber}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Buyer:</strong> {contract.buyerUsername}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Farmer:</strong> {contract.farmerUsername}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Crop:</strong> {contract.crop}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Price:</strong> ₹{contract.price} / kg
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Agreement Date:</strong> {contract.agreementDate}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Delivery Date:</strong> {contract.deliveryDate}
          </p>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            <strong>Terms & Conditions:</strong> {contract.terms}
          </p>
          {contract.status === "AWAITING_PAYMENT" && (
            <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
              <strong>Payment Due By:</strong> {paymentDue}
            </p>
          )}
        </div>

        {/* Clause 1 */}
        <div
          className="legal-clause"
          style={{
            margin: "15px 0",
            paddingLeft: "10px",
            borderLeft: "3px solid #003366",
            fontSize: "12pt",
          }}
        >
          <h4 style={{ margin: "0 0 5px", textDecoration: "underline" }}>
            Clause 1: Purpose of the Agreement
          </h4>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            This agreement, effective as of {contract.agreementDate}, is made
            between the Buyer and the Farmer for the purchase and sale of the
            crop named <strong>{contract.crop}</strong>. Both parties agree to
            adhere to the terms and conditions listed in this agreement.
          </p>
        </div>

        {/* Clause 2 */}
        <div
          className="legal-clause"
          style={{
            margin: "15px 0",
            paddingLeft: "10px",
            borderLeft: "3px solid #003366",
            fontSize: "12pt",
          }}
        >
          <h4 style={{ margin: "0 0 5px", textDecoration: "underline" }}>
            Clause 2: Delivery and Payment
          </h4>
          <p style={{ margin: "8px 0", lineHeight: 1.4 }}>
            The Buyer agrees to make the payment of ₹{contract.price} per
            quintal within 15 days after receiving the crop. The Farmer agrees
            to deliver the crop by {contract.deliveryDate}.
          </p>
        </div>

        {/* Signatures */}
        <div
          className="signature-section"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            margin: "20px 0",
            padding: "15px",
            minHeight: "120px",
            gap: "20px",
            fontSize: "10pt",
          }}
        >
          <div
            className="signature-block"
            style={{
              flex: "1 1 40%",
              textAlign: "center",
              minWidth: "200px",
            }}
          >
            <h4 style={{ margin: "0 0 8px" }}>Buyer's Signature</h4>
            <div
              style={{
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={contract.buyerSignature}
                alt="Buyer Signature"
                style={{
                  maxWidth: "150px",
                  maxHeight: "50px",
                  objectFit: "contain",
                }}
              />
            </div>
            <p style={{ margin: "8px 0 0" }}>✔ Verified by the Buyer</p>
          </div>
          {contract.farmerSignature && (
            <div
              className="signature-block"
              style={{
                flex: "1 1 40%",
                textAlign: "center",
                minWidth: "200px",
              }}
            >
              <h4 style={{ margin: "0 0 8px" }}>Farmer's Signature</h4>
              <div
                style={{
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={contract.farmerSignature}
                  alt="Farmer Signature"
                  style={{
                    maxWidth: "150px",
                    maxHeight: "50px",
                    objectFit: "contain",
                  }}
                />
              </div>
              <p style={{ margin: "8px 0 0" }}>✔ Verified by the Farmer</p>
            </div>
          )}
        </div>

        {/* Approved */}
        <div
          className="approved"
          style={{
            margin: "15px 0",
            fontSize: "14pt",
            color: "green",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Contract Approved and Finalized
        </div>

        {/* Buttons */}
        <div
          className="buttons"
          style={{ textAlign: "center", margin: "15px 0" }}
        >
          <button
            onClick={() => window.print()}
            disabled={loading}
            style={{
              backgroundColor: "#003366",
              color: "white",
              padding: "8px 15px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              borderRadius: "3px",
              fontSize: "10pt",
              marginRight: "10px",
            }}
          >
            Print Contract
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            style={{
              backgroundColor: "#003366",
              color: "white",
              padding: "8px 15px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              borderRadius: "3px",
              fontSize: "10pt",
            }}
          >
            Download Contract
          </button>
          {contract.status === "AWAITING_PAYMENT" &&
            contract.buyerId === user?._id &&
            isNotificationUnread && (
              <button
                onClick={() =>
                  navigate("/contract-payment", { state: { contractId } })
                }
                disabled={loading}
                style={{
                  backgroundColor: "#003366",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  borderRadius: "3px",
                  fontSize: "10pt",
                  marginLeft: "10px",
                }}
              >
                {loading ? "Processing..." : "Make Payment"}
              </button>
            )}
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#003366",
          color: "white",
          textAlign: "center",
          padding: "8px",
          fontSize: "10pt",
        }}
      >
        <div
          className="seal"
          style={{
            width: "50px",
            height: "50px",
            border: "2px solid #003366",
            borderRadius: "50%",
            backgroundColor: "#fff",
            margin: "5px auto",
          }}
        ></div>
        <p>
          © 2025 Ministry of Agriculture and Farmers Welfare, Government of
          India
        </p>
      </footer>

      {/* Global styles */}
      <style jsx>{`
        body {
          font-family: "Times New Roman", Times, serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
          font-size: 12pt;
        }
        .container p {
          margin: 8px 0;
          lineheight: 1.4;
        }
        button:hover:not(:disabled) {
          background-color: #1a237e;
        }
        .signature-img {
          display: block;
        }
        @media print {
          .buttons,
          footer {
            display: none;
          }
          body {
            background: white;
          }
          .container {
            margin: 0;
            box-shadow: none;
            border: none;
            width: 100%;
          }
          .signature-img {
            max-width: 150px;
            max-height: 50px;
            transform: none;
          }
          .signature-block {
            padding-bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContractFinal;
