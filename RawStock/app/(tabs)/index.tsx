import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { getTabTopInset, getTabBottomInset } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/lib/auth";
import { usePlayingVideo } from "@/lib/playing-video-context";
import { HorizontalScroll } from "@/components/HorizontalScroll";

const { width: SCREEN_W } = Dimensions.get("window");
const IS_LARGE_WEB = Platform.OS === "web" && SCREEN_W > 768;
const PANEL_W = IS_LARGE_WEB
  ? Math.min(300, Math.round((SCREEN_W - 80) / 4))
  : Math.round(SCREEN_W * 0.72);
const MENTOR_W = 200;
const PAID_HERO_H = Platform.OS === "web"
  ? Math.min(Math.round(SCREEN_W * 0.65), 420)
  : Math.min(Math.round(SCREEN_W * 0.65), 380);
// Hero card width: on web the app container is capped at 500px; on native use full screen width
const HERO_CARD_W = Platform.OS === "web" ? Math.min(SCREEN_W, 500) : SCREEN_W;

function useUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Live Dot ────────────────────────────────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.liveDotAnim, { opacity: pulse }]} />;
}

// ─── Paid Hero Section ────────────────────────────────────────────────────────
function PaidHeroSection({ videos, isDemo }: { videos: any[]; isDemo: boolean }) {
  return (
    <HorizontalScroll
      pagingEnabled={Platform.OS !== "web"}
    >
      {videos.map((item) => (
        <Pressable
          key={item.id}
          style={paidHero.card}
          onPress={() =>
            router.push(
              isDemo ? (`/video/${item.id}?demo=1` as any) : (`/video/${item.id}` as any)
            )
          }
        >
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={paidHero.thumb} contentFit="cover" />
          ) : (
            <View style={[paidHero.thumb, { backgroundColor: C.surface2 }]} />
          )}
          <LinearGradient
            colors={["rgba(5,5,5,0)", "rgba(5,5,5,0.5)", "rgba(5,5,5,0.92)"]}
            style={paidHero.gradient}
          />
          <View style={paidHero.paidBadge}>
            <Text style={paidHero.paidBadgeText}>PAID</Text>
          </View>
          <View style={paidHero.info}>
            <View style={paidHero.metaRow}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={paidHero.avatar} contentFit="cover" />
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
  card: { width: HERO_CARD_W, height: 300, position: "relative", backgroundColor: "#000" } as any,
  thumb: { position: "absolute", top: 0, left: 0, width: HERO_CARD_W, height: 300 } as any,
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 300 },
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
        <Image source={{ uri: item.thumbnail }} style={styles.liveThumb} contentFit="cover" />
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
            <LiveDot />
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
          <Image source={{ uri: item.avatar }} style={styles.smallAvatar} contentFit="cover" />
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
      onPress={() => router.push(`/twoshot-booking/${item.id}`)}
    >
      <View style={styles.sessionThumbWrap}>
        <Image source={{ uri: item.thumbnail }} style={styles.sessionThumb} contentFit="cover" />
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
          <Image source={{ uri: item.avatar }} style={styles.smallAvatar} contentFit="cover" />
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
const DUMMY_PAID = [
  { id: 1, thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=520&fit=crop", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop", community: "Language Lab", title: "Business English Intensive — from a perfect-score instructor", views: 31200, price: 1000 },
  { id: 2, thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=520&fit=crop", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=40&h=40&fit=crop", community: "Night Scene", title: "Tonight's Talk — love advice, anything goes ✨", views: 8900, price: 500 },
  { id: 3, thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=520&fit=crop", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop", community: "Mystic Lounge", title: "Tarot Reading — Your fortune for this week revealed", views: 19800, price: 300 },
];

const DUMMY_LIVE = [
  { id: 1, thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop", community: "Underground Scene", title: "Studio Practice — unfiltered stream", viewers: 47 },
  { id: 2, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=225&fit=crop", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop", community: "D&B Scene", title: "JAM Session LIVE", viewers: 23 },
];

const DUMMY_SESSIONS = [
  { id: 1, thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=169&fit=crop", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop", creator: "Yuki", title: "Open talk — I'll listen to anything", categoryLabel: "Counseling", price: 2000, duration: "30 min", spotsLeft: 3, date: "Apr 2", time: "20:00" },
  { id: 2, thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=169&fit=crop", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop", creator: "Kenji", title: "Business English Intensive", categoryLabel: "English", price: 3500, duration: "45 min", spotsLeft: 5, date: "Apr 3", time: "19:00" },
  { id: 3, thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=169&fit=crop", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop", creator: "Hana", title: "Guitar for beginners — from scratch", categoryLabel: "Music", price: 2500, duration: "30 min", spotsLeft: 2, date: "Apr 5", time: "18:00" },
];


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unreadCount = useUnreadCount();
  const { jukeboxIsActive, jukeboxCommunityId } = usePlayingVideo();

  const { data: apiVideos = [] } = useQuery<any[]>({ queryKey: ["/api/videos"] });
  const { data: apiLive = [] } = useQuery<any[]>({ queryKey: ["/api/live-streams"] });
  const { data: communities = [] } = useQuery<any[]>({ queryKey: ["/api/communities"] });
  const firstCommunityId: number | null = (communities[0]?.id as number) ?? null;
  type BookingSession = {
    id: number; creator: string; category: string; categoryLabel: string; title: string;
    avatar: string; thumbnail: string; date: string; time: string; duration: string;
    price: number; spotsTotal: number; spotsLeft: number;
  };
  const { data: twoshotSessions = [] } = useQuery<BookingSession[]>({ queryKey: ["/api/booking-sessions"] });

  const paidVideos = (() => {
    const paid = apiVideos
      .filter((v: any) => v.price != null && v.price > 0)
      .sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5);
    return paid.length > 0 ? paid : DUMMY_PAID;
  })();
  const usingDemoPaid = apiVideos.filter((v: any) => v.price != null && v.price > 0).length === 0;

  const allLiveStreams = apiLive.length > 0 ? apiLive : DUMMY_LIVE;
  const sessions = twoshotSessions.length > 0 ? twoshotSessions : DUMMY_SESSIONS;

  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset();

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <AppLogo height={32} />
        <View style={styles.headerRight}>
          {user && (
            <Pressable style={styles.broadcastBtn} onPress={() => router.push("/broadcast" as any)}>
              <LiveDot />
              <Text style={styles.broadcastBtnText}>LIVE</Text>
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={() => router.push("/notifications?filter=purchase")}>
            <Ionicons name="notifications-outline" size={22} color={C.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/dm" as any)}>
            <Ionicons name="chatbubble-outline" size={22} color={C.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical}>

        {/* ── Paid Hero ── */}
        <PaidHeroSection videos={paidVideos} isDemo={usingDemoPaid} />

        {/* ── Creator Banner ── */}
        <View style={styles.creatorBanner}>
          <View style={styles.creatorBannerText}>
            <Text style={styles.creatorBannerTitle}>Get your live footage edited and published.</Text>
            <Text style={styles.creatorBannerSub}>Earn 90% of every sale. Your raw content, professionally packaged.</Text>
          </View>
          <View style={styles.creatorBannerBtns}>
            <Pressable style={styles.creatorBtnPrimary} onPress={() => router.push("/editing-request" as any)}>
              <Text style={styles.creatorBtnPrimaryText}>Hire a Creator</Text>
            </Pressable>
            <Pressable style={styles.creatorBtnSecondary} onPress={() => router.push("/ai-edit" as any)}>
              <Ionicons name="sparkles-outline" size={12} color={C.accent} />
              <Text style={styles.creatorBtnSecondaryText}>AI Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Jukebox Banner ── */}
        <Pressable
          style={styles.jukeBanner}
          onPress={() => {
            if (jukeboxIsActive && jukeboxCommunityId) {
              // Active: go to the currently playing community's jukebox
              router.push(`/jukebox/${jukeboxCommunityId}` as any);
            } else if (firstCommunityId) {
              // Inactive: go to the first community's jukebox page
              router.push(`/jukebox/${firstCommunityId}` as any);
            } else {
              router.push("/(tabs)/community" as any);
            }
          }}
        >
          <View style={styles.jukeBannerLeft}>
            <Ionicons name="musical-notes" size={16} color={C.accent} />
            <View>
              <Text style={styles.jukeBannerLabel}>JUKE BOT</Text>
              <Text style={styles.jukeBannerTrack} numberOfLines={1}>Underground Session Mix Vol.7</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>

        {/* ── Now Live ── */}
        <View style={styles.sectionGap} />
        <SectionHeader
          title="NOW LIVE"
          accent
          right={
            <Pressable onPress={() => router.push("/live" as any)}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
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
          title="SESSIONS"
          right={
            <Pressable onPress={() => router.push("/mentor-manage" as any)}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </Pressable>
          }
        />
        <HorizontalScroll contentContainerStyle={styles.hScroll}>
          {sessions.map((s: any) => (
            <SessionCard key={s.id} item={s} />
          ))}
        </HorizontalScroll>

        <View style={styles.footerLinks}>
          <Pressable onPress={() => router.push("/terms" as any)}>
            <Text style={styles.footerLinkText}>Terms</Text>
          </Pressable>
          <Text style={styles.footerLinkSeparator}>•</Text>
          <Pressable onPress={() => router.push("/privacy" as any)}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </Pressable>
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
  broadcastBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: C.live,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  broadcastBtnText: {
    color: C.live,
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 1.5,
    fontWeight: "400",
  },
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

  // Creator Banner
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
  jukeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: C.surface,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.accent,
  },
  jukeBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  jukeBannerLabel: {
    color: C.accent,
    fontSize: 9,
    fontFamily: F.mono,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  jukeBannerTrack: { color: C.text, fontSize: 13, fontFamily: F.display, fontWeight: "700" },

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
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveBadgeText: { color: "#fff", fontSize: 10, fontFamily: F.mono, fontWeight: "700", letterSpacing: 1 },
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
    gap: 8,
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

  // Live Dot
  liveDotAnim: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.live },
});
