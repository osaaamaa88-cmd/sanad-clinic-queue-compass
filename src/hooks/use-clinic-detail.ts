import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { clinicShareUrl, loadPostsSocial, shareLink, type PostSocial } from "@/lib/post-social";
import { listClinicReviews, type ClinicReview } from "@/lib/reviews";
import {
  getPatientSession,
  syncPatientSessionFromAuth,
  type PatientSession,
} from "@/lib/patient-session";
import {
  getClinicById,
  getMyClinicMembership,
  getVerifiedClinic,
  subscribeClinic,
  type Clinic,
} from "@/lib/mock-data";
import {
  getClinicProfileExtras,
  isFollowingClinic,
  type ClinicProfileExtras,
} from "@/lib/clinic-profile";
import { getClinicStories, type ClinicStories, type StoryItem } from "@/lib/stories";

/**
 * All state, data loading and shared handlers for the clinic detail page.
 * ClinicDetail itself keeps only the JSX; tabs and overlays take what they
 * need from this hook's return value. The single `busy` flag is intentionally
 * shared: only one owner action (post / story / highlight / avatar / urgent /
 * review) runs at a time, and the flag also drives the matching spinners.
 */
export function useClinicDetail() {
  const { id } = useParams({ from: "/patient/clinic/$id" });
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerMenu, setOwnerMenu] = useState(false);
  const [createSheet, setCreateSheet] = useState(false);
  const [pendingStory, setPendingStory] = useState<{ file: File; url: string } | null>(null);
  const [storyHours, setStoryHours] = useState<12 | 24>(24);
  const [extras, setExtras] = useState<ClinicProfileExtras | null>(null);
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const postInputRef = useRef<HTMLInputElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [social, setSocial] = useState<PostSocial>({ likes: {}, liked: {}, comments: {} });
  const [shareToast, setShareToast] = useState("");
  const [stories, setStories] = useState<ClinicStories>({ stories: [], highlights: [] });
  const [storyView, setStoryView] = useState<{ items: StoryItem[]; title: string } | null>(null);
  const [newHighlight, setNewHighlight] = useState(false);
  const [hlTitle, setHlTitle] = useState("");
  const [hlEmoji] = useState("✨");
  const [hlPicked, setHlPicked] = useState<string[]>([]);
  const [hlMsg, setHlMsg] = useState("");
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [urgentText, setUrgentText] = useState("");
  const storyInputRef = useRef<HTMLInputElement>(null);
  const storyTargetHighlight = useRef<string | null>(null);
  const [reviews, setReviews] = useState<ClinicReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCode, setReviewCode] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    listClinicReviews(id).then(setReviews);
  }, [id]);

  const refreshStories = useCallback(async () => {
    setStories(await getClinicStories(id));
  }, [id]);

  const refreshExtras = useCallback(async () => {
    setExtras(await getClinicProfileExtras(id));
  }, [id]);

  useEffect(() => {
    refreshStories();
  }, [refreshStories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const membership = await getMyClinicMembership().catch(() => null);
      const owner = membership?.clinic?.id === id;
      const c = owner ? await getClinicById(id) : await getVerifiedClinic(id);
      if (cancelled) return;
      setIsOwner(!!owner);
      setClinic(c);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Profile extras and follow state; clinic subscriptions provide live clinic updates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [e, f] = await Promise.all([getClinicProfileExtras(id), isFollowingClinic(id)]);
      if (cancelled) return;
      setExtras(e);
      setFollowing(f);
    })();
    const unsub = subscribeClinic(id, setClinic);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  // Real like / comment counters for the grid, plus deep-link (?post=) opening.
  useEffect(() => {
    const ids = (extras?.posts ?? []).map((p) => p.id);
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const s = await loadPostsSocial(ids);
      if (!cancelled) setSocial(s);
    })();
    const target = new URLSearchParams(window.location.search).get("post");
    if (target) {
      const idx = ids.indexOf(target);
      if (idx >= 0) setViewerIndex(idx);
    }
    return () => {
      cancelled = true;
    };
  }, [extras]);

  const shareProfile = async () => {
    if (!clinic) return;
    const res = await shareLink({
      title: `${clinic.doctor} — سند`,
      text: `احجز مع ${clinic.doctor} على سند`,
      url: clinicShareUrl(clinic.id),
    });
    if (res === "copied") {
      setShareToast("تم نسخ رابط العيادة ✅");
      window.setTimeout(() => setShareToast(""), 1800);
    }
  };

  const [tab, setTab] = useState<"info" | "reviews" | "posts" | "reels">("info");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const pendingAction = useRef<((s: PatientSession) => void) | null>(null);
  /** Run an action that needs patient identity; ask guests to sign in first, then resume it. */
  const requirePatient = (action: (s: PatientSession) => void) => {
    const current = patient ?? getPatientSession();
    if (current) return action(current);
    pendingAction.current = action;
    setAuthOpen(true);
  };

  useEffect(() => {
    setPatient(getPatientSession());
    void syncPatientSessionFromAuth().then((s) => {
      if (s) setPatient(s);
    });
  }, []);

  const backTarget = isOwner ? "/doctor" : "/patient/search";
  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else void navigate({ to: backTarget });
  };

  return {
    id,
    navigate,
    clinic,
    setClinic,
    loaded,
    isOwner,
    ownerMenu,
    setOwnerMenu,
    createSheet,
    setCreateSheet,
    pendingStory,
    setPendingStory,
    storyHours,
    setStoryHours,
    extras,
    setExtras,
    following,
    setFollowing,
    editOpen,
    setEditOpen,
    busy,
    setBusy,
    postInputRef,
    viewerIndex,
    setViewerIndex,
    social,
    setSocial,
    shareToast,
    setShareToast,
    stories,
    setStories,
    storyView,
    setStoryView,
    newHighlight,
    setNewHighlight,
    hlTitle,
    setHlTitle,
    hlEmoji,
    hlPicked,
    setHlPicked,
    hlMsg,
    setHlMsg,
    avatarSheet,
    setAvatarSheet,
    avatarMsg,
    setAvatarMsg,
    urgentOpen,
    setUrgentOpen,
    urgentText,
    setUrgentText,
    storyInputRef,
    storyTargetHighlight,
    reviews,
    setReviews,
    reviewRating,
    setReviewRating,
    reviewCode,
    setReviewCode,
    reviewComment,
    setReviewComment,
    reviewMsg,
    setReviewMsg,
    refreshStories,
    refreshExtras,
    shareProfile,
    tab,
    setTab,
    bookingOpen,
    setBookingOpen,
    patient,
    setPatient,
    authOpen,
    setAuthOpen,
    pendingAction,
    requirePatient,
    backTarget,
    handleBack,
  };
}
