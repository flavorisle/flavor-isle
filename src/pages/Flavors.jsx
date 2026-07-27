import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FlavorMenuAccordion from '@/components/FlavorMenuAccordion';

export default function Flavors() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <FlavorMenuAccordion />
      <Footer />
    </div>
  );
}