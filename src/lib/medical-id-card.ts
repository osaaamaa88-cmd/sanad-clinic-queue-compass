export type MedicalId = {
  bloodType: string;
  allergies: string;
  conditions: string;
  emergencyPhone: string;
};

const MEDICAL_ID_KEY = "sanad_medical_id_v1";

const EMPTY_MEDICAL_ID: MedicalId = {
  bloodType: "",
  allergies: "",
  conditions: "",
  emergencyPhone: "",
};

export function loadMedicalId(): MedicalId {
  if (typeof window === "undefined") return { ...EMPTY_MEDICAL_ID };
  try {
    return {
      ...EMPTY_MEDICAL_ID,
      ...(JSON.parse(localStorage.getItem(MEDICAL_ID_KEY) || "{}") as Partial<MedicalId>),
    };
  } catch {
    return { ...EMPTY_MEDICAL_ID };
  }
}

export function saveMedicalId(data: MedicalId) {
  localStorage.setItem(MEDICAL_ID_KEY, JSON.stringify(data));
}

/** Renders the emergency (Medical ID) card as a 1080×1920 canvas image. */
export function renderMedicalId(data: MedicalId): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز صورة البطاقة");

  const ctx = context;
  const width = canvas.width;
  const right = width - 88;
  const maxTextWidth = width - 220;
  const linesFor = (text: string, font: string) => {
    ctx.font = font;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ["غير محدد"];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width <= maxTextWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const character of word) {
        if (line && ctx.measureText(line + character).width > maxTextWidth) {
          lines.push(line);
          line = character;
        } else {
          line += character;
        }
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const background = ctx.createLinearGradient(0, 0, width, canvas.height);
  background.addColorStop(0, "#071f2b");
  background.addColorStop(0.55, "#0f766e");
  background.addColorStop(1, "#082f49");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, canvas.height);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(990, 120, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(70, 1710, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#a7f3d0";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("سند  |  SANAD", right, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 66px sans-serif";
  ctx.fillText("كارت طوارئ", right, 250);
  ctx.font = "36px sans-serif";
  ctx.fillStyle = "#d1fae5";
  ctx.fillText("MEDICAL ID  •  معلومات مهمة للمسعفين", right, 315);

  const cardX = 64;
  const cardWidth = width - cardX * 2;
  const cardY = 405;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, 1090, 38);
  ctx.fill();

  const entries = [
    { label: "فصيلة الدم", value: data.bloodType },
    { label: "الحساسية الدوائية", value: data.allergies },
    { label: "الأمراض المزمنة", value: data.conditions },
    { label: "هاتف شخص للطوارئ", value: data.emergencyPhone },
  ];
  let y = cardY + 88;
  for (const [index, entry] of entries.entries()) {
    ctx.fillStyle = "#0f766e";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(entry.label, right - 20, y);
    y += 56;
    const valueLines = linesFor(entry.value || "غير محدد", "bold 42px sans-serif");
    ctx.fillStyle = "#102a32";
    ctx.font = "bold 42px sans-serif";
    for (const line of valueLines) {
      ctx.fillText(line, right - 20, y);
      y += 54;
    }
    y += 34;
    if (index < entries.length - 1) {
      ctx.strokeStyle = "#dce8e7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cardX + 42, y - 15);
      ctx.lineTo(width - cardX - 42, y - 15);
      ctx.stroke();
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("في حالة الطوارئ، يُرجى التواصل مع الشخص المذكور", width / 2, 1625);
  ctx.fillStyle = "#d1fae5";
  ctx.font = "28px sans-serif";
  ctx.fillText("هذه المعلومات مقدمة من صاحبها وتساعد الفريق الطبي", width / 2, 1680);
  ctx.fillText("سند | SANAD — رفيقك الصحي", width / 2, 1790);
  return canvas;
}
