import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { StoryViewer } from "@/components/StoryViewer";
import { svrFollowedStories } from "@/lib/community.functions";
import { getFollowerKey } from "@/lib/clinic-profile";
import { getClinicStories, type StoryItem } from "@/lib/stories";
import sanadLogo from "@/assets/sanad-logo.png";
import {
  deleteMemberStory,
  fetchMemberStories,
  fetchStoryViewers,
  markMemberStoryViewed,
  type MemberStoryGroup,
} from "./member-stories";
import { StoryComposer } from "./StoryComposer";

const TIPS: StoryItem[] = [
  { bg: "ocean", text: "🚶 30 دقيقة مشي يومياً تحمي قلبك وتحسّن مزاجك" },
  { bg: "emerald", text: "💧 اشرب 8 أكواب ماء موزعة على اليوم" },
  { bg: "gold", text: "😴 نوم 7-8 ساعات يقوّي مناعتك وذاكرتك" },
  { bg: "lavender", text: "🥗 أضف سلطة خضراء لوجبتين يومياً" },
].map((t, i) => ({
  id: `sanad-tip-${i}`,
  url: "",
  mediaType: "image" as const,
  caption: t.text,
  kind: "story" as const,
  highlightId: null,
  createdAt: new Date().toISOString(),
  tag: `card:${t.bg}:alexandria`,
}));

type Clinic = { id: string; doctor: string; avatar: string; phone: string; hasStory: boolean };

function Circle({
  label,
  ring,
  onClick,
  children,
}: {
  label: string;
  ring: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[68px] shrink-0 flex-col items-center gap-1 active:scale-95 transition-transform"
    >
      <span
        className={`block rounded-full p-[2.5px] ${ring ? "gradient-story" : "bg-border"}`}
      >
        <span className="grid h-[63px] w-[63px] place-items-center overflow-hidden rounded-full border-2 border-background bg-secondary">
          {children}
        </span>
      </span>
      <span className="w-full truncate text-center text-xs font-bold">{label}</span>
    </button>
  );
}

export function StoriesRow({
  isDoctor,
  userId,
  userName,
  requireAuth,
}: {
  isDoctor: boolean;
  userId: string | null;
  userName: string;
  requireAuth: () => boolean;
}) {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [members, setMembers] = useState<MemberStoryGroup[]>([]);
  const [composing, setComposing] = useState(false);
  const [member, setMember] = useState<MemberStoryGroup | null>(null);
  const loadMembers = () => void fetchMemberStories(userId).then(setMembers);
  const [open, setOpen] = useState<{
    items: StoryItem[];
    title: string;
    avatar?: string;
    clinicId?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    void svrFollowedStories({ data: { followerKey: getFollowerKey() } })
      .then((r) => setClinics(r.clinics))
      .catch(() => {});
  }, []);

  useEffect(loadMembers, [userId]);
  const mine = members.find((g) => g.authorId === userId);
  const others = members.filter((g) => g.authorId !== userId);

  const openClinic = async (c: Clinic) => {
    const s = await getClinicStories(c.id);
    if (s.stories.length)
      setOpen({ items: s.stories, title: c.doctor, avatar: c.avatar, clinicId: c.id, phone: c.phone });
    else void navigate({ to: "/patient/clinic/$id", params: { id: c.id } });
  };

  return (
    <>
      <div className="-mx-4 flex max-h-[100px] gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
        {isDoctor ? (
          <Circle label="قصة العيادة" ring={false} onClick={() => void navigate({ to: "/doctor/stories" })}>
            <Plus className="h-6 w-6 text-primary" />
          </Circle>
        ) : (
          <Circle
            label={mine ? "حالتي" : "أضف حالة"}
            ring={!!mine}
            onClick={() => (mine ? setMember(mine) : requireAuth() && setComposing(true))}
          >
            <Plus className="h-6 w-6 text-primary" />
          </Circle>
        )}
        {mine && !isDoctor && (
          <Circle label="حالة جديدة" ring={false} onClick={() => setComposing(true)}>
            <Plus className="h-6 w-6 text-muted-foreground" />
          </Circle>
        )}
        <Circle label="نصائح سند" ring onClick={() => setOpen({ items: TIPS, title: "نصائح سند" })}>
          <img src={sanadLogo} alt="" className="h-10 w-10 object-contain" />
        </Circle>
        {clinics.map((c) => (
          <Circle key={c.id} label={c.doctor} ring={c.hasStory} onClick={() => void openClinic(c)}>
            {c.avatar ? (
              <img src={c.avatar} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-black text-primary">
                {c.doctor.replace(/^د\.?\s*/, "").charAt(0)}
              </span>
            )}
          </Circle>
        ))}
        {others.map((g) => (
          <Circle key={g.authorId} label={g.authorName} ring={!g.allViewed} onClick={() => setMember(g)}>
            <span className="text-lg font-black text-primary">{g.authorName.charAt(0)}</span>
          </Circle>
        ))}
      </div>
      {composing && userId && (
        <StoryComposer
          userId={userId}
          userName={userName}
          onClose={() => setComposing(false)}
          onDone={() => {
            setComposing(false);
            loadMembers();
          }}
        />
      )}
      {member && (
        <StoryViewer
          items={member.items}
          title={member.authorId === userId ? "حالتي" : member.authorName}
          isOwner={member.authorId === userId}
          onView={(id) => userId && void markMemberStoryViewed(id, userId, userName)}
          loadViewers={fetchStoryViewers}
          onDelete={async (id) => {
            await deleteMemberStory(id).catch(() => {});
            setMember(null);
            loadMembers();
          }}
          onClose={() => {
            setMember(null);
            loadMembers();
          }}
        />
      )}
      {open && (
        <StoryViewer
          items={open.items}
          title={open.title}
          avatar={open.avatar}
          clinicId={open.clinicId}
          phone={open.phone}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
