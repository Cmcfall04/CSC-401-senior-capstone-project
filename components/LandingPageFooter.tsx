import Link from "next/link";

export default function LandingPageFooter() {
  return (
    <section 
      className="relative min-h-[50vh] flex flex-col items-center justify-center text-white bg-cover bg-center"
      style={{
        backgroundImage: "url('/Landing_Page_footer.webp')",
        backgroundSize: '100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Contrast overlay */}
      <div className="absolute inset-0 bg-black/35" />
      
      {/* Footer Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <h2 
          className="text-4xl md:text-5xl font-extrabold mb-6 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Join the Community
        </h2>
        <p 
          className="text-lg md:text-xl mb-8 opacity-95"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Ready to take control of your kitchen, reduce waste, and discover new recipes? 
          Join Smart Pantry today and start your journey to smarter food management.
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition text-lg shadow-lg"
        >
          Sign Up Now
        </Link>
      </div>
    </section>
  );
}

