import React from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 12,
    maxWidth: 900,
    width: "100%",
    maxHeight: "90vh",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0"
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: "#1a1a1a"
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "#666",
    padding: 0,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    transition: "background 0.2s"
  },
  content: {
    padding: 24,
    overflowY: "auto",
    flex: 1
  }
};
