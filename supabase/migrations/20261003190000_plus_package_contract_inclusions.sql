-- Align Plus package catalog copy with the paper leieavtale inclusion list.

update public.packages
set description = $desc$
- Hele lokalet, bord og stoler
- Bar og uteområdet
- Fullt utstyrt kjøkken for matlaging og servering
- Opprigg og nedrigg
- Scene (dekoreres selv)
- Sluttvask og sluttrengjøring
- Oppdekking, bordduk og stoltrekk
- Lyd og lys
- Sikkerhetspersonell som bistår under arrangementet
- Teknisk utstyr (høyttalere/mikrofon til taler og bakgrunnsmusikk)
- Toalettpapir, håndsåpe og tørkepapir
- Hygiene-artikler, lysestaker og vaser
- Praktisk oppfølging under arrangementet
Leietaker står fritt til å ha med egen mat og drikke
$desc$
where name ~* '^plus';
