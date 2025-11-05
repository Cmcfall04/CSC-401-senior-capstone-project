// app/layout.tsx
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "SmartPantry",
  description: "Track what you have. Waste less. Save more.",
  icons: {
    icon: "/Green_Basket_Icon.png",
  },
};

// ✅ Make pages scale correctly on phones/tablets/desktops
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* body must be transparent so the home background can show */}
      <body className="min-h-screen bg-transparent antialiased">
        {/* Fixed navbar (client component) */}
        <Navbar />
        {/* Spacer so content isn't hidden under the fixed navbar */}
        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}