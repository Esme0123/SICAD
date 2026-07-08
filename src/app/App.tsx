import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { AppRoutes } from "./routes";
import { Providers } from "./providers";
import { SplashScreen } from "@/pages/Splash";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [dark, setDark] = useState(false);

  const handleToggleDark = () => {
    setDark((prev) => !prev);
  };

  return (
    <Providers>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          {showSplash ? (
            <SplashScreen key="splash" onDone={() => setShowSplash(false)} />
          ) : (
            <AppRoutes dark={dark} onToggleDark={handleToggleDark} />
          )}
        </AnimatePresence>
      </BrowserRouter>
    </Providers>
  );
}
