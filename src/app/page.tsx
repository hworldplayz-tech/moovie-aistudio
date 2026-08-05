import { getManuallyAddedContent, getTrending } from "@/lib/tmdb";
import { getPaginationLimit, getSecureDownloadSettings } from "@/app/admin/actions";
import { getLiveChannels } from "@/lib/firestore";
import type { Content, LiveChannel } from "@/lib/definitions";
import BrowseClient from "@/components/browse-client";

// ISR: Revalidate page every 60 seconds. Instant serving from cache.
export const revalidate = 60;

export default async function BrowsePage() {

  // Fetch everything in parallel for maximum speed
  const [
    localContent,
    trending,
    paginationLimit,
    secureSettings
  ] = await Promise.all([
    getManuallyAddedContent(),
    getTrending(),
    getPaginationLimit(),
    getSecureDownloadSettings()
  ]);

  let liveChannels: LiveChannel[] = [];
  if (secureSettings.showLiveTvCarousel) {
    liveChannels = await getLiveChannels(10);
  }

  // Filter for featured content (only if enabled)
  let featuredContent: Content[] = [];
  if (secureSettings.showFeaturedSection !== false) { // Default to true if undefined
    featuredContent = localContent.filter(item => item.isFeatured === true);
  }

  return (
    <BrowseClient
      initialContent={localContent}
      initialFeaturedContent={featuredContent}
      initialHero={trending.slice(0, 5)}
      initialLiveChannels={liveChannels}
      initialPaginationLimit={paginationLimit}
      featuredLayout={secureSettings.featuredLayout || 'slider'}
    />
  );
}
