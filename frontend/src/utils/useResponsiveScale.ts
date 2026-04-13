import { useEffect, useState } from "react";

export function useResponsiveScale() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;
  const isCompact = windowWidth < 1100;
  const isNarrowDesktop = windowWidth < 1600;
  const isSmallLaptop = windowWidth >= 1100 && windowWidth <= 1512 && windowHeight <= 980;

  return {
    windowWidth,
    windowHeight,
    isMobile,
    isTablet,
    isCompact,
    isNarrowDesktop,
    isSmallLaptop,
    pad: isMobile ? 16 : isTablet ? 24 : 32,
    cardGap: isMobile ? 12 : 16,
    titleSize: isMobile ? 18 : (isNarrowDesktop ? 24 : 26),
    subtitleSize: isNarrowDesktop ? 11 : 12,
    controlFontSize: isNarrowDesktop ? 12 : 13,
    controlHeight: isNarrowDesktop ? 34 : 38,
  };
}
