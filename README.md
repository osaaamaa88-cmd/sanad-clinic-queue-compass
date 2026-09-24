# سندي

قم بإنشاء تطبيق جوال طبي متكامل باللغة العربية (Right-to-Left RTL) مخصص للسوق المصري باسم "طبيبك".

يجب أن تكون جميع النصوص في الواجهات باللغة العربية البسيطة والسهلة الفهم للمستخدم المصري.

يتكون التطبيق من 4 أدوار رئيسية (User Roles):

1. المريض (Patient):

- التسجيل برقم الهاتف والاسم فقط.

- الصفحة الرئيسية: تحتوي على تحديد الموقع تلقائياً عبر הـ GPS، وقائمة بالتخصصات الطبية (أسنان، باطنة، أطفال، عظام، إلخ).

- شاشة البحث والخرائط: عرض العيادات الأقرب مسافة على الخريطة وقائمة بالعيادات مع العنوان التفصيلي وسعر الكشف.

- شاشة حجز الموعد: اختيار اليوم والساعة المتاحة وتأكيد الحجز.

- شاشة "دورك كام في العيادة؟" (Live Queue Tracker): شاشة حية تظهر للمريض رقم الكشف الحالي داخل العيادة والرقم الخاص به لتجنب الانتظار.

- إرسال تفاصيل الحجز ولوكيشن العيادة للمريض عبر رسائل الواتساب والتنبيهات.

2. السكرتير / الاستقبال (Receptionist):

- واجهة بسيطة جداً لإدارة الحجوزات اليومية للعيادة.

- زر كبير وبسيط باسم "دخول المريض التالي" ليقوم السكرتير بالضغط عليه عند دخول كل مريض، لتحديث رقم الدور حياً لدى المرضى في منازلهم.

- إمكانية إدخال حجز جديد يدوي لمريض حضر للعيادة بدون التطبيق.

3. الطبيب / العيادة (Doctor):

- إنشاء بروفايل العيادة: الاسم، التخصص، العنوان الكتابي (الشارع، العمارة، الدور)، وسعر الكشف.

- تحديد موقع العيادة بدقة على الخريطة (Place Picker / LatLng).

- زر لتفعيل حالة "متاح الآن / طوارئ" للعيادات المفتوحة حالياً.

- إمكانية إضافة حساب للسكرتير الخاص به.

4. مالك التطبيق (Admin):

- لوحة تحكم لتفعيل وتوثيق العيادات الجديدة قبل ظهورها للجمهور (Verification).

- عرض إحصائيات الحجوزات وإدارة التخصصات.

التصميم (UI/UX):

- هادئ ومريح بصرياً، باستخدام ألوان طبية مثل الأبيض، الأزرق السماوي، والرمادي الفاتح.

- نصوص واضحة وعريضة وواجهات سهلة جداً لكبار السن.

- دعم كامل واتجاه التصميم من اليمين إلى اليسار (RTL Arabic Layout).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sanady1.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2eae0ba1-4f26-4f27-97f9-9c4ddc1f8ba8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
