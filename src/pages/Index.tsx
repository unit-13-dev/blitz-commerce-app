import Header from "@/components/Header";
import ProductCarousel from "@/components/ProductCarousel";
import Hero from "@/components/Hero";
import VendorHighlights from "@/components/VendorHighlights";
import ShoppingCategories from "@/components/ShoppingCategories";
import GroupsPreview from "@/components/GroupsPreview";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <ProductCarousel />
      <Hero />
      <VendorHighlights />
      <ShoppingCategories />
      <GroupsPreview />
      <Footer />
    </div>
  );
};

export default Index;
