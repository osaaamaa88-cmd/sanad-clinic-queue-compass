update public.governmental_hospitals set phone='0224025611', emergency_phone='0222607597' where name like 'مستشفيات جامعة عين شمس (الدمرداش)%';
update public.governmental_hospitals set phone='0222023479' where name='مستشفى معهد ناصر';
update public.governmental_hospitals set phone='0238500921' where name='مستشفى الشيخ زايد التخصصي';
update public.governmental_hospitals set phone='19514' where name='المعهد القومي للأورام';
update public.governmental_hospitals set phone='0502202222' where name='مركز الكلى والمسالك البولية بالمنصورة';
update public.governmental_hospitals set phone='0502240924' where name='مركز الجهاز الهضمي بالمنصورة';
update public.governmental_hospitals set phone='123' where coalesce(phone,'')='';
update public.governmental_hospitals set emergency_phone='123' where coalesce(emergency_phone,'')='';