import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/clerk-react";

import App          from "./App.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import Site from "./pages/site/Site.jsx";
import { initAnalytics } from "./analytics.js";

initAnalytics();

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CLERK_VALID = CLERK_KEY && !CLERK_KEY.includes("REPLACE_WITH");

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F8F8F7"}}>
      <div style={{width:"32px",height:"32px",border:"3px solid #E6E4E0",borderTopColor:"#0C464B",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!isSignedIn) return <Navigate to="/" replace/>;
  return children;
}

function ProtectedRouteDev({ children }) {
  return children;
}

// Clerk auth pages styled to match the light theme
const authAppearance = {
  variables: {
    colorPrimary: "#0C464B",
    colorBackground: "#F8F8F7",
    colorInputBackground: "#FFFFFF",
    colorText: "#1C1A17",
    borderRadius: "10px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  elements: {
    card: { boxShadow: "0 4px 24px rgba(28,26,23,.08)", border: "1px solid #E6E4E0" },
    headerTitle: { fontFamily: "'Archivo', sans-serif", fontWeight: 700 },
  }
};

function AuthPage({ mode }) {
  return (
    <div style={{minHeight:"100vh",background:"#F8F8F7",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      {mode === "sign-in"
        ? <SignIn appearance={authAppearance} routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/dashboard"/>
        : <SignUp appearance={authAppearance} routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/onboarding"/>
      }
    </div>
  );
}

const PR = CLERK_VALID ? ProtectedRoute : ProtectedRouteDev;

const AppTree = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/"             element={<Site page="home"/>}/>
      <Route path="/features"     element={<Site page="features"/>}/>
      <Route path="/pricing"      element={<Site page="pricing"/>}/>
      <Route path="/integrations" element={<Site page="integrations"/>}/>
      <Route path="/security"     element={<Site page="security"/>}/>
      <Route path="/privacy"      element={<Site page="privacy"/>}/>
      <Route path="/terms"        element={<Site page="terms"/>}/>
      <Route path="/app"          element={<Navigate to="/dashboard" replace/>}/>
      <Route path="/sign-in/*"  element={CLERK_VALID ? <AuthPage mode="sign-in"/> : <Navigate to="/dashboard" replace/>}/>
      <Route path="/sign-up/*"  element={CLERK_VALID ? <AuthPage mode="sign-up"/> : <Navigate to="/dashboard" replace/>}/>
      <Route path="/onboarding" element={<PR><OnboardingPage/></PR>}/>
      <Route path="/dashboard"  element={<PR><App/></PR>}/>
      <Route path="*"           element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {CLERK_VALID
      ? <ClerkProvider publishableKey={CLERK_KEY}><AppTree/></ClerkProvider>
      : <AppTree/>
    }
  </React.StrictMode>
);
