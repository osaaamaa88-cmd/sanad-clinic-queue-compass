// Common drugs in the Egyptian market (trade name, active ingredient, form). Doctors can still type any free name.
export type Drug = { n: string; a: string; f: string; ar?: string };

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

const extra = `Augmentin 1g|Amoxicillin + Clavulanate|أقراص|أوجمنتين
Panadol 500mg|Paracetamol|أقراص|بانادول
Brufen 400mg|Ibuprofen|أقراص|بروفين
Cataflam 50mg|Diclofenac Potassium|أقراص|كتافلام
Flagyl 500mg|Metronidazole|أقراص|فلاجيل
Nexium 40mg|Esomeprazole|أقراص|نيكسيوم
Controloc 40mg|Pantoprazole|أقراص|كونترولوك
Antinal 200mg|Nifuroxazide|كبسولات|أنتينال
Alphintern|Trypsin + Chymotrypsin|أقراص|ألفينترن
Buscopan 10mg|Hyoscine Butylbromide|أقراص|بسكوبان
Ospamox 1g|Amoxicillin|أقراص|أوسباموكس
Amoxil 500mg|Amoxicillin|كبسولات|أموكسيل
Clavimox 1g|Amoxicillin + Clavulanate|أقراص|كلافيموكس
Augmentin 228 susp|Amoxicillin + Clavulanate|شراب|أوجمنتين شراب
Zithrokan 500mg|Azithromycin|أقراص|زيثروكان
Xithrone susp 200mg/5ml|Azithromycin|شراب|زيثرون شراب
Klacid susp 250mg|Clarithromycin|شراب|كلاسيد شراب
Erythrocin 500mg|Erythromycin|أقراص|إريثروسين
Ceporex 500mg|Cephalexin|كبسولات|سيبوركس
Velosef 500mg|Cephradine|كبسولات|فيلوسيف
Duricef 500mg|Cefadroxil|كبسولات|ديوريسيف
Xorimax 500mg|Cefuroxime|أقراص|زوريماكس
Ximacef 400mg|Cefixime|كبسولات|زيماسيف
Taxim 1g|Cefotaxime|حقن|تاكسيم
Fortum 1g|Ceftazidime|حقن|فورتم
Epicephin 1g|Ceftriaxone|حقن|إبيسفين
Clindam 300mg|Clindamycin|كبسولات|كليندام
Dalacin C 300mg|Clindamycin|كبسولات|دالاسين
Bactrim forte|Sulfamethoxazole + Trimethoprim|أقراص|باكتريم
Septazole|Sulfamethoxazole + Trimethoprim|شراب|سيبتازول
Uvamin retard 100mg|Nitrofurantoin|كبسولات|يوفامين
Macrofuran 100mg|Nitrofurantoin|كبسولات|ماكروفيوران
Monuril 3g|Fosfomycin|أكياس|مونيوريل
Avalox 400mg|Moxifloxacin|أقراص|أفالوكس
Garamycin 80mg|Gentamicin|حقن|جاراميسين
Vancomycin 500mg|Vancomycin|حقن|فانكوميسين
Fucidin cream|Fusidic acid|كريم|فيوسيدين
Fucicort cream|Fusidic acid + Betamethasone|كريم|فيوسيكورت
Garamycin cream|Gentamicin|كريم|جاراميسين كريم
Mebendazole (Vermox) 100mg|Mebendazole|أقراص|فيرموكس
Alzental 200mg|Albendazole|أقراص|ألزنتال
Dovermectin 6mg|Ivermectin|أقراص|دوفرمكتين
Diflucan 150mg|Fluconazole|كبسولات|ديفلوكان
Flucoral 150mg|Fluconazole|كبسولات|فلوكورال
Daktarin oral gel|Miconazole|جل|دكتارين جل
Mycostatin susp|Nystatin|شراب|ميكوستاتين
Canesten cream|Clotrimazole|كريم|كانستين
Lamisil 250mg|Terbinafine|أقراص|لاميزيل
Zovirax 400mg|Acyclovir|أقراص|زوفيراكس
Zovirax cream|Acyclovir|كريم|زوفيراكس كريم
Valtrex 500mg|Valacyclovir|أقراص|فالتريكس
Tamiflu 75mg|Oseltamivir|كبسولات|تاميفلو
Paramol 500mg|Paracetamol|أقراص|بارامول
Panadol Cold & Flu|Paracetamol + Pseudoephedrine|أقراص|بانادول كولد
Comtrex|Paracetamol + Chlorpheniramine + Pseudoephedrine|أقراص|كومتركس
Congestal|Paracetamol + Pseudoephedrine + Chlorpheniramine|أقراص|كونجستال
Cold free|Paracetamol + Pseudoephedrine|أقراص|كولد فري
Adol 500mg|Paracetamol|أقراص|أدول
Adol suppositories 125mg|Paracetamol|لبوس|أدول لبوس
Revanin 500mg|Paracetamol|أقراص|ريفانين
Brufen syrup 100mg/5ml|Ibuprofen|شراب|بروفين شراب
Cataflam drops|Diclofenac Potassium|نقط|كتافلام نقط
Cataflam 75mg amp|Diclofenac|حقن|كتافلام حقن
Voltaren 50mg|Diclofenac Sodium|أقراص|فولتارين
Voltaren emulgel|Diclofenac|جل|فولتارين جل
Rheumafen 400mg|Ibuprofen|أقراص|روماڤين
Naprosyn 500mg|Naproxen|أقراص|نابروسين
Feldene 20mg|Piroxicam|كبسولات|فلدين
Feldene gel|Piroxicam|جل|فلدين جل
Ponstan 500mg|Mefenamic acid|أقراص|بونستان
Aspirin protect 100mg|Acetylsalicylic acid|أقراص|أسبرين بروتكت
Aspocid 75mg|Acetylsalicylic acid|أقراص|أسبوسيد
Rivo 320mg|Acetylsalicylic acid|أقراص|ريفو
Nurofen 200mg|Ibuprofen|أقراص|نيوروفين
Ketolac 10mg|Ketorolac|أقراص|كيتولاك
Dolphin suppositories|Diclofenac|لبوس|دولفين
Relaxon|Chlorzoxazone + Paracetamol|كبسولات|ريلاكسون
Norgesic|Orphenadrine + Paracetamol|أقراص|نورجيزك
Dantrelax 25mg|Dantrolene|كبسولات|دانتريلاكس
Neurovit|Vitamin B1 + B6 + B12|أقراص|نيوروفيت
Milga|Benfotiamine + B6|أقراص|ميلجا
Neurobion amp|Vitamin B1 + B6 + B12|حقن|نيوروبيون
Depovit B12|Cyanocobalamin|حقن|ديبوفيت
Thiotacid 600mg|Alpha lipoic acid|أقراص|ثيوتاسيد
Lyrica 75mg|Pregabalin|كبسولات|ليريكا
Neurontin 300mg|Gabapentin|كبسولات|نيورونتين
Tegretol 200mg|Carbamazepine|أقراص|تجريتول
Depakine chrono 500mg|Valproate|أقراص|ديباكين
Keppra 500mg|Levetiracetam|أقراص|كيبرا
Lamictal 50mg|Lamotrigine|أقراص|لاميكتال
Topamax 25mg|Topiramate|أقراص|توباماكس
Stugeron 25mg|Cinnarizine|أقراص|ستوجيرون
Betaserc 16mg|Betahistine|أقراص|بيتاسيرك
Vertigoheel|Homeopathic|أقراص|فيرتيجوهيل
Cipralex 10mg|Escitalopram|أقراص|سيبرالكس
Prozac 20mg|Fluoxetine|كبسولات|بروزاك
Lustral 50mg|Sertraline|أقراص|لوسترال
Xanax 0.5mg|Alprazolam|أقراص|زاناكس
Concor 5mg|Bisoprolol|أقراص|كونكور
Concor 2.5mg|Bisoprolol|أقراص|كونكور
Tenormin 50mg|Atenolol|أقراص|تينورمين
Inderal 10mg|Propranolol|أقراص|إندرال
Dilatrend 25mg|Carvedilol|أقراص|ديلاتريند
Nebilet 5mg|Nebivolol|أقراص|نيبيليت
Capoten 25mg|Captopril|أقراص|كابوتين
Tritace 5mg|Ramipril|أقراص|تريتاس
Zestril 10mg|Lisinopril|أقراص|زستريل
Cozaar 50mg|Losartan|أقراص|كوزار
Diovan 80mg|Valsartan|أقراص|ديوفان
Exforge 5/160|Amlodipine + Valsartan|أقراص|إكسفورج
Co-Diovan 160/12.5|Valsartan + HCTZ|أقراص|كو ديوفان
Atacand 16mg|Candesartan|أقراص|أتاكاند
Micardis 40mg|Telmisartan|أقراص|ميكارديس
Norvasc 5mg|Amlodipine|أقراص|نورفاسك
Myofen 5mg|Amlodipine|أقراص|ميوفين
Adalat LA 30mg|Nifedipine|أقراص|أدالات
Epilat retard 20mg|Nifedipine|كبسولات|إبيلات
Lasix 40mg|Furosemide|أقراص|لازكس
Aldactone 25mg|Spironolactone|أقراص|ألداكتون
Natrilix SR 1.5mg|Indapamide|أقراص|ناتريليكس
Lipitor 20mg|Atorvastatin|أقراص|ليبيتور
Ator 20mg|Atorvastatin|أقراص|أتور
Crestor 10mg|Rosuvastatin|أقراص|كريستور
Rosuvast 10mg|Rosuvastatin|أقراص|روزوفاست
Plavix 75mg|Clopidogrel|أقراص|بلافيكس
Clopex 75mg|Clopidogrel|أقراص|كلوبكس
Marevan 5mg|Warfarin|أقراص|ماريفان
Xarelto 20mg|Rivaroxaban|أقراص|زاريلتو
Eliquis 5mg|Apixaban|أقراص|إليكويس
Clexane 40mg|Enoxaparin|حقن|كليكسان
Lanoxin 0.25mg|Digoxin|أقراص|لانوكسين
Isordil 10mg|Isosorbide dinitrate|أقراص|إيزورديل
Daflon 500mg|Diosmin + Hesperidin|أقراص|دافلون
Glucophage 500mg|Metformin|أقراص|جلوكوفاج
Glucophage XR 1000mg|Metformin|أقراص|جلوكوفاج إكس آر
Cidophage 850mg|Metformin|أقراص|سيدوفاج
Amaryl 2mg|Glimepiride|أقراص|أماريل
Diamicron MR 60mg|Gliclazide|أقراص|دياميكرون
Januvia 100mg|Sitagliptin|أقراص|جانوفيا
Janumet 50/1000|Sitagliptin + Metformin|أقراص|جانوميت
Galvus 50mg|Vildagliptin|أقراص|جالفس
Galvus Met 50/1000|Vildagliptin + Metformin|أقراص|جالفس ميت
Jardiance 10mg|Empagliflozin|أقراص|جارديانس
Forxiga 10mg|Dapagliflozin|أقراص|فورسيجا
Actos 30mg|Pioglitazone|أقراص|أكتوس
Mixtard 30/70|Human insulin|حقن|ميكستارد
Lantus SoloStar|Insulin glargine|حقن|لانتوس
NovoRapid FlexPen|Insulin aspart|حقن|نوفورابيد
Eltroxin 50mcg|Levothyroxine|أقراص|إلتروكسين
Euthyrox 100mcg|Levothyroxine|أقراص|يوثيروكس
Thyrocil 5mg|Carbimazole|أقراص|ثيروسيل
Solupred 20mg|Prednisolone|أقراص|سولوبريد
Hostacortin 5mg|Prednisone|أقراص|هوستاكورتين
Medrol 4mg|Methylprednisolone|أقراص|ميدرول
Dexamethasone 8mg amp|Dexamethasone|حقن|ديكساميثازون
Diprofos amp|Betamethasone|حقن|ديبروفوس
Kenacort 40mg|Triamcinolone|حقن|كيناكورت
Claritine 10mg|Loratadine|أقراص|كلاريتين
Claritine syrup|Loratadine|شراب|كلاريتين شراب
Aerius 5mg|Desloratadine|أقراص|إيريوس
Zyrtec 10mg|Cetirizine|أقراص|زيرتك
Telfast 120mg|Fexofenadine|أقراص|تلفاست
Xyzal 5mg|Levocetirizine|أقراص|زيزال
Avil 25mg|Pheniramine|أقراص|أفيل
Phenadone syrup|Chlorpheniramine|شراب|فينادون
Singulair 10mg|Montelukast|أقراص|سينجولير
Montiget 10mg|Montelukast|أقراص|مونتيجيت
Ventolin inhaler|Salbutamol|بخاخ|فنتولين
Farcolin respirator solution|Salbutamol|محلول استنشاق|فاركولين
Seretide 250 Diskus|Fluticasone + Salmeterol|بخاخ|سيريتايد
Symbicort 160/4.5|Budesonide + Formoterol|بخاخ|سيمبيكورت
Pulmicort 0.5mg|Budesonide|محلول استنشاق|بولميكورت
Atrovent|Ipratropium|بخاخ|أتروفنت
Theophylline 300mg (Quibron)|Theophylline|كبسولات|كويبرون
Mucosolvan syrup|Ambroxol|شراب|ميوكوسولفان
Bisolvon 8mg|Bromhexine|أقراص|بيسولفون
Fluimucil 600mg|Acetylcysteine|أكياس|فلويموسيل
Tusskan syrup|Dextromethorphan + Guaifenesin|شراب|توسكان
Toplexil syrup|Oxomemazine|شراب|توبليكسيل
Prospan syrup|Ivy leaf extract|شراب|بروسبان
Sinecod syrup|Butamirate|شراب|سينكود
Otrivin nasal drops|Xylometazoline|نقط أنف|أوتريفين
Afrin nasal spray|Oxymetazoline|بخاخ أنف|أفرين
Avamys nasal spray|Fluticasone furoate|بخاخ أنف|أفاميس
Nasonex|Mometasone|بخاخ أنف|نازونكس
Physiomer|Sea water|بخاخ أنف|فيزيومير
Strepsils|Amylmetacresol|أقراص استحلاب|ستربسلز
Tantum Verde mouthwash|Benzydamine|غسول فم|تانتم فيردي
Hexitol mouthwash|Chlorhexidine|غسول فم|هيكسيتول
Orovex mouthwash|Chlorhexidine|غسول فم|أوروفكس
Kenalog in Orabase|Triamcinolone|معجون فم|كينالوج
Mucosta 100mg|Rebamipide|أقراص|ميوكوستا
Zantac 150mg|Ranitidine|أقراص|زانتاك
Gastroreg 30mg|Lansoprazole|كبسولات|جاستروريج
Pariet 20mg|Rabeprazole|أقراص|باريت
Dexilant 60mg|Dexlansoprazole|كبسولات|ديكسيلانت
Maalox|Aluminium + Magnesium hydroxide|شراب|مالوكس
Mucogel|Aluminium + Magnesium hydroxide|شراب|ميوكوجيل
Duspatalin 200mg|Mebeverine|كبسولات|دسباتالين
Colospasmin forte|Mebeverine|أقراص|كولوسبازمين
Librax|Chlordiazepoxide + Clidinium|أقراص|ليبراكس
Visceralgine|Tiemonium|أقراص|فيسيرالجين
Disflatyl|Simethicone|أقراص|ديسفلاتيل
Flatidyl|Simethicone|شراب|فلاتيديل
Imodium 2mg|Loperamide|كبسولات|إيموديوم
Smecta|Diosmectite|أكياس|سميكتا
Rehydran|Oral rehydration salts|أكياس|ريهيدران
Hydrasec 100mg|Racecadotril|كبسولات|هيدراسيك
Entocid|Phthalylsulfathiazole|أقراص|إنتوسيد
Lacteol fort|Lactobacillus|كبسولات|لاكتيول
Duphalac syrup|Lactulose|شراب|دوفالاك
Agiolax|Plantago + Senna|حبيبات|أجيولاكس
Dulcolax 5mg|Bisacodyl|أقراص|دلكولاكس
Glycerin suppositories|Glycerin|لبوس|لبوس جلسرين
Hepamerz|L-Ornithine L-Aspartate|أكياس|هيبامرز
Ursofalk 250mg|Ursodeoxycholic acid|كبسولات|أورسوفالك
Legalon 140mg|Silymarin|كبسولات|ليجالون
Hepaticum|Silymarin|كبسولات|هيباتيكم
Vomibreak|Doxylamine + Pyridoxine|أقراص|فوميبريك
Zofran 8mg|Ondansetron|أقراص|زوفران
Danset 8mg|Ondansetron|أقراص|دانسيت
Motilium susp|Domperidone|شراب|موتيليوم شراب
Ferrotron|Iron + Folic acid|كبسولات|فيروترون
Haemojet|Iron|شراب|هيموجيت
Ferroglobin|Iron + Vitamins|كبسولات|فيروجلوبين
Folic acid 5mg|Folic acid|أقراص|فوليك أسيد
Venofer amp|Iron sucrose|حقن|فينوفير
Calcitron|Calcium + Vitamin D3|أقراص|كالسيترون
Osteocare|Calcium + Magnesium + Zinc + D3|أقراص|أوستيوكير
Devarol-S 200000 IU|Cholecalciferol|أمبول شرب|ديفارول
Vidrop|Cholecalciferol|نقط|فيدروب
One-Alpha 1mcg|Alfacalcidol|كبسولات|وان ألفا
Centrum|Multivitamins|أقراص|سنتروم
Pharmaton|Multivitamins + Ginseng|كبسولات|فارماتون
Octozinc|Zinc|كبسولات|أوكتوزنك
C-Retard 500mg|Vitamin C|كبسولات|سي ريتارد
Cevarol 1g|Vitamin C|أقراص فوارة|سيفارول
Magnesium (Mag-Vital)|Magnesium|أقراص|ماج فيتال
Omega-3 Plus|Omega-3|كبسولات|أوميجا 3
Prostamol uno|Saw palmetto|كبسولات|بروستامول
Omnic 0.4mg|Tamsulosin|كبسولات|أومنيك
Xatral 10mg|Alfuzosin|أقراص|زاترال
Proscar 5mg|Finasteride|أقراص|بروسكار
Viagra 50mg|Sildenafil|أقراص|فياجرا
Cialis 20mg|Tadalafil|أقراص|سياليس
Urosolvine|Potassium citrate|حبيبات|يوروسولفين
Rowatinex|Terpenes|كبسولات|روواتينكس
Cystone|Herbal|أقراص|سيستون
Duphaston 10mg|Dydrogesterone|أقراص|دوفاستون
Prontogest 400mg|Progesterone|لبوس|برونتوجست
Clomid 50mg|Clomiphene|أقراص|كلوميد
Gynera|Ethinylestradiol + Gestodene|أقراص|جينيرا
Yasmin|Ethinylestradiol + Drospirenone|أقراص|ياسمين
Primolut N 5mg|Norethisterone|أقراص|بريمولوت
Cyclokapron 500mg|Tranexamic acid|أقراص|سيكلوكابرون
Kapron 500mg|Tranexamic acid|حقن|كابرون
Methergine 0.125mg|Methylergometrine|أقراص|ميثرجين
Gynozol vaginal|Fluconazole|لبوس مهبلي|جينوزول
Dermovate cream|Clobetasol|كريم|ديرموفيت
Betnovate cream|Betamethasone|كريم|بتنوفيت
Elica cream|Mometasone|كريم|إليكا
Hydrocortisone 1% cream|Hydrocortisone|كريم|هيدروكورتيزون
Bepanthen cream|Dexpanthenol|كريم|بيبانثين
Mebo ointment|Beta-sitosterol|مرهم|ميبو
Silverzine cream|Silver sulfadiazine|كريم|سيلفرزين
Panthenol cream|Dexpanthenol|كريم|بانثينول
Differin gel|Adapalene|جل|ديفرين
Acnemin gel|Erythromycin|جل|أكنيمين
Roaccutane 20mg|Isotretinoin|كبسولات|رواكيوتان
Scabinil|Permethrin|لوشن|سكابينيل
Tobradex eye drops|Tobramycin + Dexamethasone|قطرة عين|توبراديكس
Tobrex eye drops|Tobramycin|قطرة عين|توبركس
Vigamox eye drops|Moxifloxacin|قطرة عين|فيجاموكس
Systane eye drops|Lubricant|قطرة عين|سيستين
Tears Guard|Lubricant|قطرة عين|تيرز جارد
Xalatan eye drops|Latanoprost|قطرة عين|زالاتان
Ciprofar ear drops|Ciprofloxacin|قطرة أذن|سيبروفار
Otal ear drops|Antibiotic + Steroid|قطرة أذن|أوتال
Sensodyne toothpaste|Potassium nitrate|معجون أسنان|سنسوداين
Hexitol gel|Chlorhexidine|جل|هيكسيتول جل
Dentinox gel|Lidocaine|جل|دنتينوكس
Mepecaine 3%|Mepivacaine|حقن|ميبيكين
Artinibsa 4%|Articaine + Epinephrine|حقن|أرتينيبسا
Septanest 4%|Articaine + Epinephrine|حقن|سبتانست
Ophthalmic Fucithalmic|Fusidic acid|قطرة عين|فيوسيثالميك`;

const map = new Map<string, Drug>();
for (const l of raw.split("\n")) { const [n, a, f] = l.split("|"); map.set(n.toLowerCase(), { n, a, f }); }
for (const l of extra.split("\n")) {
  const [n, a, f, ar] = l.split("|");
  const k = n.toLowerCase(), cur = map.get(k);
  if (cur) cur.ar = ar; else map.set(k, { n, a, f, ar });
}
// Attach Arabic names to strength variants of the same brand (e.g. "Augmentin 625mg").
const brandAr = new Map<string, string>();
for (const d of map.values()) if (d.ar) brandAr.set(d.n.split(" ")[0].toLowerCase(), d.ar.split(" ")[0]);
for (const d of map.values()) if (!d.ar) d.ar = brandAr.get(d.n.split(" ")[0].toLowerCase());

export const DRUGS: Drug[] = [...map.values()];

const norm = (x: string) => x.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْ]/g, "");
const INDEX = DRUGS.map((d) => ({ d, n: d.n.toLowerCase(), a: d.a.toLowerCase(), ar: norm(d.ar ?? "") }));

export function searchDrugs(q: string, limit = 10): Drug[] {
  const s = norm(q.trim());
  if (s.length < 2) return [];
  const starts: Drug[] = [], has: Drug[] = [];
  for (const x of INDEX) {
    if (x.n.startsWith(s) || x.ar.startsWith(s)) starts.push(x.d);
    else if (x.n.includes(s) || x.a.includes(s) || x.ar.includes(s)) has.push(x.d);
  }
  return [...starts, ...has].slice(0, limit);
}

/** Suggest a sensible default dose based on the dosage form. */
export function doseForForm(f: string): string | null {
  if (/شراب/.test(f)) return "ملعقة صغيرة (5 مل) كل 8 ساعات بعد الأكل";
  if (/حقن/.test(f)) return "حقنة عضل مرة يومياً";
  if (/كريم|مرهم|جل/.test(f)) return "دهان موضعي مرتين يومياً";
  if (/قطرة عين/.test(f)) return "نقطة في العين كل 6 ساعات";
  if (/قطرة أذن/.test(f)) return "3 نقط في الأذن 3 مرات يومياً";
  if (/بخاخ/.test(f)) return "بخة مرتين يومياً";
  if (/غسول/.test(f)) return "مضمضة مرتين يومياً بعد الأسنان";
  if (/لبوس/.test(f)) return "لبوسة عند اللزوم";
  if (/أكياس/.test(f)) return "كيس مذاب في ماء مرة يومياً";
  return null;
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
