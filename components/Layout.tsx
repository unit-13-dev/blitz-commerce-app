
import Header from "@/components/Header";
// import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

const Layout = ({ children, showNavigation = true }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* {showNavigation && <Navigation />} */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
