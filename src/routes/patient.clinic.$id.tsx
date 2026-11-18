import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AvatarActionSheet } from "@/components/AvatarActionSheet";
import { EditProfileModal } from "@/components/clinic-detail/EditProfileModal";
import { StoryFileInput } from "@/components/clinic-detail/StoryFileInput";
import { CreateSheet } from "@/components/clinic-detail/CreateSheet";
import { PendingStoryModal } from "@/components/clinic-detail/PendingStoryModal";
import { NewHighlightModal } from "@/components/clinic-detail/NewHighlightModal";
import { UrgentAlertModal } from "@/components/clinic-detail/UrgentAlertModal";
import { ClinicDetailHeader } from "@/components/clinic-detail/ClinicDetailHeader";
import { ClinicInfoTab } from "@/components/clinic-detail/ClinicInfoTab";
import { ClinicPostsTab } from "@/components/clinic-detail/ClinicPostsTab";
import { ClinicReviewsTab } from "@/components/clinic-detail/ClinicReviewsTab";
import { PostViewer } from "@/components/PostViewer";
const StoryViewer = lazy(() =>
  import("@/components/StoryViewer").then((m) => ({ default: m.StoryViewer })),
);
import { deleteStory, removeClinicAvatar } from "@/lib/stories";
import { loadPostsSocial } from "@/lib/post-social";
import { PatientAuthModal } from "@/components/PatientAuthModal";
import { QuickBookingDrawer } from "@/components/booking/QuickBookingDrawer";
import { useClinicDetail } from "@/hooks/use-clinic-detail";
import { getClinicById, getSpecialty } from "@/lib/mock-data";
import { uploadClinicMedia } from "@/lib/clinic-profile";

export const Route = createFileRoute("/patient/clinic/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "تفاصيل العيادة — سند" },
      {
        name: "description",
        content:
          "صفحة العيادة على سند: بيانات الطبيب، التخصص، العنوان، مواعيد العمل، الصور والتقييمات وطرق التواصل.",
      },
    ],
  }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const {
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
    setPatient,
    authOpen,
    setAuthOpen,
    pendingAction,
    requirePatient,
    backTarget,
    handleBack,
  } = useClinicDetail();
  if (!loaded)
    return (
      <AppShell title="جاري التحميل…" backTo={backTarget} onBack={handleBack}>
        <div />
      </AppShell>
    );
  if (!clinic) {
    return (
      <AppShell title="عيادة غير متاحة" backTo={backTarget} onBack={handleBack}>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          العيادة دي مش موجودة أو لسه ما تمّش توثيقها.
        </div>
      </AppShell>
    );
  }
  const spec = getSpecialty(clinic.specialtyId);

  return (
    <AppShell title="تفاصيل العيادة" backTo={backTarget} onBack={handleBack}>
      <ClinicDetailHeader
        id={id}
        clinic={clinic}
        specName={spec?.name ?? ""}
        extras={extras}
        setExtras={setExtras}
        stories={stories}
        isOwner={isOwner}
        following={following}
        setFollowing={setFollowing}
        busy={busy}
        setBusy={setBusy}
        tab={tab}
        setTab={setTab}
        ownerMenu={ownerMenu}
        setOwnerMenu={setOwnerMenu}
        setCreateSheet={setCreateSheet}
        setEditOpen={setEditOpen}
        setAvatarSheet={setAvatarSheet}
        setStoryView={setStoryView}
        setBookingOpen={setBookingOpen}
        setUrgentOpen={setUrgentOpen}
        postInputRef={postInputRef}
        storyInputRef={storyInputRef}
        storyTargetHighlight={storyTargetHighlight}
        requirePatient={requirePatient}
        shareProfile={shareProfile}
        navigate={navigate}
        pendingAction={pendingAction}
        setAuthOpen={setAuthOpen}
        refreshExtras={refreshExtras}
      />

      {(tab === "posts" || tab === "reels") && (
        <ClinicPostsTab
          tab={tab}
          clinic={clinic}
          stories={stories}
          isOwner={isOwner}
          extras={extras}
          social={social}
          busy={busy}
          setBusy={setBusy}
          postInputRef={postInputRef}
          storyInputRef={storyInputRef}
          storyTargetHighlight={storyTargetHighlight}
          setViewerIndex={setViewerIndex}
          setStoryView={setStoryView}
          setHlPicked={setHlPicked}
          setHlMsg={setHlMsg}
          setNewHighlight={setNewHighlight}
          refreshStories={refreshStories}
          refreshExtras={refreshExtras}
        />
      )}

      {tab === "info" && (
        <ClinicInfoTab clinic={clinic} extras={extras} specName={spec?.name ?? ""} />
      )}

      {tab === "reviews" && (
        <ClinicReviewsTab
          id={id}
          clinic={clinic}
          extras={extras}
          reviews={reviews}
          setReviews={setReviews}
          isOwner={isOwner}
          reviewRating={reviewRating}
          setReviewRating={setReviewRating}
          reviewCode={reviewCode}
          setReviewCode={setReviewCode}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          reviewMsg={reviewMsg}
          setReviewMsg={setReviewMsg}
          busy={busy}
          setBusy={setBusy}
          requirePatient={requirePatient}
          refreshExtras={refreshExtras}
        />
      )}

      {authOpen && (
        <PatientAuthModal
          title={pendingAction.current ? undefined : "بياناتك للمتابعة"}
          onClose={() => {
            pendingAction.current = null;
            setAuthOpen(false);
          }}
          onDone={(s) => {
            setPatient(s);
            setAuthOpen(false);
            const act = pendingAction.current;
            pendingAction.current = null;
            if (act) act(s);
          }}
        />
      )}

      {editOpen && isOwner && (
        <EditProfileModal
          clinic={clinic}
          initialBio={extras?.bio ?? ""}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            const c = await getClinicById(id);
            if (c) setClinic(c);
            await refreshExtras();
          }}
        />
      )}

      {viewerIndex !== null && (extras?.posts.length ?? 0) > 0 && (
        <PostViewer
          posts={extras!.posts}
          startIndex={viewerIndex}
          doctor={clinic.doctor}
          isVerified={clinic.isVerified}
          isOwner={isOwner}
          onClose={async () => {
            setViewerIndex(null);
            const ids = (extras?.posts ?? []).map((p) => p.id);
            if (ids.length) setSocial(await loadPostsSocial(ids));
          }}
        />
      )}

      {shareToast && (
        <div className="fixed inset-x-0 bottom-6 z-[80] flex justify-center">
          <span className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">
            {shareToast}
          </span>
        </div>
      )}

      {isOwner && (
        <StoryFileInput
          id={id}
          storyInputRef={storyInputRef}
          storyTargetHighlight={storyTargetHighlight}
          setPendingStory={setPendingStory}
          setStoryHours={setStoryHours}
          setBusy={setBusy}
          setShareToast={setShareToast}
          refreshStories={refreshStories}
        />
      )}

      {isOwner && createSheet && (
        <CreateSheet
          setCreateSheet={setCreateSheet}
          storyTargetHighlight={storyTargetHighlight}
          storyInputRef={storyInputRef}
          setUrgentOpen={setUrgentOpen}
          setHlPicked={setHlPicked}
          setHlMsg={setHlMsg}
          setNewHighlight={setNewHighlight}
          postInputRef={postInputRef}
        />
      )}

      {isOwner && pendingStory && (
        <PendingStoryModal
          id={id}
          pendingStory={pendingStory}
          setPendingStory={setPendingStory}
          storyHours={storyHours}
          setStoryHours={setStoryHours}
          busy={busy}
          setBusy={setBusy}
          setShareToast={setShareToast}
          refreshStories={refreshStories}
        />
      )}

      {storyView && (
        <Suspense fallback={null}>
          <StoryViewer
            items={storyView.items}
            title={storyView.title}
            isOwner={isOwner}
            onClose={() => setStoryView(null)}
            onDelete={async (storyId) => {
              try {
                if (!(await deleteStory(storyId))) {
                  toast.error("تعذر حذف القصة.");
                  return;
                }
              } catch (error) {
                console.error("[ClinicDetail] Failed to delete story:", error);
                toast.error("تعذر حذف القصة.");
                return;
              }
              setStoryView(null);
              await refreshStories();
            }}
          />
        </Suspense>
      )}

      {newHighlight && isOwner && (
        <NewHighlightModal
          id={id}
          stories={stories}
          hlTitle={hlTitle}
          setHlTitle={setHlTitle}
          hlEmoji={hlEmoji}
          hlPicked={hlPicked}
          setHlPicked={setHlPicked}
          hlMsg={hlMsg}
          setHlMsg={setHlMsg}
          busy={busy}
          setBusy={setBusy}
          setNewHighlight={setNewHighlight}
          storyTargetHighlight={storyTargetHighlight}
          storyInputRef={storyInputRef}
          refreshStories={refreshStories}
        />
      )}

      {isOwner && (
        <AvatarActionSheet
          open={avatarSheet}
          onClose={() => setAvatarSheet(false)}
          hasPhoto={Boolean(extras?.avatarUrl)}
          busy={busy === "avatar"}
          onViewStory={
            stories.stories.length
              ? () => setStoryView({ items: stories.stories, title: clinic.doctor })
              : undefined
          }
          onFile={async (file) => {
            setBusy("avatar");
            const res = await uploadClinicMedia({ clinicId: id, kind: "avatar", file });
            setBusy(null);
            setAvatarSheet(false);
            setAvatarMsg(
              res.ok
                ? "تم تحديث الصورة ✅"
                : res.error === "FILE_TOO_LARGE"
                  ? "الصورة كبيرة جداً (الحد ٥ ميجا)."
                  : "تعذر رفع الصورة.",
            );
            if (res.ok) await refreshExtras();
            setTimeout(() => setAvatarMsg(""), 2500);
          }}
          onRemove={async () => {
            setBusy("avatar");
            const ok = await removeClinicAvatar(id);
            setBusy(null);
            setAvatarSheet(false);
            setAvatarMsg(ok ? "تم حذف الصورة" : "تعذر حذف الصورة.");
            if (ok) await refreshExtras();
            setTimeout(() => setAvatarMsg(""), 2500);
          }}
        />
      )}
      {avatarMsg && (
        <div className="fixed inset-x-0 bottom-24 z-[130] mx-auto w-fit rounded-full bg-card px-4 py-2 text-xs font-bold shadow-lg">
          {avatarMsg}
        </div>
      )}

      {urgentOpen && isOwner && (
        <UrgentAlertModal
          id={id}
          urgentText={urgentText}
          setUrgentText={setUrgentText}
          setUrgentOpen={setUrgentOpen}
          busy={busy}
          setBusy={setBusy}
          refreshStories={refreshStories}
        />
      )}
      <QuickBookingDrawer clinic={clinic} isOpen={bookingOpen} onOpenChange={setBookingOpen} />
    </AppShell>
  );
}
