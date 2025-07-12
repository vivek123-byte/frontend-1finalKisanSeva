import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useSelector } from "react-redux";
import { getCookie } from "../../utils/cookieHelper";
import GooglePayIcon from "./google-pay_6124998.png";
import PhonePeIcon from "./PhonePe-Logo.wine.svg";
import PaytmIcon from "./Paytm-Logo.wine.svg";
import BhimIcon from "./icons8-bhim-upi-100.png";

const FarmerPaymentPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { contractId } = location.state || {};
  const { user } = useSelector((state) => state.auth);
  const [contract, setContract] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const API_BASE_URL = "http://localhost:3000/api/v1";

  const UPI_APPS = [
    {
      id: "googlepay",
      name: "Google Pay",
      icon: GooglePayIcon,
      url: "https://pay.google.com/",
    },
    {
      id: "phonepe",
      name: "PhonePe",
      icon: PhonePeIcon,
      url: "https://www.phonepe.com/",
    },
    {
      id: "paytm",
      name: "Paytm",
      icon: PaytmIcon,
      url: "https://paytm.com/",
    },
    {
      id: "bhim",
      name: "BHIM UPI",
      icon: BhimIcon,
      url: "https://www.bhimupi.org.in/",
    },
  ];

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${API_BASE_URL}/contracts/${contractId}`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${getCookie("chattu-token")}`,
            },
          }
        );
        setContract(data.contract);
      } catch (err) {
        toast.error("Failed to load contract details");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    if (contractId) fetchContract();
  }, [contractId, navigate]);

  const initiatePayment = (app) => {
    // Open payment app in new tab
    window.open(app.url, "_blank");
    setSelectedApp(app);
    setShowConfirmation(true);
  };

  const confirmPayment = (confirmed) => {
    setShowConfirmation(false);

    if (!confirmed) {
      toast("You can complete the payment later", { icon: "ℹ️" });
      return;
    }

    // Simulate payment processing
    setLoading(true);
    setTimeout(() => {
      const govRef = `PAY${Date.now()}`;
      setTransactionId(govRef);

      const paymentRecord = {
        contractId,
        amount: contract.price,
        paymentMethod: "UPI",
        transactionId: govRef,
        status: "completed",
        timestamp: new Date().toISOString(),
        farmerId: contract.farmerId,
      };

      // Store in localStorage (simulated)
      const payments = JSON.parse(
        localStorage.getItem("farmerPayments") || "[]"
      );
      localStorage.setItem(
        "farmerPayments",
        JSON.stringify([...payments, paymentRecord])
      );

      setPaymentSuccess(true);
      setLoading(false);

      // Navigate to buyer dashboard after successful payment
      navigate("/buyer-dashboard");
    }, 1000);
  };

  const handleChatWithFarmer = () => {
    navigate("/chat-home", {
      state: {
        recipientId: contract.farmerId,
        recipientName: contract.farmerUsername,
        from: "payment-page",
      },
    });
  };

  if (!contractId) {
    return (
      <div className="payment-error-screen">
        <div className="government-header">
          <h2>Government of India</h2>
          <p>Ministry of Agriculture and Farmers Welfare</p>
        </div>
        <div className="error-content">
          <h3>No Contract Specified</h3>
          <p>Please initiate payment from a valid contract.</p>
          <button onClick={() => navigate("/contracts")}>
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  if (loading && !contract) {
    return (
      <div className="payment-loading-screen">
        <div className="government-header">
          <h2>Government of India</h2>
          <p>Ministry of Agriculture and Farmers Welfare</p>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="payment-error-screen">
        <div className="government-header">
          <h2>Government of India</h2>
          <p>Ministry of Agriculture and Farmers Welfare</p>
        </div>
        <div className="error-content">
          <h3>Contract Not Found</h3>
          <p>The requested contract could not be loaded.</p>
          <button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-screen">
      <div className="government-header">
        <h2>Government of India</h2>
        <p>Ministry of Agriculture and Farmers Welfare</p>
      </div>

      <div className="payment-container">
        <div className="payment-header">
          <h3>Direct Payment to Farmer</h3>
          <p>Make secure payment to {contract.farmerUsername}</p>
        </div>

        <div className="contract-summary">
          <h4>Contract Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Contract Number:</span>
              <span>{contract.contractNumber}</span>
            </div>
            <div className="summary-item">
              <span>Farmer:</span>
              <span>{contract.farmerUsername}</span>
            </div>
            <div className="summary-item">
              <span>Crop:</span>
              <span>{contract.crop}</span>
            </div>
            <div className="summary-item">
              <span>Quantity:</span>
              <span>{contract.quantity} kg</span>
            </div>
            <div className="summary-item">
              <span>Amount Due:</span>
              <span>₹{contract.price}</span>
            </div>
          </div>
        </div>

        <div className="payment-options">
          <h4>Payment Options</h4>

          <button onClick={handleChatWithFarmer} className="chat-farmer-btn">
            Need Farmer's Bank Details? Chat Now
          </button>

          <div className="upi-apps-container">
            <p>Pay via UPI Apps:</p>
            <div className="upi-apps-grid">
              {UPI_APPS.map((app) => (
                <div
                  key={app.id}
                  className="upi-app-card"
                  onClick={() => initiatePayment(app)}
                >
                  <img src={app.icon} alt={app.name} className="app-icon" />
                  <span>{app.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Payment Confirmation</h3>
            <p>Have you completed the payment through {selectedApp.name}?</p>
            <div className="modal-buttons">
              <button
                onClick={() => confirmPayment(false)}
                className="cancel-btn"
              >
                No, I'll pay later
              </button>
              <button
                onClick={() => confirmPayment(true)}
                className="confirm-btn"
              >
                Yes, Payment Done
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing your payment...</p>
        </div>
      )}

      <style jsx>{`
        .payment-screen,
        .payment-error-screen,
        .payment-loading-screen {
          max-width: 800px;
          margin: 0 auto;
          font-family: "Arial", sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
          position: relative;
        }

        .government-header {
          background: #003366;
          color: white;
          padding: 15px;
          text-align: center;
          border-bottom: 3px solid #00264d;
        }

        .government-header h2 {
          font-size: 20pt;
          margin: 0;
        }

        .government-header p {
          font-size: 12pt;
          margin: 3px 0;
        }

        .payment-container {
          background: white;
          padding: 25px;
          margin: 20px;
          border: 1px solid #ddd;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .payment-header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .payment-header h3 {
          color: #2e7d32;
          font-size: 18pt;
          margin-bottom: 5px;
        }

        .contract-summary {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 25px;
        }

        .contract-summary h4 {
          color: #003366;
          margin-top: 0;
          margin-bottom: 15px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #ddd;
        }

        .summary-item span:first-child {
          font-weight: bold;
          color: #555;
        }

        .payment-options {
          margin-top: 30px;
        }

        .payment-options h4 {
          color: #003366;
          margin-bottom: 15px;
        }

        .chat-farmer-btn {
          width: 100%;
          padding: 12px;
          background: #f0f4f8;
          color: #2e7d32;
          border: 1px solid #2e7d32;
          border-radius: 4px;
          margin-bottom: 20px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }

        .chat-farmer-btn:hover {
          background: #e8f5e9;
        }

        .upi-apps-container {
          margin-top: 20px;
        }

        .upi-apps-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }

        .upi-app-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .upi-app-card:hover {
          border-color: #2e7d32;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .app-icon {
          height: 40px;
          margin-bottom: 8px;
          object-fit: contain;
        }

        /* Confirmation Modal */
        .confirmation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 25px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
          text-align: center;
        }

        .modal-content h3 {
          color: #003366;
          margin-top: 0;
        }

        .modal-buttons {
          display: flex;
          gap: 15px;
          margin-top: 20px;
          justify-content: center;
        }

        .modal-buttons button {
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .cancel-btn {
          background: white;
          color: #d32f2f;
          border: 1px solid #d32f2f;
        }

        .confirm-btn {
          background: #2e7d32;
          color: white;
          border: none;
        }

        /* Loading Overlay */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2e7d32;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Error and Loading Screens */
        .error-content,
        .loading-content {
          text-align: center;
          padding: 40px 20px;
          background: white;
          margin: 20px;
          border: 1px solid #ddd;
        }

        .error-content h3,
        .loading-content p {
          color: #2e7d32;
        }

        .error-content button,
        .loading-content button {
          margin-top: 20px;
          padding: 10px 20px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default FarmerPaymentPortal;
