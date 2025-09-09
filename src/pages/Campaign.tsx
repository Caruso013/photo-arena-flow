import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import WatermarkedPhoto from '@/components/WatermarkedPhoto';

interface Photo {
  id: string;
  title?: string;
  watermarked_url: string;
  thumbnail_url?: string;
}

interface CampaignData {
  id: string;
  title: string;
  cover_image_url?: string;
  description?: string;
}

const Campaign = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchData(id);
  }, [id]);

  const fetchData = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data: campaignData, error: campErr } = await supabase
        .from('campaigns')
        .select('id, title, cover_image_url, description')
        .eq('id', campaignId)
        .single();

      if (campErr) throw campErr;
      setCampaign(campaignData as CampaignData);

      const { data: photosData, error: photosErr } = await supabase
        .from('photos')
        .select('id, title, watermarked_url, thumbnail_url')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (photosErr) throw photosErr;
      setPhotos((photosData as Photo[]) || []);
    } catch (error) {
      console.error('Error fetching campaign photos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3">
              <img src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="Logo" className="h-8 md:h-10 w-auto" />
            </Link>
          </div>
        </div>
      </header>

  <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{campaign?.title || 'Evento'}</h1>
              {campaign?.description && <p className="text-muted-foreground mt-2">{campaign.description}</p>}
            </div>

            {photos.length === 0 ? (
              <Card className="p-8 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma foto encontrada</h3>
                <p className="text-muted-foreground">As fotos deste evento ainda não foram enviadas ou estão indisponíveis.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <div className="aspect-square bg-gradient-subtle relative">
                      <WatermarkedPhoto
                        src={photo.thumbnail_url || photo.watermarked_url}
                        alt={photo.title || 'Foto'}
                        position="corner"
                        opacity={0.5}
                      />
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm truncate">{photo.title || 'Foto'}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setOpenPhoto(photo)}>Abrir</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox modal with front watermark overlay */}
      {openPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenPhoto(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Display opened photo */}
            <WatermarkedPhoto
              src={openPhoto.watermarked_url}
              alt={openPhoto.title || 'Foto'}
              position="center"
              opacity={0.9}
              imgClassName="max-w-full max-h-[90vh] object-contain block"
              watermarkClassName="max-w-[70%] max-h-[70%] object-contain"
            />

            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center"
              onClick={() => setOpenPhoto(null)}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaign;

// Inline modal markup appended at end of file via React portal-like pattern is not available here,
// so we include modal markup inside the component render above. To keep the patch minimal we've
// implemented opening via `openPhoto` state which should be present in the component.


/*
Notes for watermark usage:
- Place the front watermark image you shared into the public folder at: `public/watermark_front.png`.
- The lightbox will overlay that image centered on top of the displayed photo.

If you want a different filename or location, update the `watermarkUrl` below in the modal markup.
*/
