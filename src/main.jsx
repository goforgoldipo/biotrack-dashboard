import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// ── Change this to whatever password you want ──────────────────────────────
const APP_PASSWORD = "lambo";
const SESSION_KEY  = "bt_auth";

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [input, setInput]   = useState("");
  const [shake, setShake]   = useState(false);

  if (unlocked) return children;

  const attempt = () => {
    if (input === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh",
      background: "#050509", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        background: "#0e0e18", border: "1px solid #1e1e2e",
        borderRadius: 16, padding: "40px 48px", textAlign: "center",
        width: 320, animation: shake ? "shake 0.5s ease" : "none",
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
        <div style={{ color: "#f0f0f0", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          BioTrack
        </div>
        <div style={{ color: "#707070", fontSize: 13, marginBottom: 28 }}>
          Enter password to continue
        </div>
        <input
          autoFocus
          type="password"
          value={input}
          placeholder="Password"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            border: "1px solid #2a2a3e", background: "#12121e",
            color: "#f0f0f0", fontSize: 15, outline: "none",
            boxSizing: "border-box", marginBottom: 14,
          }}
        />
        <button
          onClick={attempt}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 8,
            background: "#6c63ff", color: "#fff", fontWeight: 600,
            fontSize: 15, border: "none", cursor: "pointer",
          }}
        >
          Unlock
        </button>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%,60%{transform:translateX(-8px)}
          40%,80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </React.StrictMode>
);
