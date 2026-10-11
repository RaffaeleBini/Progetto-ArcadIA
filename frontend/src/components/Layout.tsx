import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsentBanner from "./CookieConsentBanner";

export default function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <CookieConsentBanner />
    </>
  );
}
