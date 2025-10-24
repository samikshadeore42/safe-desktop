import React, { useEffect, useState } from "react";
import { fetchSafeOverviewData, fetchRecentActivity } from "../services/hyperindex.service";

export default function Dashboard({ safeAddress="0x601778F8fa32298E826a8aBEf1E3b31515626845", chainId = 11155111 }) {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [overviewData, activityData] = await Promise.all([
          fetchSafeOverviewData(safeAddress),
          fetchRecentActivity(safeAddress, 10)
        ]);
        setStats(overviewData);
        setRecentActivity(activityData);
        setLastUpdate(Date.now());
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [safeAddress]);

  if (loading) return <div style={styles.loading}>Loading Safe Dashboard...</div>;
  if (err) return <div style={{ color: "#b00020" }}>Error: {err}</div>;
  if (!stats) return <div>No Safe data found.</div>;

  const executionRate = stats.totalTxs > 0 ? Math.round((stats.executedTxs / stats.totalTxs) * 100) : 0;
  const failureRate = stats.totalTxs > 0 ? Math.round((stats.failedTxs / stats.totalTxs) * 100) : 0;
  const healthScore = calculateHealthScore(executionRate, failureRate, stats.totalTxs);

  return (
    <div style={styles.container}>
      {/* Header with Network Info */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Safe Dashboard</h1>
          <div style={styles.networkInfo}>
            <span style={styles.networkBadge}>🟢 Sepolia Testnet</span>
            <span style={styles.safeAddress}>Safe: {truncateAddress(safeAddress)}</span>
            <span style={styles.lastUpdate}>Last updated: {formatRelativeTime(lastUpdate)}</span>
          </div>
        </div>
        <HealthScoreBadge score={healthScore} />
      </div>

      {/* Circular Gauges */}
      <div style={styles.gaugesRow}>
        <CircularGauge 
          percentage={executionRate} 
          label="Success Rate" 
          color="#28a745"
          subtitle={`${stats.executedTxs} executed`}
        />
        <CircularGauge 
          percentage={100 - failureRate} 
          label="Reliability" 
          color="#007bff"
          subtitle={`${stats.failedTxs} failures`}
        />
        <CircularGauge 
          percentage={healthScore} 
          label="Health Score" 
          color="#ff9800"
          subtitle="Overall status"
        />
      </div>

      {/* Quick Stats Grid with Icons */}
      <div style={styles.statsGrid}>
        <QuickStat icon="📊" label="Total Transactions" value={stats.totalTxs} color="#6c757d" />
        <QuickStat icon="✅" label="Executed" value={stats.executedTxs} color="#28a745" />
        <QuickStat icon="⏳" label="Pending" value={stats.pendingTxs} color="#ffc107" />
        <QuickStat icon="❌" label="Failed" value={stats.failedTxs} color="#dc3545" />
      </div>

      {/* Two Column Layout */}
      <div style={styles.twoColumn}>
        {/* Left: Owners Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Safe Owners 3</h2>
          <div style={styles.ownersGrid}>
            {stats.owners.map((owner, idx) => (
              <OwnerCard key={owner} address={owner} index={idx} />
            ))}
          </div>
          <div style={styles.thresholdInfo}>
            <strong>Threshold:</strong> 2 of 3 signatures required
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Recent Activity</h2>
          <div style={styles.activityFeed}>
            {recentActivity.length > 0 ? (
              recentActivity.map(activity => (
                <ActivityItem key={activity.id} activity={activity} chainId={chainId} />
              ))
            ) : (
              <div style={styles.noActivity}>No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.actions}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.actionButtons}>
          <ActionButton icon="📜" label="View All Transactions" onClick={() => {}} />
          <ActionButton icon="👥" label="Manage Owners" onClick={() => {}} />
          <ActionButton icon="⚙️" label="Settings" onClick={() => {}} />
          <ActionButton icon="📊" label="Export Data" onClick={() => exportData(stats)} />
        </div>
      </div>
    </div>
  );
}

// Health Score Calculator
function calculateHealthScore(successRate, failureRate, totalTxs) {
  if (totalTxs === 0) return 50; // Neutral score for new Safe
  const activityBonus = Math.min(totalTxs / 10, 20); // Up to 20 points for activity
  const successScore = successRate * 0.6; // 60% weight on success
  const reliabilityScore = (100 - failureRate) * 0.2; // 20% weight on low failures
  return Math.min(Math.round(successScore + reliabilityScore + activityBonus), 100);
}

// Health Score Badge Component
function HealthScoreBadge({ score }) {
  const getColor = () => {
    if (score >= 80) return { bg: "#d4edda", text: "#155724", label: "Excellent" };
    if (score >= 60) return { bg: "#fff3cd", text: "#856404", label: "Good" };
    if (score >= 40) return { bg: "#f8d7da", text: "#721c24", label: "Fair" };
    return { bg: "#f8d7da", text: "#721c24", label: "Needs Attention" };
  };
  
  const { bg, text, label } = getColor();
  
  return (
    <div style={{ ...styles.healthBadge, backgroundColor: bg, color: text }}>
      <div style={styles.healthLabel}>{label}</div>
      <div style={styles.healthScore}>{score}/100</div>
    </div>
  );
}

// Circular Gauge with Subtitle
function CircularGauge({ percentage, label, color, subtitle }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  useEffect(() => {
    let current = 0;
    const increment = percentage / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setAnimatedPercentage(percentage);
        clearInterval(timer);
      } else {
        setAnimatedPercentage(Math.round(current));
      }
    }, 20);
    
    return () => clearInterval(timer);
  }, [percentage]);

  const radius = 80;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div style={styles.gaugeContainer}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e0e0e0"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ 
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            strokeLinecap: 'round'
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={styles.gaugeText}>
        <div style={{ ...styles.gaugePercentage, color }}>{animatedPercentage}%</div>
        <div style={styles.gaugeLabel}>{label}</div>
        {subtitle && <div style={styles.gaugeSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

// Quick Stat Component with Icon
function QuickStat({ icon, label, value, color }) {
  return (
    <div style={styles.quickStat}>
      <div style={{ ...styles.quickStatIcon, color }}>{icon}</div>
      <div style={styles.quickStatValue}>{value}</div>
      <div style={styles.quickStatLabel}>{label}</div>
    </div>
  );
}

// Owner Card Component
function OwnerCard({ address, index }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.ownerCard}>
      <div style={styles.ownerAvatar}>{getIdenticon(address)}</div>
      <div style={styles.ownerInfo}>
        <div style={styles.ownerAddress}>{truncateAddress(address)}</div>
        <button onClick={handleCopy} style={styles.copyButton}>
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity, chainId }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case "ExecutionSuccess": return "✅";
      case "ExecutionFailure": return "❌";
      case "AddedOwner": return "👤➕";
      case "RemovedOwner": return "👤➖";
      case "ApproveHash": return "✍️";
      default: return "📝";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "ExecutionSuccess": return "#28a745";
      case "ExecutionFailure": return "#dc3545";
      case "AddedOwner": return "#007bff";
      case "RemovedOwner": return "#ff9800";
      default: return "#6c757d";
    }
  };

  return (
    <div style={styles.activityItem}>
      <div style={{ ...styles.activityIcon, backgroundColor: getActivityColor(activity.type) + "20" }}>
        {getActivityIcon(activity.type)}
      </div>
      <div style={styles.activityDetails}>
        <div style={styles.activityType}>{activity.type}</div>
        <div style={styles.activityMeta}>
          <span>{formatRelativeTime(activity.timestamp * 1000)}</span>
          {activity.txHash && (
            <>
              <span> • </span>
              <a 
                href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.activityLink}
              >
                View on Etherscan →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({ icon, label, onClick }) {
  return (
    <button style={styles.actionButton} onClick={onClick}>
      <span style={styles.actionIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Helper Functions
function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getIdenticon(addr) {
  // Simple color-based identicon
  const colors = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'];
  const index = parseInt(addr.slice(2, 4), 16) % colors.length;
  return colors[index];
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function exportData(stats) {
  const dataStr = JSON.stringify(stats, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `safe-dashboard-${Date.now()}.json`;
  link.click();
}

// Styles
const styles = {
  container: { 
    maxWidth: 1200, 
    margin: "32px auto", 
    padding: 24, 
    fontFamily: "Inter, -apple-system, Arial",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh"
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: 18,
    color: "#666"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    padding: 20,
    background: "white",
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#1a1a1a"
  },
  networkInfo: {
    display: "flex",
    gap: 16,
    marginTop: 8,
    fontSize: 13,
    color: "#666"
  },
  networkBadge: {
    padding: "4px 10px",
    background: "#d4edda",
    color: "#155724",
    borderRadius: 12,
    fontWeight: 500
  },
  safeAddress: {
    fontFamily: "monospace",
    background: "#f0f0f0",
    padding: "4px 8px",
    borderRadius: 4
  },
  lastUpdate: {
    color: "#999",
    fontStyle: "italic"
  },
  healthBadge: {
    padding: "12px 20px",
    borderRadius: 12,
    textAlign: "center",
    minWidth: 120
  },
  healthLabel: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4
  },
  healthScore: {
    fontSize: 24,
    fontWeight: 700
  },
  gaugesRow: { 
    display: "flex", 
    justifyContent: "center", 
    gap: 60, 
    marginBottom: 40,
    padding: "30px 0",
    background: "white",
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  gaugeContainer: { 
    position: "relative", 
    display: "inline-block"
  },
  gaugeText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center"
  },
  gaugePercentage: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 1
  },
  gaugeLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    fontWeight: 500
  },
  gaugeSubtitle: {
    fontSize: 11,
    color: "#999",
    marginTop: 2
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 30
  },
  quickStat: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
    cursor: "pointer"
  },
  quickStatIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 4
  },
  quickStatLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: 500
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 30
  },
  section: {
    background: "white",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: 18,
    fontWeight: 600,
    color: "#1a1a1a"
  },
  ownersGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  ownerCard: {
    display: "flex",
    alignItems: "center",
    padding: 12,
    background: "#f8f9fa",
    borderRadius: 8,
    gap: 12
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20
  },
  ownerInfo: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ownerAddress: {
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: 500
  },
  copyButton: {
    padding: "4px 12px",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 500
  },
  thresholdInfo: {
    marginTop: 16,
    padding: 12,
    background: "#fff3cd",
    borderRadius: 8,
    fontSize: 14,
    color: "#856404"
  },
  activityFeed: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: 400,
    overflowY: "auto"
  },
  activityItem: {
    display: "flex",
    gap: 12,
    padding: 12,
    background: "#f8f9fa",
    borderRadius: 8,
    alignItems: "flex-start"
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0
  },
  activityDetails: {
    flex: 1
  },
  activityType: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: 4
  },
  activityMeta: {
    fontSize: 12,
    color: "#666"
  },
  activityLink: {
    color: "#007bff",
    textDecoration: "none",
    fontWeight: 500
  },
  noActivity: {
    textAlign: "center",
    padding: 40,
    color: "#999",
    fontSize: 14
  },
  actions: {
    background: "white",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  actionButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12
  },
  actionButton: {
    padding: "12px 20px",
    background: "#f8f9fa",
    border: "2px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center"
  },
  actionIcon: {
    fontSize: 18
  }
};
