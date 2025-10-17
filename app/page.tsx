// app/page.tsx
import Link from "next/link";

export default function MarketingHome() {
  return (
    <main className="relative min-h-screen">
      {/* FULL-PAGE BACKGROUND (fixed) */}
      <div
        className="fixed inset-0 z-0 bg-no-repeat bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/1508666/pexels-photo-1508666.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1')",
          backgroundAttachment: "fixed",
        }}
      />
      {/* Contrast overlay */}
      <div className="fixed inset-0 z-0 bg-black/45 pointer-events-none" />

      {/* CONTENT ABOVE BACKGROUND */}
      <div className="relative z-10">
        {/* HERO — shorter height + content near top */}
        <section className="min-h-[55vh] flex flex-col items-center justify-start text-center px-4 text-white pt-28 md:pt-32">
          <div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
              Smart Pantry
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-95">
              Welcome to food and waste management re-invented.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 rounded-lg bg-white text-green-700 font-medium hover:bg-green-100 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </section>

        {/* ABOUT — pulled slightly upward */}
        <section className="max-w-5xl mx-auto px-4 pt-4 pb-12 -mt-8 md:-mt-12">
          <h2 className="text-3xl font-semibold text-center text-white drop-shadow mb-6">
            About Us
          </h2>
          <div className="mx-auto max-w-3xl bg-white/85 backdrop-blur-md shadow-soft rounded-2xl p-6 text-slate-800">
            Smart Pantry makes everyday food management simpler, smarter, and
            more sustainable. Reduce waste, save money, and enjoy fresher meals —
            powered by barcode scanning, freshness predictions, and recipe
            recommendations.
          </div>
        </section>

        {/* WHAT WE OFFER */}
        <section className="max-w-6xl mx-auto px-4 pb-24 -mt-4">
          <h2 className="text-3xl font-semibold text-center text-white drop-shadow mb-8">
            What We Offer
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft">
              <h3 className="font-semibold mb-2">✨ Smart Scanning</h3>
              <p className="text-slate-600 text-sm">
                Add groceries with barcode scanning or receipt OCR — auto-detect
                product, category, and quantity.
              </p>
            </div>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft">
              <h3 className="font-semibold mb-2">🥬 Freshness Alerts</h3>
              <p className="text-slate-600 text-sm">
                Timely reminders before items expire — shelf-life estimates by
                item type and purchase date.
              </p>
            </div>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft">
              <h3 className="font-semibold mb-2">🧑‍🍳 Recipe Magic</h3>
              <p className="text-slate-600 text-sm">
                Personalized suggestions using what you already have; filter by
                preferences and diet.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 pb-24 text-center">
          <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-soft p-8 text-slate-900">
            <h3 className="text-2xl font-semibold mb-2">Join the Community</h3>
            <p className="text-slate-600 mb-4">
              Create a free account to access your Pantry, Recipes, and Shopping
              List.
            </p>
            <Link
              href="/signup"
              className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition"
            >
              Sign Up
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}