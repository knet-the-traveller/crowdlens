'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

const fetchPhotos = async () => {
  const { data } = await supabase
    .from('event_photos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  setPhotos(data ?? []);
  setLoading(false);
};

  useEffect(() => {
    fetchPhotos();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold text-emerald-400">CrowdLens Gallery</h1>
        <p className="text-xs text-slate-400 mt-1">
          {loading ? 'Loading...' : `${photos.length} photos captured`}
        </p>
        <button
          onClick={fetchPhotos}
          className="mt-3 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
        >
          🔄 Refresh
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-4 max-w-4xl mx-auto">
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid mb-4 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <img
                src={photo.image_url}
                alt={photo.caption}
                className="w-full object-cover"
              />
              <div className="p-3">
                <p className="text-sm text-slate-300 mb-2">{photo.caption}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {photo.tags?.map((tag: string) => (
                    <span key={tag} className="text-xs bg-blue-950 text-blue-400 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{photo.user_email}</span>
                  <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    +{photo.points_awarded} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}