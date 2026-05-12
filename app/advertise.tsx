import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { AppLogo } from "@/components/AppLogo";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import {
  DEFAULT_BANNER_COMMUNITY_ID,
  TEMP_BANNER_ASPECT,
  TEMP_BANNER_IMAGE_PATH,
} from "@/constants/bannerLinks";
import { webScrollStyle } from "@/constants/layout";
import { apiRequest, formatUserFacingApiError, getApiUrl } from "@/lib/query-client";

type CommunityOption = {
  id: number;
  name: string;
  members: number;
  thumbnail: string;
  category?: string | null;
  isOfficial?: boolean;
};

type PricingInfo = {
  memberCount: number;
  dailyRate: number;
  minDays: number;
  minAmount: number;
  ratePerMember: number;
};

type AvailabilityInfo = {
  available: boolean;
  conflicts: { id: number; startDate: string; endDate: string }[];
};

type FormErrors = Partial<Record<
  | "communityId"
  | "companyName"
  | "contactName"
  | "email"
  | "bannerUrl"
  | "linkUrl"
  | "dates"
  | "agreedToTerms"
  | "availability",
  string
>>;

function toParamString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function formatCurrencyLikeTickets(value: number): string {
  return `🎟${Math.max(0, value).toLocaleString()}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatRangeLabel(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  return `${startDate} to ${endDate}`;
}

export default function AdvertiseScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const { communityId: communityIdParam } = useLocalSearchParams<{ communityId?: string }>();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const isDesktop = width >= 980;
  const contentMaxWidth = Math.min(Math.max(width - (isDesktop ? 64 : 24), 0), 1120);
  const initialCommunityId = useMemo(() => {
    const parsed = parseInt(toParamString(communityIdParam), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BANNER_COMMUNITY_ID;
  }, [communityIdParam]);

  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(initialCommunityId);
  const [communitySearch, setCommunitySearch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formY, setFormY] = useState(0);

  const {
    data: communities = [],
    isLoading: communitiesLoading,
    error: communitiesError,
    refetch: refetchCommunities,
  } = useQuery<CommunityOption[]>({
    queryKey: ["/api/communities"],
    queryFn: async () => {
      const res = await fetch(new URL("/api/communities", getApiUrl()).toString());
      if (!res.ok) throw new Error("Failed to load communities");
      return res.json();
    },
  });

  useEffect(() => {
    if (initialCommunityId > 0) {
      setSelectedCommunityId(initialCommunityId);
    }
  }, [initialCommunityId]);

  useEffect(() => {
    if (!communities.length) return;
    setSelectedCommunityId((current) => {
      if (communities.some((community) => community.id === current)) return current;
      const preferred =
        communities.find((community) => community.id === initialCommunityId) ??
        communities.find((community) => community.id === DEFAULT_BANNER_COMMUNITY_ID) ??
        communities[0];
      return preferred?.id ?? 0;
    });
  }, [communities, initialCommunityId]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) ?? null,
    [communities, selectedCommunityId],
  );

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    const filtered = communities.filter((community) => {
      if (!q) return true;
      const haystack = `${community.name} ${community.category ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
    return filtered.slice(0, q ? 18 : 10);
  }, [communities, communitySearch]);

  const {
    data: pricing,
    isLoading: pricingLoading,
    error: pricingError,
  } = useQuery<PricingInfo>({
    queryKey: ["/api/community-ads/pricing", selectedCommunityId],
    enabled: selectedCommunityId > 0,
    queryFn: async () => {
      const res = await fetch(
        new URL(`/api/community-ads/pricing?communityId=${selectedCommunityId}`, getApiUrl()).toString(),
      );
      if (!res.ok) throw new Error("Failed to load pricing");
      return res.json();
    },
  });

  const pricingSummary = useMemo(() => {
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    if (!pricing || !start || !end) {
      return {
        days: 0,
        totalAmount: 0,
        error: "",
      };
    }
    if (end < start) {
      return {
        days: 0,
        totalAmount: 0,
        error: "End date must be on or after the start date.",
      };
    }
    const days = daysBetweenInclusive(start, end);
    const totalAmount = days * pricing.dailyRate;
    if (totalAmount < pricing.minAmount) {
      return {
        days,
        totalAmount,
        error: `Minimum spend is ${formatCurrencyLikeTickets(pricing.minAmount)}.`,
      };
    }
    return {
      days,
      totalAmount,
      error: "",
    };
  }, [endDate, pricing, startDate]);

  const availabilityEnabled =
    selectedCommunityId > 0 &&
    parseDateInput(startDate) != null &&
    parseDateInput(endDate) != null &&
    !pricingSummary.error;

  const {
    data: availability,
    isFetching: checkingAvailability,
  } = useQuery<AvailabilityInfo>({
    queryKey: ["/api/community-ads/availability", selectedCommunityId, startDate, endDate],
    enabled: availabilityEnabled,
    queryFn: async () => {
      const res = await fetch(
        new URL(
          `/api/community-ads/availability?communityId=${selectedCommunityId}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
          getApiUrl(),
        ).toString(),
      );
      if (!res.ok) throw new Error("Failed to check availability");
      return res.json();
    },
  });

  const availabilityMessage = useMemo(() => {
    if (!availabilityEnabled) return "";
    if (checkingAvailability) return "Checking availability for the selected dates...";
    if (!availability) return "";
    if (availability.available) return "Selected dates are currently available.";
    const firstConflict = availability.conflicts[0];
    return firstConflict
      ? `This slot is already reserved for ${formatRangeLabel(firstConflict.startDate, firstConflict.endDate)}.`
      : "This slot is already reserved.";
  }, [availability, availabilityEnabled, checkingAvailability]);

  const handleFormLayout = (event: LayoutChangeEvent) => {
    setFormY(event.nativeEvent.layout.y);
  };

  const scrollToForm = () => {
    scrollRef.current?.scrollTo({ y: Math.max(formY - 24, 0), animated: true });
  };

  const handleCommunitySelect = (communityId: number) => {
    setSelectedCommunityId(communityId);
    setSubmitSuccess(false);
    setSubmitError("");
    setFormErrors((current) => ({ ...current, communityId: undefined, availability: undefined }));
  };

  const validateForm = (): FormErrors => {
    const next: FormErrors = {};
    if (!selectedCommunityId) next.communityId = "Select a community.";
    if (!companyName.trim()) next.companyName = "Enter a company name.";
    if (!contactName.trim()) next.contactName = "Enter a contact name.";
    if (!email.trim()) next.email = "Enter an email address.";
    else if (!isValidEmail(email.trim())) next.email = "Enter a valid email address.";
    if (!bannerUrl.trim()) next.bannerUrl = "Enter a banner image URL.";
    else if (!isHttpUrl(bannerUrl.trim())) next.bannerUrl = "Use a valid http or https URL.";
    if (linkUrl.trim() && !isHttpUrl(linkUrl.trim())) next.linkUrl = "Use a valid http or https URL.";
    if (!startDate.trim() || !endDate.trim()) next.dates = "Enter both start and end dates.";
    else if (parseDateInput(startDate) == null || parseDateInput(endDate) == null) next.dates = "Use YYYY-MM-DD format.";
    else if (!pricing) next.dates = "Pricing is still loading. Please wait a moment.";
    else if (pricingSummary.error) next.dates = pricingSummary.error;
    if (!agreedToTerms) next.agreedToTerms = "You must accept the advertising rate terms.";
    if (availabilityEnabled && checkingAvailability) {
      next.availability = "Availability is still being checked. Please wait.";
    } else if (availabilityEnabled && !availability) {
      next.availability = "Availability has not been confirmed yet.";
    } else if (availabilityEnabled && availability && !availability.available) {
      next.availability = "Selected dates are already booked.";
    }
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm();
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Please fix the highlighted fields and try again.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await apiRequest("POST", "/api/community-ads", {
        communityId: selectedCommunityId,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        bannerUrl: bannerUrl.trim(),
        linkUrl: linkUrl.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        agreedToTerms,
      });
      setSubmitSuccess(true);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setBannerUrl("");
      setLinkUrl("");
      setStartDate("");
      setEndDate("");
      setAgreedToTerms(false);
      setFormErrors({});
    } catch (error) {
      setSubmitError(formatUserFacingApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const cardWidth = isDesktop ? (contentMaxWidth - 32) / 3 : contentMaxWidth;

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <ScrollView
        ref={scrollRef}
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroSection, { paddingHorizontal: isDesktop ? 32 : 16, paddingTop: 24 }]}>
          <View style={[styles.heroShell, { maxWidth: contentMaxWidth }]}>
            <View style={styles.heroHeader}>
              <AppLogo height={32} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={18} color={C.text} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            </View>

            <View style={[styles.heroGrid, isDesktop && styles.heroGridDesktop]}>
              <View style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop]}>
                <Text style={styles.eyebrow}>Community Advertising</Text>
                <Text style={styles.heroTitle}>Run banner placements where your audience already shows up.</Text>
                <Text style={styles.heroBody}>
                  Promote a launch, event, merch drop, or booking campaign inside RawStock communities. Pick a community, check live pricing, confirm open dates, and send your request in one place.
                </Text>

                <View style={styles.heroActions}>
                  <Pressable style={styles.primaryCta} onPress={scrollToForm}>
                    <Text style={styles.primaryCtaText}>Start application</Text>
                    <Ionicons name="arrow-down" size={16} color="#04120f" />
                  </Pressable>
                  {selectedCommunity ? (
                    <Pressable
                      style={styles.secondaryCta}
                      onPress={() => router.push(`/community/${selectedCommunity.id}` as any)}
                    >
                      <Text style={styles.secondaryCtaText}>View selected community</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Selected community</Text>
                    <Text style={styles.statValue}>{selectedCommunity?.name ?? "Choose below"}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Daily rate</Text>
                    <Text style={styles.statValue}>
                      {pricing ? formatCurrencyLikeTickets(pricing.dailyRate) : "Loading..."}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Minimum run</Text>
                    <Text style={styles.statValue}>
                      {pricing ? `${pricing.minDays} day${pricing.minDays === 1 ? "" : "s"}` : "--"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.heroVisual, isDesktop && styles.heroVisualDesktop]}>
                <Pressable style={styles.exampleBannerWrap} onPress={scrollToForm}>
                  <Image
                    source={{ uri: TEMP_BANNER_IMAGE_PATH }}
                    style={styles.exampleBanner}
                    contentFit="contain"
                    contentPosition="center"
                  />
                </Pressable>
                <Text style={styles.visualCaption}>Current banner example used across community placements.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
          <View style={[styles.sectionInner, { maxWidth: contentMaxWidth }]}>
            <Text style={styles.sectionTitle}>Why advertise here</Text>
            <View style={[styles.featureGrid, isDesktop && styles.featureGridDesktop]}>
              {[
                {
                  title: "Audience fit",
                  body: "Choose a community whose members already care about your category, event, or creator lane.",
                },
                {
                  title: "Live pricing",
                  body: "Pricing updates from the current member count, so you can estimate spend before sending the request.",
                },
                {
                  title: "Real availability",
                  body: "We check for date conflicts against pending and approved reservations before you submit.",
                },
              ].map((item) => (
                <View key={item.title} style={[styles.featureCard, { width: cardWidth }]}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureBody}>{item.body}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
          <View style={[styles.sectionInner, { maxWidth: contentMaxWidth }]}>
            <Text style={styles.sectionTitle}>Pricing snapshot</Text>
            <View style={[styles.pricingGrid, isDesktop && styles.pricingGridDesktop]}>
              <View style={[styles.panel, styles.pricingPanel]}>
                <Text style={styles.panelTitle}>How pricing works</Text>
                <Text style={styles.panelBody}>
                  Daily rate = current community members x {pricing?.ratePerMember ?? "--"} tickets. Minimum spend is{" "}
                  {pricing ? formatCurrencyLikeTickets(pricing.minAmount) : "loading"}.
                </Text>
                <View style={styles.pricingList}>
                  <Text style={styles.pricingListRow}>
                    Members: {pricingLoading ? "Loading..." : pricing?.memberCount?.toLocaleString() ?? "--"}
                  </Text>
                  <Text style={styles.pricingListRow}>
                    Daily rate: {pricingLoading ? "Loading..." : pricing ? formatCurrencyLikeTickets(pricing.dailyRate) : "--"}
                  </Text>
                  <Text style={styles.pricingListRow}>
                    Minimum days: {pricingLoading ? "Loading..." : pricing?.minDays ?? "--"}
                  </Text>
                </View>
                {pricingError ? <Text style={styles.errorNote}>Pricing could not be loaded yet.</Text> : null}
              </View>

              <View style={[styles.panel, styles.notesPanel]}>
                <Text style={styles.panelTitle}>Booking notes</Text>
                <Text style={styles.panelBody}>One reservation blocks overlapping dates while it is pending or approved.</Text>
                <Text style={styles.panelBody}>Pricing is locked at booking time using the member count at submission.</Text>
                <Text style={styles.panelBody}>You can reserve up to 3 months ahead.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
          <View style={[styles.sectionInner, styles.processShell, { maxWidth: contentMaxWidth }]}>
            <Text style={styles.sectionTitle}>What happens next</Text>
            <View style={[styles.processGrid, isDesktop && styles.processGridDesktop]}>
              {[
                "Choose a community and enter your target run dates.",
                "Review the live rate and confirm the slot is still open.",
                "Submit the application and wait for moderation review by email.",
              ].map((item, index) => (
                <View key={item} style={styles.processCard}>
                  <View style={styles.processBadge}>
                    <Text style={styles.processBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.processText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          onLayout={handleFormLayout}
          style={[styles.section, { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 40 }]}
        >
          <View style={[styles.sectionInner, { maxWidth: contentMaxWidth }]}>
            <Text style={styles.sectionTitle}>Apply for placement</Text>

            <View style={[styles.formGrid, isDesktop && styles.formGridDesktop]}>
              <View style={[styles.panel, styles.formPanel]}>
                <Text style={styles.formSectionTitle}>1. Choose a community</Text>
                <Text style={styles.helperText}>
                  Search and select the community where you want your banner placement to appear.
                </Text>

                <TextInput
                  style={styles.input}
                  value={communitySearch}
                  onChangeText={setCommunitySearch}
                  placeholder="Search communities"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />

                <View style={styles.communityResultWrap}>
                  {communitiesLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={C.accent} />
                      <Text style={styles.loadingText}>Loading communities...</Text>
                    </View>
                  ) : communitiesError ? (
                    <View style={styles.inlineErrorBox}>
                      <Text style={styles.inlineErrorText}>Communities could not be loaded.</Text>
                      <Pressable style={styles.retryButton} onPress={() => refetchCommunities()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </Pressable>
                    </View>
                  ) : (
                    filteredCommunities.length > 0 ? (
                      filteredCommunities.map((community) => {
                        const active = community.id === selectedCommunityId;
                        return (
                          <Pressable
                            key={community.id}
                            style={[styles.communityOption, active && styles.communityOptionActive]}
                            onPress={() => handleCommunitySelect(community.id)}
                          >
                            <Image source={{ uri: community.thumbnail }} style={styles.communityThumb} contentFit="cover" />
                            <View style={styles.communityMeta}>
                              <Text style={styles.communityName}>{community.name}</Text>
                              <Text style={styles.communityStats}>
                                {community.members.toLocaleString()} members{community.category ? ` · ${community.category}` : ""}
                              </Text>
                            </View>
                            {active ? <Ionicons name="checkmark-circle" size={20} color={C.accent} /> : null}
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={styles.helperText}>No communities matched your search.</Text>
                    )
                  )}
                </View>
                {formErrors.communityId ? <Text style={styles.fieldError}>{formErrors.communityId}</Text> : null}

                <Text style={styles.formSectionTitle}>2. Campaign details</Text>
                <Text style={styles.label}>Company name</Text>
                <TextInput
                  style={[styles.input, formErrors.companyName && styles.inputError]}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Acme Inc."
                  placeholderTextColor={C.textMuted}
                />
                {formErrors.companyName ? <Text style={styles.fieldError}>{formErrors.companyName}</Text> : null}

                <Text style={styles.label}>Contact name</Text>
                <TextInput
                  style={[styles.input, formErrors.contactName && styles.inputError]}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Jane Smith"
                  placeholderTextColor={C.textMuted}
                />
                {formErrors.contactName ? <Text style={styles.fieldError}>{formErrors.contactName}</Text> : null}

                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="contact@example.com"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {formErrors.email ? <Text style={styles.fieldError}>{formErrors.email}</Text> : null}

                <Text style={styles.label}>Banner image URL</Text>
                <TextInput
                  style={[styles.input, formErrors.bannerUrl && styles.inputError]}
                  value={bannerUrl}
                  onChangeText={setBannerUrl}
                  placeholder="https://example.com/banner.png"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />
                {formErrors.bannerUrl ? <Text style={styles.fieldError}>{formErrors.bannerUrl}</Text> : null}

                <Text style={styles.label}>Click-through URL (optional)</Text>
                <TextInput
                  style={[styles.input, formErrors.linkUrl && styles.inputError]}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  placeholder="https://example.com"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />
                {formErrors.linkUrl ? <Text style={styles.fieldError}>{formErrors.linkUrl}</Text> : null}

                {bannerUrl.trim() ? (
                  <View style={styles.bannerPreviewWrap}>
                    <Image source={{ uri: bannerUrl.trim() }} style={styles.bannerPreview} contentFit="cover" />
                  </View>
                ) : null}

                <Text style={styles.formSectionTitle}>3. Run dates</Text>
                <Text style={styles.label}>Start date</Text>
                <TextInput
                  style={[styles.input, formErrors.dates && styles.inputError]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>End date</Text>
                <TextInput
                  style={[styles.input, formErrors.dates && styles.inputError]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />
                {formErrors.dates ? <Text style={styles.fieldError}>{formErrors.dates}</Text> : null}

                <Pressable
                  style={[styles.checkboxRow, formErrors.agreedToTerms && styles.checkboxRowError]}
                  onPress={() => setAgreedToTerms((current) => !current)}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms ? <Ionicons name="checkmark" size={14} color="#04120f" /> : null}
                  </View>
                  <Text style={styles.checkboxText}>I accept the advertising rate terms and submission review process.</Text>
                </Pressable>
                {formErrors.agreedToTerms ? <Text style={styles.fieldError}>{formErrors.agreedToTerms}</Text> : null}

                {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
                {submitSuccess ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successTitle}>Application received</Text>
                    <Text style={styles.successBody}>
                      Your request was submitted successfully. We will review the banner placement and follow up by email.
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  style={[
                    styles.submitButton,
                    (submitting || communitiesLoading || checkingAvailability) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || communitiesLoading || checkingAvailability}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#04120f" />
                  ) : (
                    <Ionicons name="send" size={18} color="#04120f" />
                  )}
                  <Text style={styles.submitButtonText}>{submitting ? "Submitting..." : "Send application"}</Text>
                </Pressable>
              </View>

              <View style={[styles.sidebar, isDesktop && styles.sidebarDesktop]}>
                <View style={[styles.panel, styles.summaryPanel]}>
                  <Text style={styles.panelTitle}>Live campaign summary</Text>
                  <Text style={styles.summaryRow}>Community: {selectedCommunity?.name ?? "Select a community"}</Text>
                  <Text style={styles.summaryRow}>
                    Members: {pricingLoading ? "Loading..." : pricing?.memberCount?.toLocaleString() ?? "--"}
                  </Text>
                  <Text style={styles.summaryRow}>
                    Daily rate: {pricingLoading ? "Loading..." : pricing ? formatCurrencyLikeTickets(pricing.dailyRate) : "--"}
                  </Text>
                  <Text style={styles.summaryRow}>Duration: {pricingSummary.days || 0} day(s)</Text>
                  <Text style={[styles.summaryRow, styles.summaryTotal]}>
                    Total: {pricingSummary.totalAmount ? formatCurrencyLikeTickets(pricingSummary.totalAmount) : "--"}
                  </Text>
                  {availabilityMessage ? (
                    <Text
                      style={[
                        styles.availabilityNote,
                        availability?.available === false ? styles.availabilityNoteError : styles.availabilityNoteOk,
                      ]}
                    >
                      {availabilityMessage}
                    </Text>
                  ) : null}
                  {formErrors.availability ? <Text style={styles.fieldError}>{formErrors.availability}</Text> : null}
                </View>

                <View style={[styles.panel, styles.summaryPanel]}>
                  <Text style={styles.panelTitle}>Submission checklist</Text>
                  <Text style={styles.helperListItem}>Use a direct image URL for the banner creative.</Text>
                  <Text style={styles.helperListItem}>Pick dates that satisfy the live minimum spend.</Text>
                  <Text style={styles.helperListItem}>Applications are saved as pending for moderation review.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  heroSection: {
    paddingBottom: 24,
  },
  heroShell: {
    width: "100%",
    alignSelf: "center",
    gap: 20,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  backButtonText: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 12,
  },
  heroGrid: {
    gap: 20,
  },
  heroGridDesktop: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroCopy: {
    gap: 16,
  },
  heroCopyDesktop: {
    flex: 1.05,
  },
  eyebrow: {
    color: C.accent,
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 46,
    lineHeight: 48,
  },
  heroBody: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 660,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.accent,
  },
  primaryCtaText: {
    color: "#04120f",
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  secondaryCta: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  secondaryCtaText: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 13,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    minWidth: 160,
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statLabel: {
    color: C.textMuted,
    fontFamily: F.mono,
    fontSize: 11,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  statValue: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    lineHeight: 26,
  },
  heroVisual: {
    gap: 10,
  },
  heroVisualDesktop: {
    flex: 0.95,
  },
  exampleBannerWrap: {
    width: "100%",
    aspectRatio: TEMP_BANNER_ASPECT,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#0a0a0a",
    padding: 12,
    justifyContent: "center",
  },
  exampleBanner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
  visualCaption: {
    color: C.textMuted,
    fontFamily: F.mono,
    fontSize: 12,
  },
  section: {
    paddingTop: 12,
  },
  sectionInner: {
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  sectionTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 34,
    lineHeight: 36,
  },
  featureGrid: {
    gap: 12,
  },
  featureGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 10,
  },
  featureTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    lineHeight: 26,
  },
  featureBody: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 21,
  },
  pricingGrid: {
    gap: 12,
  },
  pricingGridDesktop: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  panel: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 10,
  },
  pricingPanel: {
    flex: 1.1,
  },
  notesPanel: {
    flex: 0.9,
  },
  panelTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    lineHeight: 26,
  },
  panelBody: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 21,
  },
  pricingList: {
    gap: 6,
    marginTop: 4,
  },
  pricingListRow: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  errorNote: {
    color: C.live,
    fontFamily: F.mono,
    fontSize: 12,
  },
  processShell: {
    paddingVertical: 4,
  },
  processGrid: {
    gap: 12,
  },
  processGridDesktop: {
    flexDirection: "row",
  },
  processCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 10,
  },
  processBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
  },
  processBadgeText: {
    color: "#04120f",
    fontFamily: F.display,
    fontSize: 18,
  },
  processText: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 21,
  },
  formGrid: {
    gap: 12,
  },
  formGridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  formPanel: {
    flex: 1.1,
  },
  sidebar: {
    gap: 12,
  },
  sidebarDesktop: {
    flex: 0.85,
    minWidth: 320,
  },
  formSectionTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    lineHeight: 26,
    marginTop: 6,
  },
  helperText: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    backgroundColor: C.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.text,
    fontFamily: F.mono,
    fontSize: 14,
  },
  inputError: {
    borderColor: C.live,
  },
  label: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 18,
    marginTop: 8,
  },
  communityResultWrap: {
    gap: 8,
    marginTop: 6,
  },
  communityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface2,
  },
  communityOptionActive: {
    borderColor: C.accent,
    backgroundColor: "rgba(0,255,204,0.06)",
  },
  communityThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.surface3,
  },
  communityMeta: {
    flex: 1,
    gap: 4,
  },
  communityName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 20,
    lineHeight: 22,
  },
  communityStats: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 12,
  },
  inlineErrorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.live,
    backgroundColor: "rgba(255,77,0,0.08)",
    gap: 10,
  },
  inlineErrorText: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 12,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surface3,
  },
  retryButtonText: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 12,
  },
  bannerPreviewWrap: {
    marginTop: 8,
    width: "100%",
    aspectRatio: TEMP_BANNER_ASPECT,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: "#0a0a0a",
  },
  bannerPreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
  checkboxRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface2,
  },
  checkboxRowError: {
    borderColor: C.live,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: C.accent,
  },
  checkboxText: {
    flex: 1,
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  fieldError: {
    color: C.live,
    fontFamily: F.mono,
    fontSize: 12,
  },
  submitError: {
    color: C.live,
    fontFamily: F.mono,
    fontSize: 12,
    marginTop: 4,
  },
  successBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: "rgba(0,255,204,0.08)",
    gap: 6,
  },
  successTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    lineHeight: 26,
  },
  successBody: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.accent,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "#04120f",
    fontFamily: F.display,
    fontSize: 20,
    letterSpacing: 0.4,
  },
  summaryPanel: {
    gap: 8,
  },
  summaryRow: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  summaryTotal: {
    color: C.text,
    fontSize: 14,
  },
  availabilityNote: {
    fontFamily: F.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  availabilityNoteOk: {
    color: C.accent,
  },
  availabilityNoteError: {
    color: C.live,
  },
  helperListItem: {
    color: C.textSec,
    fontFamily: F.mono,
    fontSize: 12,
    lineHeight: 20,
  },
});
