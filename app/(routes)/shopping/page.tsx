import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ShoppingPage() {
  // Check if user is logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("sp_session");
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Shopping List</h1>
        <p className="text-slate-600">Find nearby stores and manage your shopping list</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shopping Tips Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Shopping Tips</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">📍 Store Locator</h3>
              <p className="text-sm text-slate-600">
                Find the nearest grocery stores to your location. Filter by store type, distance, and ratings.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">💰 Price Comparison</h3>
              <p className="text-sm text-slate-600">
                Compare prices across different stores to find the best deals on your shopping list items.
              </p>
            </div>
          </div>
        </div>

        {/* Google Maps Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Find Nearby Stores</h2>
          <div className="relative w-full h-96 bg-slate-100 rounded-lg overflow-hidden">
            {/* Google Maps Placeholder */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.184133682622!2d-73.98542868459418!3d40.74881797932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469%3A0xd134e199a405a163!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title="Nearby Grocery Stores Map"
            />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600">
              <strong>Note:</strong> This is a placeholder map. In the future, this will show nearby grocery stores based on your location and items needed.
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                Use My Location
              </button>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                Search Stores
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}