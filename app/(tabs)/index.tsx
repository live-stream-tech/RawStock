import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { usePlayingVideo } from "@/lib/playing-video-context";
import { useJukeboxPulse } from "@/lib/useJukeboxPulse";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { CreatorPromoBanner } from "@/components/CreatorPromoBanner";
import { resolvePublicMediaUri as resolveVideoMediaUri } from "@/lib/resolve-public-media-uri";
import { useAuth } from "@/lib/auth";

const MENTOR_W = 200;

function useUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

function useDmUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/dm-messages/unread-count"],
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

/** Matches /live thumbnail LIVE badge (solid dot, no pulse) */
function LiveOnAirDot() {
  return <View style={styles.liveOnAirDot} />;
}

// ─── Paid Hero Section ────────────────────────────────────────────────────────
function PaidHeroSection({
  videos,
  isDemo,
  heroCardWidth,
}: {
  videos: any[];
  isDemo: boolean;
  /** Same basis as WebRootWidth column: min(window, 500) on web, full width on native. */
  heroCardWidth: number;
}) {
  return (
    <HorizontalScroll
      pagingEnabled={Platform.OS !== "web"}
      style={paidHero.hScroll}
      contentContainerStyle={paidHero.hScrollContent}
    >
      {videos.map((item) => (
        <Pressable
          key={item.id}
          style={[paidHero.card, { width: heroCardWidth }]}
          onPress={() =>
            router.push(
              isDemo ? (`/video/${item.id}?demo=1` as any) : (`/video/${item.id}` as any)
            )
          }
        >
          <View style={[paidHero.thumbWrap, { width: heroCardWidth }]}>
            <Image
              source={{ uri: resolveVideoMediaUri(item.thumbnail) }}
              style={paidHero.thumbImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
          <LinearGradient
            colors={["rgba(5,5,5,0)", "rgba(5,5,5,0.5)", "rgba(5,5,5,0.92)"]}
            style={paidHero.gradient}
            pointerEvents="none"
          />
          <View style={paidHero.paidBadge}>
            <Text style={paidHero.paidBadgeText}>PAID</Text>
          </View>
          <View style={paidHero.info}>
            <View style={paidHero.metaRow}>
              {item.avatar ? (
                <Image
                  source={{ uri: resolveVideoMediaUri(item.avatar) }}
                  style={paidHero.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : null}
              <Text style={paidHero.community} numberOfLines={1}>{item.community}</Text>
              {item.price != null && item.price > 0 && (
                <View style={paidHero.pricePill}>
                  <Text style={paidHero.priceText}>🎟{item.price.toLocaleString()}</Text>
                </View>
              )}
            </View>
            <Text style={paidHero.title} numberOfLines={2}>{item.title}</Text>
            <View style={paidHero.statsRow}>
              <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.55)" />
              <Text style={paidHero.stat}>{formatNumber(item.views ?? 0)}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </HorizontalScroll>
  );
}

const paidHero = StyleSheet.create({
  hScroll: { minHeight: 300 } as any,
  hScrollContent: { alignItems: "stretch" } as any,
  card: {
    height: 300,
    position: "relative",
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
  } as any,
  thumbWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 300,
    overflow: "hidden",
  } as any,
  thumbImage: { width: "100%", height: "100%" } as any,
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0, height: 300 },
  paidBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: C.accent,
    borderRadius: 2,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  paidBadgeText: { color: "#000", fontSize: 10, fontFamily: F.mono, fontWeight: "800", letterSpacing: 1.5 },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 18, gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 2 },
  community: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: F.mono, flex: 1 },
  pricePill: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 2, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.accent },
  priceText: { color: C.accent, fontSize: 10, fontFamily: F.mono, fontWeight: "700" },
  title: { color: "#fff", fontSize: 20, fontFamily: F.display, fontWeight: "800", letterSpacing: 0.3, lineHeight: 25 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stat: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: F.mono },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  accent,
  right,
}: {
  title: string;
  accent?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionAccentBar, { backgroundColor: accent ? C.live : C.accent }]} />
        <Text style={[styles.sectionTitle, accent && { color: C.live }]}>{title}</Text>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

// ─── Live Card ────────────────────────────────────────────────────────────────
function LiveCard({ item }: { item: any }) {
  return (
    <Pressable style={styles.liveCard} onPress={() => router.push(`/live/${item.id}`)}>
      <View style={styles.liveThumbWrap}>
        <Image
          source={{ uri: resolveVideoMediaUri(item.thumbnail) }}
          style={styles.liveThumb}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={styles.liveThumbGradient}
        />
        {item.isDemo ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        ) : (
          <View style={styles.liveBadge}>
            <LiveOnAirDot />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
        <View style={styles.viewerBadge}>
          <Ionicons name="eye-outline" size={10} color="#fff" />
          <Text style={styles.viewerText}>{formatNumber(item.viewers ?? 0)}</Text>
        </View>
      </View>
      <View style={styles.liveInfo}>
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: resolveVideoMediaUri(item.avatar) }}
            style={styles.smallAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={styles.communityText} numberOfLines={1}>{item.community}</Text>
        </View>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
      </View>
    </Pressable>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ item }: { item: any }) {
  return (
    <Pressable
      style={styles.sessionCard}
      onPress={() => router.push(`/mentor-booking/${item.id}`)}
    >
      <View style={styles.sessionThumbWrap}>
        <Image
          source={{ uri: resolveVideoMediaUri(item.thumbnail) }}
          style={styles.sessionThumb}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.82)"]}
          style={styles.sessionThumbGradient}
        />
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>SESSION</Text>
        </View>
        <View style={styles.sessionPriceOverlay}>
          <Text style={styles.sessionPriceText}>🎟{item.price?.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: resolveVideoMediaUri(item.avatar) }}
            style={styles.smallAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={styles.communityText} numberOfLines={1}>{item.creator}</Text>
        </View>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        {(item.date || item.time) && (
          <View style={styles.sessionDateRow}>
            <Ionicons name="calendar-outline" size={10} color={C.accent} />
            <Text style={styles.sessionDateText}>
              {[item.date, item.time].filter(Boolean).join("  ")}
            </Text>
          </View>
        )}
        <View style={styles.sessionMetaRow}>
          <Ionicons name="time-outline" size={10} color={C.textMuted} />
          <Text style={styles.sessionMetaText}>{item.duration}</Text>
          <View style={[styles.spotsBadge, item.spotsLeft <= 2 && styles.spotsBadgeLow]}>
            <Text style={[styles.spotsBadgeText, item.spotsLeft <= 2 && styles.spotsBadgeTextLow]}>
              {item.spotsLeft} left
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
/** Placeholder paid hero cards when there are no paid uploads — thumbnails/titles only; stats are honest zeros. */
const DUMMY_PAID = [
  {
    id: 1,
    thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=520&fit=crop",
    avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=40&h=40&fit=crop",
    community: "Shimokitazawa Livehouses",
    title: "Basement Gig Archive — 4/20 Shimokitazawa 3-venue digest",
    views: 0,
    price: 1000,
  },
  {
    id: 2,
    thumbnail: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=520&fit=crop",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    community: "Tokyo Club Circuit",
    title: "Warehouse Rave Recap — Peak Time Set + Crowd Cam",
    views: 0,
    price: 800,
  },
  {
    id: 3,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=520&fit=crop",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40&h=40&fit=crop",
    community: "Japan Indie Livehouses",
    title: "Indie tour finale — full set through encore (no cuts)",
    views: 0,
    price: 600,
  },
];

/** Placeholder live tiles when no streams — not on air; viewer count is zero. */
const DUMMY_LIVE = [
  {
    id: 1,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop",
    community: "Underground Scene",
    title: "Studio Practice — unfiltered stream",
    viewers: 0,
    isDemo: true,
  },
  {
    id: 2,
    thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    community: "D&B Scene",
    title: "JAM Session LIVE",
    viewers: 0,
    isDemo: true,
  },
];


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const { width: windowWidth } = useWindowDimensions();
  const heroCardW = Platform.OS === "web" ? Math.min(windowWidth, 500) : windowWidth;

  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();
  const dmUnreadCount = useDmUnreadCount();
  const { jukeboxIsActive, jukeboxCommunityId } = usePlayingVideo();
  const { pulse: jukePulse } = useJukeboxPulse();

  const { data: apiVideos = [] } = useQuery<any[]>({ queryKey: ["/api/videos"] });
  const { data: apiLive = [] } = useQuery<any[]>({ queryKey: ["/api/live-streams"], refetchInterval: 30_000 });
  const { data: communities = [] } = useQuery<any[]>({ queryKey: ["/api/communities"] });
  const firstCommunityId: number | null = (communities[0]?.id as number) ?? null;
  type BookingSession = {
    id: number; creator: string; category: string; categoryLabel: string; title: string;
    avatar: string; thumbnail: string; date: string; time: string; duration: string;
    price: number; spotsTotal: number; spotsLeft: number;
  };
  const { data: mentorSessions = [] } = useQuery<BookingSession[]>({ queryKey: ["/api/booking-sessions"] });

  const paidVideos = (() => {
    const paid = apiVideos
      .filter((v: any) => v.price != null && v.price > 0)
      .sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5);
    return paid.length > 0 ? paid : DUMMY_PAID;
  })();
  const usingDemoPaid = apiVideos.filter((v: any) => v.price != null && v.price > 0).length === 0;

  const allLiveStreams = apiLive.length > 0 ? apiLive : DUMMY_LIVE;
  const sessions = mentorSessions;

  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset();

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <AppLogo height={32} />
        <View style={styles.headerRight}>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => router.push("/notifications?filter=purchase")}
          >
            <Ionicons name="notifications-outline" size={22} color={C.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge} pointerEvents="none">
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/dm" as any)}>
            <Ionicons name="chatbubble-outline" size={22} color={C.text} />
            {dmUnreadCount > 0 && (
              <View style={styles.notifBadge} pointerEvents="none">
                <Text style={styles.notifBadgeText}>{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.sectionGap} />

        {/* ── Jukebox Banner ── */}
        <Pressable
          style={[styles.jukeBannerOuter, Platform.OS === "web" ? styles.jukeBannerOuterWeb : styles.jukeBannerOuterNative]}
          onPress={() => {
            if (jukePulse.targetCommunityId != null) {
              router.push(`/jukebox/${jukePulse.targetCommunityId}` as any);
            } else if (jukeboxIsActive && jukeboxCommunityId) {
              router.push(`/jukebox/${jukeboxCommunityId}` as any);
            } else if (firstCommunityId) {
              router.push(`/jukebox/${firstCommunityId}` as any);
            } else {
              router.push("/community" as any);
            }
          }}
        >
          <LinearGradient
            colors={["#062822", "#0a1514", "#0c0c0c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.jukeBannerShine} pointerEvents="none" />
          <View style={styles.jukeBannerRow}>
            <View style={styles.jukeArtCard}>
              <LinearGradient
                colors={["rgba(0,255,204,0.22)", "rgba(0,255,204,0.04)", "rgba(0,0,0,0.65)"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons
                name={jukePulse.mode === "on_air" ? "radio-outline" : "musical-notes"}
                size={28}
                color={C.accent}
              />
            </View>
            <View style={styles.jukeBannerMain}>
              <View style={styles.jukeBannerBadgeRow}>
                <View style={styles.jukePill}>
                  <Text style={styles.jukePillText}>{isJaUi ? "ジュークボックス" : "JUKEBOX"}</Text>
                </View>
                {jukePulse.mode === "on_air" ? (
                  <View style={styles.jukeOnAirPill}>
                    <View style={styles.jukeOnAirDot} />
                    <Text style={styles.jukeOnAirText}>{isJaUi ? "配信中" : "ON AIR"}</Text>
                  </View>
                ) : jukePulse.mode === "request_open" ? (
                  <View style={styles.jukeOpenPill}>
                    <Text style={styles.jukeOpenText}>{isJaUi ? "リクエスト受付中" : "Requests open"}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.jukeBannerTrack} numberOfLines={2}>
                {jukePulse.trackLine}
              </Text>
              {jukePulse.communityName ? (
                <Text style={styles.jukeBannerSub} numberOfLines={1}>
                  @{jukePulse.communityName.replace(/^@+/, "")}
                </Text>
              ) : jukePulse.mode === "fallback" ? (
                <Text style={styles.jukeBannerSub} numberOfLines={1}>
                  {isJaUi ? "タップでJukeboxルームを開く" : "Tap to open the Jukebox room"}
                </Text>
              ) : null}
            </View>
            <View style={styles.jukeBannerChevron}>
              <Ionicons name="chevron-forward" size={20} color={C.accent} />
            </View>
          </View>
        </Pressable>

        {/* ── Paid Hero ── */}
        <View style={styles.sectionGap} />
        <PaidHeroSection videos={paidVideos} isDemo={usingDemoPaid} heroCardWidth={heroCardW} />

        <CreatorPromoBanner />

        {/* ── Creator banner (same layout as before: one card + two buttons) ── */}
        <View style={styles.creatorBanner}>
          <View style={styles.creatorBannerText}>
            <Text style={styles.creatorBannerTitle}>
              {isJaUi ? "配信映像を編集して公開しましょう。" : "Get your live footage edited and published."}
            </Text>
            <Text style={styles.creatorBannerSub}>
              {isJaUi
                ? "売上の90%を獲得。素材をプロ品質でパッケージ化。"
                : "Earn 90% of every sale. Your raw content, professionally packaged."}
            </Text>
          </View>
          <View style={styles.creatorBannerBtns}>
            <Pressable style={styles.creatorBtnPrimary} onPress={() => router.push("/editors" as any)}>
              <Text style={styles.creatorBtnPrimaryText}>{isJaUi ? "動画編集を依頼" : "Video Edit Request"}</Text>
            </Pressable>
            <Pressable style={styles.creatorBtnSecondary} onPress={() => router.push("/ai-edit" as any)}>
              <Ionicons name="sparkles-outline" size={12} color={C.accent} />
              <Text style={styles.creatorBtnSecondaryText}>{isJaUi ? "AI編集" : "AI Edit"}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Now Live ── */}
        <View style={styles.sectionGap} />
        <SectionHeader
          title={isJaUi ? "配信中" : "NOW LIVE"}
          accent
          right={
            <Pressable onPress={() => router.push("/live" as any)}>
              <Text style={styles.viewAllText}>{isJaUi ? "すべて見る" : "VIEW ALL"}</Text>
            </Pressable>
          }
        />
        <HorizontalScroll contentContainerStyle={styles.hScroll}>
          {allLiveStreams.map((s) => (
            <LiveCard key={s.id} item={s} />
          ))}
        </HorizontalScroll>

        {/* ── Sessions ── */}
        <View style={styles.sectionGap} />
        <View style={styles.sectionDivider} />
        <View style={styles.sectionGap} />
        <SectionHeader
          title={isJaUi ? "セッション" : "SESSIONS"}
          right={
            <Pressable onPress={() => router.push("/mentor-sessions" as any)}>
              <Text style={styles.viewAllText}>{isJaUi ? "すべて見る" : "VIEW ALL"}</Text>
            </Pressable>
          }
        />
        <HorizontalScroll contentContainerStyle={styles.hScroll}>
          {sessions.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, minWidth: Math.min(heroCardW, 320) }}>
              <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: F.mono }}>
                {isJaUi
                  ? "現在、予約可能なメンターセッションはありません。"
                  : "No mentor sessions are currently available for booking."}
              </Text>
            </View>
          ) : (
            sessions.map((s: any) => <SessionCard key={s.id} item={s} />)
          )}
        </HorizontalScroll>

        <View style={styles.footerLinks}>
          {Platform.OS === "web" ? (
            <>
              <Link href="/privacy">
                <Text style={styles.footerLinkText}>{isJaUi ? "プライバシーポリシー" : "Privacy Policy"}</Text>
              </Link>
              <Text style={styles.footerLinkSeparator}> | </Text>
              <Pressable onPress={() => router.push("/legal" as any)}>
                <Text style={styles.footerLinkText}>{isJaUi ? "利用規約・ポリシー" : "Legal & Policies"}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => router.push("/legal" as any)}>
              <Text style={styles.footerLinkText}>{isJaUi ? "利用規約・ポリシー" : "Legal & Policies"}</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { position: "relative" },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.live,
    borderRadius: 2,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  notifBadgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },

  scroll: { flex: 1 },

  // Creator banner (restored from earlier Top layout)
  creatorBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: "rgba(108,92,231,0.07)",
    gap: 12,
  },
  creatorBannerText: { gap: 4 },
  creatorBannerTitle: { color: C.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  creatorBannerSub: { color: C.textSec, fontSize: 11, lineHeight: 16 },
  creatorBannerBtns: { flexDirection: "row", gap: 8 },
  creatorBtnPrimary: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 7,
    paddingVertical: 9,
    alignItems: "center",
  },
  creatorBtnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  creatorBtnSecondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.accent,
    borderRadius: 7,
    paddingVertical: 9,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  creatorBtnSecondaryText: { color: C.accent, fontSize: 12, fontWeight: "800" },

  // Jukebox Banner
  jukeBannerOuter: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.38)",
  },
  jukeBannerOuterWeb: {
    boxShadow: "0 0 28px rgba(0,255,204,0.14), 0 10px 36px rgba(0,0,0,0.55)",
  } as any,
  jukeBannerOuterNative: {
    shadowColor: "#00ffcc",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  jukeBannerShine: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,255,204,0.12)",
  },
  jukeBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  jukeArtCard: {
    width: 58,
    height: 58,
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.28)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  jukeBannerMain: { flex: 1, minWidth: 0, gap: 4 },
  jukeBannerBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  jukePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,255,204,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.35)",
  },
  jukePillText: {
    color: C.accent,
    fontSize: 8,
    fontFamily: F.mono,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  jukeOnAirPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,77,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,0,0.45)",
  },
  jukeOnAirDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.live,
  },
  jukeOnAirText: {
    color: C.live,
    fontSize: 8,
    fontFamily: F.mono,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  jukeOpenPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.4)",
  },
  jukeOpenText: {
    color: C.amber,
    fontSize: 9,
    fontFamily: F.mono,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  jukeBannerTrack: {
    color: C.text,
    fontSize: 15,
    fontFamily: F.display,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 19,
  },
  jukeBannerSub: {
    color: C.textSec,
    fontSize: 11,
    fontFamily: F.mono,
    marginTop: 1,
  },
  jukeBannerChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,255,204,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.22)",
  },

  // Section
  sectionGap: { height: 20 },
  sectionDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionAccentBar: { width: 3, height: 20, borderRadius: 1 },
  sectionTitle: {
    color: C.text,
    fontSize: 22,
    fontFamily: F.display,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  viewAllText: { color: C.accent, fontSize: 9, fontFamily: F.mono, letterSpacing: 1.2, textTransform: "uppercase" },
  hScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 12 },

  // Live Card
  liveCard: { width: 200, overflow: "hidden", backgroundColor: C.surface },
  liveThumbWrap: { position: "relative", overflow: "hidden", aspectRatio: 16 / 9 },
  liveThumb: { width: 200, aspectRatio: 16 / 9 },
  liveThumbGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: C.live,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  comingSoonBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontFamily: F.mono, letterSpacing: 1.5 },
  viewerBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewerText: { color: "#fff", fontSize: 10, fontFamily: F.mono },
  liveInfo: { paddingHorizontal: 10, paddingVertical: 8, gap: 4, backgroundColor: C.surface },

  // Session Card
  sessionCard: { width: MENTOR_W, overflow: "hidden", backgroundColor: C.surface },
  sessionThumbWrap: { position: "relative", overflow: "hidden", aspectRatio: 16 / 9 },
  sessionThumb: { width: MENTOR_W, aspectRatio: 16 / 9 },
  sessionThumbGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  sessionBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: C.surface3,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  sessionBadgeText: { color: C.textSec, fontSize: 9, fontFamily: F.mono, fontWeight: "700", letterSpacing: 1 },
  sessionPriceOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sessionPriceText: { color: C.accent, fontSize: 11, fontFamily: F.mono, fontWeight: "700" },
  sessionInfo: { paddingHorizontal: 10, paddingVertical: 8, gap: 4, backgroundColor: C.surface },
  sessionDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  sessionDateText: { color: C.accent, fontSize: 10, fontFamily: F.mono },
  sessionMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionMetaText: { color: C.textMuted, fontSize: 10, fontFamily: F.mono },
  sessionMetaDot: { color: C.textMuted, fontSize: 10 },
  spotsBadge: {
    backgroundColor: C.surface2,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  spotsBadgeText: { color: C.textMuted, fontSize: 9, fontFamily: F.mono },
  spotsBadgeLow: { backgroundColor: "rgba(255,48,48,0.15)" },
  spotsBadgeTextLow: { color: C.live },

  // Shared
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  smallAvatar: { width: 18, height: 18, borderRadius: 2 },
  communityText: { color: C.textSec, fontSize: 10, fontFamily: F.mono, flex: 1 },
  videoTitle: { color: C.text, fontSize: 12, fontWeight: "600", lineHeight: 16 },

  // Footer links
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    opacity: 0.75,
  },
  footerLinkText: {
    color: C.textMuted,
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  footerLinkSeparator: {
    color: C.textMuted,
    fontSize: 9,
  },

  liveOnAirDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
});
