// Common drugs in the Egyptian market (trade name, active ingredient, form). Doctors can still type any free name.
export type Drug = { n: string; a: string; f: string };

const raw = `Augmentin 1g|Amoxicillin + Clavulanate|أقراص
Augmentin 625mg|Amoxicillin + Clavulanate|أقراص
Augmentin 457 susp|Amoxicillin + Clavulanate|شراب
Hibiotic 1g|Amoxicillin + Clavulanate|أقراص
Megamox 1g|Amoxicillin + Clavulanate|أقراص
Curam 1g|Amoxicillin + Clavulanate|أقراص
E-Mox 500mg|Amoxicillin|كبسولات
Flumox 500mg|Amoxicillin + Flucloxacillin|كبسولات
Zithromax 500mg|Azithromycin|أقراص
Xithrone 500mg|Azithromycin|أقراص
Azrolid 500mg|Azithromycin|أقراص
Klacid 500mg|Clarithromycin|أقراص
Ciprobay 500mg|Ciprofloxacin|أقراص
Ciprocin 500mg|Ciprofloxacin|أقراص
Tavanic 500mg|Levofloxacin|أقراص
Levoxin 500mg|Levofloxacin|أقراص
Ceftriaxone 1g (Rocephin)|Ceftriaxone|حقن
Cefotax 1g|Cefotaxime|حقن
Zinnat 500mg|Cefuroxime|أقراص
Suprax 400mg|Cefixime|كبسولات
Flagyl 500mg|Metronidazole|أقراص
Amrizole 500mg|Metronidazole|أقراص
Doxymycin 100mg|Doxycycline|كبسولات
Unictam 750mg|Sultamicillin|أقراص
Antinal 200mg|Nifuroxazide|كبسولات
Panadol 500mg|Paracetamol|أقراص
Panadol Extra|Paracetamol + Caffeine|أقراص
Abimol 500mg|Paracetamol|أقراص
Cetal 500mg|Paracetamol|أقراص
Cetal syrup|Paracetamol|شراب
Brufen 400mg|Ibuprofen|أقراص
Brufen 600mg|Ibuprofen|أقراص
Cataflam 50mg|Diclofenac Potassium|أقراص
Voltaren 75mg|Diclofenac Sodium|حقن
Olfen 100mg|Diclofenac|أقراص
Ketofan 50mg|Ketoprofen|كبسولات
Celebrex 200mg|Celecoxib|كبسولات
Arcoxia 90mg|Etoricoxib|أقراص
Mobic 15mg|Meloxicam|أقراص
Declophen 50mg|Diclofenac|أقراص
Alphintern|Trypsin + Chymotrypsin|أقراص
Ambezim G|Proteolytic enzymes|أقراص
Myolgin|Paracetamol + Chlorzoxazone|أقراص
Muscadol|Paracetamol + Orphenadrine|أقراص
Tramadol 50mg (Tramal)|Tramadol|كبسولات
Antodine 20mg|Famotidine|أقراص
Nexium 40mg|Esomeprazole|أقراص
Esomepex 40mg|Esomeprazole|كبسولات
Controloc 40mg|Pantoprazole|أقراص
Pantoloc 40mg|Pantoprazole|أقراص
Omez 20mg|Omeprazole|كبسولات
Gaviscon|Alginate + Antacid|شراب
Motilium 10mg|Domperidone|أقراص
Motinorm 10mg|Domperidone|أقراص
Primperan 10mg|Metoclopramide|أقراص
Spasmo-Digestin|Digestive enzymes + Antispasmodic|أقراص
Buscopan 10mg|Hyoscine Butylbromide|أقراص
Visceralgine|Tiemonium|أقراص
Colona|Mebeverine + Sulpiride|أقراص
Duspatalin 200mg|Mebeverine|كبسولات
Mebaral|Mebeverine|أقراص
Imodium 2mg|Loperamide|كبسولات
Smecta|Diosmectite|أكياس
Rani 150mg|Ranitidine|أقراص
Duphalac|Lactulose|شراب
Dulcolax 5mg|Bisacodyl|أقراص
Glucophage 500mg|Metformin|أقراص
Glucophage 1000mg|Metformin|أقراص
Cidophage 850mg|Metformin|أقراص
Amaryl 2mg|Glimepiride|أقراص
Amaryl 3mg|Glimepiride|أقراص
Diamicron MR 60mg|Gliclazide|أقراص
Januvia 100mg|Sitagliptin|أقراص
Galvus Met 50/1000|Vildagliptin + Metformin|أقراص
Jardiance 10mg|Empagliflozin|أقراص
Forxiga 10mg|Dapagliflozin|أقراص
Mixtard 30 insulin|Insulin|حقن
Lantus|Insulin Glargine|حقن
Concor 5mg|Bisoprolol|أقراص
Tenormin 50mg|Atenolol|أقراص
Capoten 25mg|Captopril|أقراص
Tritace 5mg|Ramipril|أقراص
Norvasc 5mg|Amlodipine|أقراص
Amlodipine 10mg (Myodura)|Amlodipine|أقراص
Exforge 5/160|Amlodipine + Valsartan|أقراص
Diovan 80mg|Valsartan|أقراص
Cozaar 50mg|Losartan|أقراص
Lasix 40mg|Furosemide|أقراص
Aldactone 25mg|Spironolactone|أقراص
Lipitor 20mg|Atorvastatin|أقراص
Ator 20mg|Atorvastatin|أقراص
Crestor 10mg|Rosuvastatin|أقراص
Aspocid 75mg|Aspirin|أقراص
Plavix 75mg|Clopidogrel|أقراص
Marevan 5mg|Warfarin|أقراص
Xarelto 20mg|Rivaroxaban|أقراص
Clexane 40mg|Enoxaparin|حقن
Eltroxin 50mcg|Levothyroxine|أقراص
Euthyrox 100mcg|Levothyroxine|أقراص
Telfast 120mg|Fexofenadine|أقراص
Telfast 180mg|Fexofenadine|أقراص
Zyrtec 10mg|Cetirizine|أقراص
Claritine 10mg|Loratadine|أقراص
Aerius 5mg|Desloratadine|أقراص
Allergex|Chlorpheniramine|أقراص
Avil|Pheniramine|حقن
Singulair 10mg|Montelukast|أقراص
Ventolin inhaler|Salbutamol|بخاخ
Symbicort 160/4.5|Budesonide + Formoterol|بخاخ
Seretide 250|Fluticasone + Salmeterol|بخاخ
Farcosolvin|Salbutamol + Bromhexine|شراب
Bisolvon|Bromhexine|شراب
Mucosolvan|Ambroxol|شراب
Tusskan|Dextromethorphan|شراب
Toplexil|Oxomemazine|شراب
Congestal|Paracetamol + Pseudoephedrine + Chlorpheniramine|أقراص
Comtrex|Paracetamol + Pseudoephedrine|أقراص
Otrivin 0.1%|Xylometazoline|نقط أنف
Nasonex|Mometasone|بخاخ أنف
Solupred 20mg|Prednisolone|أقراص
Medrol 16mg|Methylprednisolone|أقراص
Dexamethasone 8mg (Epidron)|Dexamethasone|حقن
Kenacort 40mg|Triamcinolone|حقن
Depo-Medrol 40mg|Methylprednisolone|حقن
Fucidin cream|Fusidic acid|كريم
Fucicort cream|Fusidic acid + Betamethasone|كريم
Betaderm|Betamethasone|كريم
Daktarin cream|Miconazole|كريم
Canesten cream|Clotrimazole|كريم
Diflucan 150mg|Fluconazole|كبسولات
Mebo|Beta-sitosterol|مرهم
Garamycin cream|Gentamicin|كريم
Tobradex eye drops|Tobramycin + Dexamethasone|نقط عين
Tobrex eye drops|Tobramycin|نقط عين
Systane|Lubricant eye drops|نقط عين
Vigamox|Moxifloxacin|نقط عين
Otocalm ear drops|Antibiotic + Anaesthetic|نقط أذن
Hexitol mouthwash|Chlorhexidine|مضمضة
Betadine mouthwash|Povidone-iodine|مضمضة
Daktarin oral gel|Miconazole|جل فم
Mycostatin|Nystatin|نقط فم
Kenalog in orabase|Triamcinolone|معجون فم
Zovirax 400mg|Acyclovir|أقراص
Valtrex 500mg|Valacyclovir|أقراص
Neurobion|Vitamin B1 B6 B12|أقراص
Milga|Benfotiamine + B6|أقراص
Neuroton|Vitamin B complex|حقن
Devarol-S|Vitamin D3|أمبول
Vidrop|Vitamin D3|نقط
Calcimate|Calcium + Vitamin D|أقراص
Ferroglobin|Iron + Multivitamin|كبسولات
Haemojet|Iron|شراب
Folic acid 5mg|Folic acid|أقراص
Centrum|Multivitamins|أقراص
Omega 3 Plus|Omega-3|كبسولات
Cal-Mag|Calcium + Magnesium|أقراص
Vitamin C 1000mg (C-Retard)|Ascorbic acid|أقراص
Zinc 50mg (Octozinc)|Zinc|أقراص
Lyrica 75mg|Pregabalin|كبسولات
Neurontin 300mg|Gabapentin|كبسولات
Tegretol 200mg|Carbamazepine|أقراص
Depakine Chrono 500|Valproate|أقراص
Cipralex 10mg|Escitalopram|أقراص
Lustral 50mg|Sertraline|أقراص
Xanax 0.25mg|Alprazolam|أقراص
Stilnox 10mg|Zolpidem|أقراص
Stugeron 25mg|Cinnarizine|أقراص
Betaserc 24mg|Betahistine|أقراص
Vertiserc 16mg|Betahistine|أقراص
Urosolvine|Urinary alkalinizer|أكياس
Uricol|Diuretic herbal|كبسولات
Proximol|Uricosuric herbal|كبسولات
Omnic 0.4mg|Tamsulosin|كبسولات
Prostride 5mg|Finasteride|أقراص
Viagra 50mg|Sildenafil|أقراص
Cialis 20mg|Tadalafil|أقراص
Duphaston 10mg|Dydrogesterone|أقراص
Cyclo-Progynova|Estradiol + Norgestrel|أقراص
Clomid 50mg|Clomiphene|أقراص
Prontogest 400mg|Progesterone|لبوس
Cataflam drops|Diclofenac|نقط
Adol syrup|Paracetamol|شراب
Brufen syrup|Ibuprofen|شراب
Zithromax susp|Azithromycin|شراب
Emox susp|Amoxicillin|شراب
Ospamox susp|Amoxicillin|شراب
Ventolin syrup|Salbutamol|شراب
Kidz Vit|Multivitamins|شراب
Aerius syrup|Desloratadine|شراب
Ors (Rehydran)|Oral rehydration salts|أكياس
Glycerin suppository (Babylax)|Glycerin|لبوس
Novalgin 500mg|Metamizole|أقراص
Lidocaine 2%|Lidocaine|حقن
Ketolac 10mg|Ketorolac|أقراص
Ketolac 30mg|Ketorolac|حقن`;

export const DRUGS: Drug[] = raw.split("\n").map((l) => {
  const [n, a, f] = l.split("|");
  return { n, a, f };
});

export function searchDrugs(q: string, limit = 8): Drug[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const starts: Drug[] = [], has: Drug[] = [];
  for (const d of DRUGS) {
    const n = d.n.toLowerCase(), a = d.a.toLowerCase();
    if (n.startsWith(s)) starts.push(d);
    else if (n.includes(s) || a.includes(s)) has.push(d);
  }
  return [...starts, ...has].slice(0, limit);
}

export const DOSE_PRESETS = [
  "قرص كل 8 ساعات بعد الأكل لمدة أسبوع",
  "قرص كل 12 ساعة بعد الأكل لمدة 5 أيام",
  "قرص مرة يومياً بعد الفطار",
  "كبسولة على الريق قبل الفطار بنص ساعة",
  "قرص عند اللزوم (بحد أقصى 3 يومياً)",
  "معلقة 5 مل كل 8 ساعات",
  "حقنة عضل مرة يومياً لمدة 3 أيام",
  "دهان مرتين يومياً على المكان",
  "نقطتين 3 مرات يومياً",
  "مضمضة 3 مرات يومياً بعد الأكل",
];

const FAV_KEY = "sanad-rx-favorites";
export function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
export function addFavorite(name: string) {
  const f = [name, ...getFavorites().filter((x) => x !== name)].slice(0, 30);
  localStorage.setItem(FAV_KEY, JSON.stringify(f));
}
