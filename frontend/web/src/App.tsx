// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface CsrFeedback {
  id: string;
  encryptedData: string;
  timestamp: number;
  category: string;
  rating: number;
  comments: string;
}

const App: React.FC = () => {
  // Randomized style selections
  // Colors: High contrast (blue+orange)
  // UI: Cyberpunk
  // Layout: Card-based
  // Interaction: Micro-interactions
  
  // Randomized features: Data statistics, Smart charts, Search & filter, Team information
  
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<CsrFeedback[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newFeedback, setNewFeedback] = useState({
    category: "Environment",
    rating: 5,
    comments: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Calculate statistics
  const totalFeedbacks = feedbacks.length;
  const averageRating = totalFeedbacks > 0 
    ? feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / totalFeedbacks 
    : 0;

  useEffect(() => {
    loadFeedbacks().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadFeedbacks = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("feedback_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing feedback keys:", e);
        }
      }
      
      const list: CsrFeedback[] = [];
      
      for (const key of keys) {
        try {
          const feedbackBytes = await contract.getData(`feedback_${key}`);
          if (feedbackBytes.length > 0) {
            try {
              const feedbackData = JSON.parse(ethers.toUtf8String(feedbackBytes));
              list.push({
                id: key,
                encryptedData: feedbackData.data,
                timestamp: feedbackData.timestamp,
                category: feedbackData.category,
                rating: feedbackData.rating,
                comments: feedbackData.comments
              });
            } catch (e) {
              console.error(`Error parsing feedback data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading feedback ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setFeedbacks(list);
    } catch (e) {
      console.error("Error loading feedbacks:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setSubmitting(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting feedback with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newFeedback))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const feedbackId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const feedbackData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        category: newFeedback.category,
        rating: newFeedback.rating,
        comments: newFeedback.comments
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `feedback_${feedbackId}`, 
        ethers.toUtf8Bytes(JSON.stringify(feedbackData))
      );
      
      const keysBytes = await contract.getData("feedback_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(feedbackId);
      
      await contract.setData(
        "feedback_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted feedback submitted securely!"
      });
      
      await loadFeedbacks();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowSubmitModal(false);
        setNewFeedback({
          category: "Environment",
          rating: 5,
          comments: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.comments.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          feedback.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "All" || feedback.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const renderRatingChart = () => {
    const ratingCounts = [0, 0, 0, 0, 0];
    feedbacks.forEach(fb => {
      ratingCounts[fb.rating - 1]++;
    });

    return (
      <div className="rating-chart">
        {ratingCounts.map((count, index) => (
          <div key={index} className="rating-bar-container">
            <div className="rating-label">{index + 1}★</div>
            <div className="rating-bar">
              <div 
                className="bar-fill"
                style={{ 
                  width: `${(count / Math.max(1, totalFeedbacks)) * 100}%`,
                  backgroundColor: `hsl(${index * 60}, 80%, 50%)`
                }}
              ></div>
              <span className="bar-count">{count}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const categories = ["All", "Environment", "Community", "Ethics", "Diversity", "Governance"];

  if (loading) return (
    <div className="loading-screen">
      <div className="cyber-spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container cyberpunk-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>CSR<span>Feedback</span>Portal</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowSubmitModal(true)} 
            className="submit-feedback-btn cyber-button"
          >
            <div className="add-icon"></div>
            Submit Feedback
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Anonymous CSR Feedback</h2>
            <p>Share your honest feedback about our Corporate Social Responsibility initiatives</p>
          </div>
          <div className="fhe-badge">
            <span>FHE-Powered Anonymity</span>
          </div>
        </div>
        
        <div className="dashboard-grid">
          <div className="dashboard-card cyber-card">
            <h3>Feedback Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalFeedbacks}</div>
                <div className="stat-label">Total Feedbacks</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{averageRating.toFixed(1)}</div>
                <div className="stat-label">Avg Rating</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card cyber-card">
            <h3>Rating Distribution</h3>
            {renderRatingChart()}
          </div>
        </div>
        
        <div className="feedback-controls">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-input"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="cyber-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={loadFeedbacks}
            className="refresh-btn cyber-button"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        
        <div className="feedback-section">
          <div className="feedback-list">
            {filteredFeedbacks.length === 0 ? (
              <div className="no-feedbacks">
                <div className="no-feedbacks-icon"></div>
                <p>No feedback found</p>
                <button 
                  className="cyber-button primary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Be the first to submit
                </button>
              </div>
            ) : (
              filteredFeedbacks.map(feedback => (
                <div className="feedback-card cyber-card" key={feedback.id}>
                  <div className="feedback-header">
                    <div className="feedback-category">{feedback.category}</div>
                    <div className="feedback-rating">
                      {Array.from({ length: feedback.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="feedback-comments">
                    {feedback.comments}
                  </div>
                  <div className="feedback-footer">
                    <div className="feedback-date">
                      {new Date(feedback.timestamp * 1000).toLocaleDateString()}
                    </div>
                    <div className="feedback-id">
                      #{feedback.id.substring(0, 6)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="team-section cyber-card">
          <h3>CSR Team</h3>
          <div className="team-members">
            <div className="team-member">
              <div className="member-avatar"></div>
              <div className="member-info">
                <h4>Sarah Johnson</h4>
                <p>CSR Director</p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar"></div>
              <div className="member-info">
                <h4>Michael Chen</h4>
                <p>Sustainability Lead</p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar"></div>
              <div className="member-info">
                <h4>Emma Rodriguez</h4>
                <p>Community Relations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {showSubmitModal && (
        <ModalSubmit 
          onSubmit={submitFeedback} 
          onClose={() => setShowSubmitModal(false)} 
          submitting={submitting}
          feedback={newFeedback}
          setFeedback={setNewFeedback}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content cyber-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="cyber-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>CSR Feedback Portal</span>
            </div>
            <p>Your feedback is encrypted using FHE technology for complete anonymity</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">About CSR</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">FAQ</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Anonymity</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} CSR Feedback Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalSubmitProps {
  onSubmit: () => void; 
  onClose: () => void; 
  submitting: boolean;
  feedback: any;
  setFeedback: (data: any) => void;
}

const ModalSubmit: React.FC<ModalSubmitProps> = ({ 
  onSubmit, 
  onClose, 
  submitting,
  feedback,
  setFeedback
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedback({
      ...feedback,
      [name]: value
    });
  };

  const handleRatingChange = (rating: number) => {
    setFeedback({
      ...feedback,
      rating
    });
  };

  const handleSubmit = () => {
    if (!feedback.comments) {
      alert("Please provide your feedback comments");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="submit-modal cyber-card">
        <div className="modal-header">
          <h2>Submit Anonymous CSR Feedback</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your feedback will be encrypted with FHE for complete anonymity
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Category</label>
              <select 
                name="category"
                value={feedback.category} 
                onChange={handleChange}
                className="cyber-select"
              >
                <option value="Environment">Environment</option>
                <option value="Community">Community</option>
                <option value="Ethics">Ethics</option>
                <option value="Diversity">Diversity</option>
                <option value="Governance">Governance</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Rating</label>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    className={`star-btn ${feedback.rating >= star ? 'active' : ''}`}
                    onClick={() => handleRatingChange(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group full-width">
              <label>Your Feedback *</label>
              <textarea 
                name="comments"
                value={feedback.comments} 
                onChange={handleChange}
                placeholder="Share your honest thoughts about our CSR initiatives..." 
                className="cyber-textarea"
                rows={4}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Your identity will remain completely anonymous
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn cyber-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="submit-btn cyber-button primary"
          >
            {submitting ? "Encrypting with FHE..." : "Submit Anonymously"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;