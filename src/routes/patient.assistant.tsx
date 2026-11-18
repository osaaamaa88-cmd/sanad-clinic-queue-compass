import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { setVoiceMuted, setSeniorMode } from "@/lib/voice";
import { AppShell } from "@/components/AppShell";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { NemoFaceSvg } from "@/components/NemoFaceSvg";
import { NemoBreathingCard } from "@/components/NemoBreathingCard";
import { savePatientLocation } from "@/lib/patient-location";
import { NemoFace } from "@/components/nemo/NemoFace";
import { NemoPainScale } from "@/components/nemo/NemoPainScale";
import { NemoComposer } from "@/components/nemo/NemoComposer";
import { NemoCareCards } from "@/components/nemo/NemoCareCards";
import { useNemoChat } from "@/hooks/use-nemo-chat";

export const Route = createFileRoute("/patient/assistant")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سند — نيمو رفيق الرعاية الصحية" },
      {
        name: "description",
        content: "تحدث مع نيمو، رفيقك الصحي، واكتشف التخصص والعيادة المناسبة.",
      },
      { property: "og:title", content: "سند — نيمو رفيق الرعاية الصحية" },
      {
        property: "og:description",
        content: "رفيق صحي ودود يساعدك على فهم الأعراض والعثور على الرعاية المناسبة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const {
    need,
    setNeed,
    loc,
    setLoc,
    picker,
    setPicker,
    analyzingImage,
    loading,
    happy,
    speaking,
    listening,
    handsFree,
    muted,
    senior,
    painLevel,
    painScaleDismissed,
    chatMessages,
    speakingMessageId,
    result,
    urgent,
    mentionsPain,
    mentionsMedication,
    mentionsLab,
    mentionsAnxiety,
    hasPatientMessages,
    showCareRecommendations,
    nearestClinic,
    relevantHospital,
    selfHarmFlag,
    chatContainerRef,
    chatEndRef,
    cameraInputRef,
    galleryInputRef,
    consent,
    toggleListening,
    playNemoMessage,
    selectPain,
    setPainScaleDismissed,
    submit,
    analyzeMedicalImage,
    finishSession,
  } = useNemoChat();

  return (
    <AppShell
      title="نيمو | رفيق الرعاية الصحية"
      subtitle="أنا هنا أسمعك وأساعدك بهدوء"
      backTo="/patient"
      tone="light"
      fullHeight
    >
      <div
        ref={chatContainerRef}
        className="ios-scroll mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3 overflow-y-auto pb-28 text-foreground"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void analyzeMedicalImage(file);
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void analyzeMedicalImage(file);
          }}
        />
        <section className="order-1 flex shrink-0 items-center gap-3 overflow-hidden rounded-3xl border border-primary/20 bg-card/85 bg-gradient-to-l from-primary/10 via-card/90 to-card/85 px-3 py-2 shadow-soft backdrop-blur-xl">
          <div className="relative shrink-0">
            <span
              className={`absolute -inset-2 rounded-full bg-primary/20 blur-lg ${speaking || listening ? "opacity-100" : "opacity-30"} transition-opacity duration-700`}
            />
            <NemoFace
              speaking={speaking || listening}
              listening={handsFree}
              emergency={urgent}
              happy={happy}
              onActivate={toggleListening}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-extrabold text-foreground">
                نيمو، رفيقك الصحي
              </h2>
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-1 truncate text-xs leading-5 text-muted-foreground" aria-live="polite">
              {listening
                ? "نيمو بيسمعك… اتكلم براحتك"
                : speaking
                  ? "نيمو بيتكلم معاك بهدوء"
                  : "اضغط على نيمو للتحدث"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSeniorMode(!senior)}
            role="switch"
            aria-checked={senior}
            aria-label="وضع كبار السن — ردود صوتية تلقائية وأزرار أكبر"
            title="وضع كبار السن — ردود صوتية تلقائية وأزرار أكبر"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              senior
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <span aria-hidden="true">👵</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {senior ? "وضع كبار السن مُفعّل" : "وضع كبار السن متوقف"}
          </span>
          <button
            type="button"
            onClick={() => setVoiceMuted(!muted)}
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            aria-pressed={muted}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </section>
        <p className="order-1 -mt-2 px-2 text-xs leading-5 text-muted-foreground">
          نيمو للإرشاد فقط ولا يغني عن الطبيب. في الطوارئ اتصل بالإسعاف 123.
        </p>

        <section
          aria-label="محادثتك مع نيمو"
          aria-live="polite"
          className="order-2 flex-auto space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm"
        >
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`nemo-chat-message scroll-mb-36 flex items-end gap-2 ${message.role === "patient" ? "justify-start" : "justify-end"}`}
            >
              {message.role === "nemo" && (
                <NemoFaceSvg
                  className="h-9 w-11 shrink-0 drop-shadow-[0_1px_4px_rgba(34,211,238,0.25)]"
                  aria-hidden="true"
                />
              )}
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-6 ${
                  senior ? "text-base" : "text-sm"
                } ${
                  message.role === "patient"
                    ? "rounded-tr-md bg-secondary text-foreground"
                    : "rounded-tl-md border border-primary/20 bg-primary/10 text-foreground"
                }`}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="صورة أرسلها المريض لنيمو لتحليلها"
                    className="mb-2 max-h-48 max-w-full rounded-xl object-contain"
                  />
                )}
                {message.role === "nemo" && (
                  <span className="mb-1 block text-xs font-extrabold text-primary">نيمو 🫧</span>
                )}
                {message.text}
              </div>
              {message.role === "nemo" && (
                <button
                  type="button"
                  onClick={() => playNemoMessage(message)}
                  aria-label={
                    speaking && speakingMessageId === message.id
                      ? "إيقاف قراءة رسالة نيمو"
                      : "استمع إلى رسالة نيمو"
                  }
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    speaking && speakingMessageId === message.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/15"
                  }`}
                >
                  {speaking && speakingMessageId === message.id ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <p className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-primary/10 px-3 py-2 text-xs text-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {analyzingImage ? "نيمو بيحلل الصورة…" : "نيمو بيدوّر على التخصص المناسب"}
              </p>
            </div>
          )}
        </section>

        <NemoPainScale
          showScale={mentionsPain || painLevel !== null}
          painLevel={painLevel}
          dismissed={painScaleDismissed}
          urgent={urgent}
          onSelect={selectPain}
          onDismiss={() => setPainScaleDismissed(true)}
          onReopen={() => setPainScaleDismissed(false)}
        />
        {!hasPatientMessages && !loading && (
          <div aria-label="أمثلة سريعة" className="order-3 flex flex-wrap justify-center gap-2">
            {[
              "عندي صداع جامد من الصبح",
              "بطني بتوجعني ومش قادر أنام",
              "عندي ضيق في التنفس",
              "محتاج أقرب مستشفى طوارئ",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void submit(example)}
                className="min-h-11 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-foreground transition active:scale-95 hover:bg-primary/15"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <NemoComposer
          need={need}
          onNeedChange={setNeed}
          onSubmit={(text) => void submit(text)}
          listening={listening}
          handsFree={handsFree}
          loading={loading}
          happy={happy}
          senior={senior}
          onCameraClick={() => cameraInputRef.current?.click()}
          onGalleryClick={() => galleryInputRef.current?.click()}
          onToggleListening={() => void toggleListening()}
        />

        <NemoCareCards
          showRecommendations={showCareRecommendations}
          result={result}
          urgent={urgent}
          nearestClinic={nearestClinic}
          relevantHospital={relevantHospital}
          onChangeLocation={() => setPicker(true)}
          mentionsMedication={mentionsMedication}
          mentionsLab={mentionsLab}
          selfHarmFlag={selfHarmFlag}
          painLevel={painLevel}
        >
          {!urgent && !selfHarmFlag && !mentionsAnxiety && <NemoBreathingCard />}
        </NemoCareCards>

        {mentionsAnxiety && <NemoBreathingCard forceOpen />}

        {hasPatientMessages && (
          <div className="order-8 space-y-3">
            {!happy ? (
              <button
                type="button"
                onClick={finishSession}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-extrabold text-foreground shadow-soft transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Check className="h-4 w-4 text-primary" />
                إنهاء المحادثة
              </button>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm font-bold text-foreground">انتهت المحادثة</p>
                <p className="mt-1 text-xs text-muted-foreground">شكراً لاستخدامك نيمو.</p>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {consent.dialog}
      {picker && (
        <LocationPickerModal
          current={loc}
          onSelect={(location) => {
            savePatientLocation(location);
            setLoc(location);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </AppShell>
  );
}
