-- New default-template wording from the paper leieavtale. Existing frozen
-- contract versions are left unchanged; new drafts pick the latest template version.

create or replace function public.seed_default_contract_template (p_org uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid;
  v_template uuid;
  v_hash text;
  v_terms text;
  v_payment text;
  v_declaration text;
begin
  v_actor := public.assert_authenticated_contract_writer (p_org);

  select t.id into v_template
  from public.contract_templates t
  where t.organization_id = p_org and t.is_default
  limit 1;
  if v_template is not null then
    return v_template;
  end if;

  v_terms := $terms$
4. Betingelser
• Reservasjon er gyldig etter første innbetaling er mottatt.
• Leietaker må være over 23 år og ha bosted i Norge. Leietaker må selv være til stede under arrangementet.
• Leietaker er ansvarlig dersom det oppstår skader på hus og/eller inventar. Ved skade eller ødeleggelse er leietaker erstatningspliktig, og vil bli fakturert etter befaring og enighet. Leietaker forplikter seg til å gi beskjed umiddelbart hvis noe blir ødelagt.
• Uteområdet kan brukes fritt (f.eks. til vielse), men leietaker er selv ansvarlig for gjennomføringen.
• Tidspunkt for nøkkellevering skal avtales i forkant av arrangementet.
• Utleier forbeholder seg retten til å avbryte kontrakten hvis noe uforutsett oppstår med lokalet. Skulle dette skje, vil leiesummen i sin helhet bli refundert leietaker.
• Ved force majeure-situasjoner som gjør arrangementet umulig å gjennomføre, vil innbetalt leiesum refunderes i sin helhet. Dersom mulig vil vi forsøke å finne alternativ dato.
• Avtalen er bindende ved kontraktsinngåelse. Rønningen har ingen refusjonsplikt hvis leietaker ønsker å kansellere arrangementet.

6. Informasjonsskriv og husregler
Følgende regler gjelder for arrangementet og skal formidles til alle gjester:

Adkomst og parkering
• Fartsgrensen på innkjøringsveien er 30 km/t. Baneveien er en turvei på en gammel jernbanestrekning for folk til fots, sykkel og ridende på hest. Dette skal formidles til alle gjester.

Tider og støy
• Alle vinduer og dører må være lukket senest kl. 01:00, slik at musikk ikke er til sjenanse for naboer.
• Lokalet må være forlatt senest kl. 02:30.
• Høyttalere i taket kan brukes, men er kun dimensjonert til lav bakgrunnsmusikk og taler.

Røyking og fyrverkeri
• All røyking MÅ foregå der det er «sneipebøtter». Da dyr lett kan bli nikotinforgiftet, må alle sneiper opp i bøttene.
• Det er ikke lov å røyke på siden av lokalet mot våningshus og låve.
• Sjekk og rydd uteområdet og parkeringsplassen for sneiper før overlevering av lokalet.
• Fyrverkeri er FORBUDT.

Avfall
• Kildesorter og kast riktig avfall i riktig dunk.
• Ta med hjem rester og alt tomgods (flasker, metall/glass) – lever til gjenvinning selv.

Uteområde
• Husk å lukke igjen grinder!
• Sneiper og søppel på uteområdet plukkes opp av leietaker før tilbakelevering – husk begge sidene av bygget.

Wifi og telefon
• Telefondekning på gården er litt ustabil. Bruk WIFI tale ved behov.
• Nettverksnavn: Rønningen Selskapslokale  Passord: Fest2019

Fotografering
• Ta gjerne kontakt om dere trenger tips til fotolokasjoner – vi kjenner flere flotte plasser i umiddelbar nærhet!

7. Generelt om avfall og overleveringen
Sluttvask og rengjøring er inkludert i pakken og utføres av oss. Leietaker har likevel ansvar for:
• Kildesorter og kast riktig avfall i riktig dunk.
• Kjølerom/-skap og fryser tømmes – medbrakt innhold tas med hjem.
• Alt tomgods (flasker, metall/glass) tas med hjem og leveres til gjenvinning.
• Er det knust servise, glass eller annet inventar, gi beskjed umiddelbart – dette kan bli fakturert.
• Alle brukte lysestaker rengjøres for stearinrester. Vaser rengjøres.

Siste sjekk
• Vinduer og dører lukkes og låses.
• Lys og elektrisk utstyr slås av.
• Dobbeltsjekk at dere har fått med dere alt hjem.
• Nøkkel leveres etter avtale. Ved nøkkellevering gjennomgår vi lokalet sammen.
$terms$;

  v_payment := $pay$
Merk betaling med: Arrangementsdato og navn
$pay$;

  v_declaration := $dec$
Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.
$dec$;

  v_hash := encode(
    digest(convert_to(v_terms || E'\n' || v_payment || E'\n' || v_declaration, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.contract_templates (organization_id, name, locale, is_default)
  values (p_org, 'Standard leieavtale', 'nb', true)
  returning id into v_template;

  insert into public.contract_template_versions (
    organization_id,
    template_id,
    version_number,
    legal_terms,
    payment_terms,
    acceptance_declaration,
    content_hash,
    created_by
  ) values (
    p_org,
    v_template,
    1,
    v_terms,
    v_payment,
    v_declaration,
    v_hash,
    v_actor
  );

  return v_template;
end;
$$;

revoke all on function public.seed_default_contract_template (uuid) from public;
grant execute on function public.seed_default_contract_template (uuid) to authenticated;

do $$
declare
  v_terms text;
  v_payment text;
  v_declaration text;
  v_hash text;
  r record;
begin
  v_terms := $terms$
4. Betingelser
• Reservasjon er gyldig etter første innbetaling er mottatt.
• Leietaker må være over 23 år og ha bosted i Norge. Leietaker må selv være til stede under arrangementet.
• Leietaker er ansvarlig dersom det oppstår skader på hus og/eller inventar. Ved skade eller ødeleggelse er leietaker erstatningspliktig, og vil bli fakturert etter befaring og enighet. Leietaker forplikter seg til å gi beskjed umiddelbart hvis noe blir ødelagt.
• Uteområdet kan brukes fritt (f.eks. til vielse), men leietaker er selv ansvarlig for gjennomføringen.
• Tidspunkt for nøkkellevering skal avtales i forkant av arrangementet.
• Utleier forbeholder seg retten til å avbryte kontrakten hvis noe uforutsett oppstår med lokalet. Skulle dette skje, vil leiesummen i sin helhet bli refundert leietaker.
• Ved force majeure-situasjoner som gjør arrangementet umulig å gjennomføre, vil innbetalt leiesum refunderes i sin helhet. Dersom mulig vil vi forsøke å finne alternativ dato.
• Avtalen er bindende ved kontraktsinngåelse. Rønningen har ingen refusjonsplikt hvis leietaker ønsker å kansellere arrangementet.

6. Informasjonsskriv og husregler
Følgende regler gjelder for arrangementet og skal formidles til alle gjester:

Adkomst og parkering
• Fartsgrensen på innkjøringsveien er 30 km/t. Baneveien er en turvei på en gammel jernbanestrekning for folk til fots, sykkel og ridende på hest. Dette skal formidles til alle gjester.

Tider og støy
• Alle vinduer og dører må være lukket senest kl. 01:00, slik at musikk ikke er til sjenanse for naboer.
• Lokalet må være forlatt senest kl. 02:30.
• Høyttalere i taket kan brukes, men er kun dimensjonert til lav bakgrunnsmusikk og taler.

Røyking og fyrverkeri
• All røyking MÅ foregå der det er «sneipebøtter». Da dyr lett kan bli nikotinforgiftet, må alle sneiper opp i bøttene.
• Det er ikke lov å røyke på siden av lokalet mot våningshus og låve.
• Sjekk og rydd uteområdet og parkeringsplassen for sneiper før overlevering av lokalet.
• Fyrverkeri er FORBUDT.

Avfall
• Kildesorter og kast riktig avfall i riktig dunk.
• Ta med hjem rester og alt tomgods (flasker, metall/glass) – lever til gjenvinning selv.

Uteområde
• Husk å lukke igjen grinder!
• Sneiper og søppel på uteområdet plukkes opp av leietaker før tilbakelevering – husk begge sidene av bygget.

Wifi og telefon
• Telefondekning på gården er litt ustabil. Bruk WIFI tale ved behov.
• Nettverksnavn: Rønningen Selskapslokale  Passord: Fest2019

Fotografering
• Ta gjerne kontakt om dere trenger tips til fotolokasjoner – vi kjenner flere flotte plasser i umiddelbar nærhet!

7. Generelt om avfall og overleveringen
Sluttvask og rengjøring er inkludert i pakken og utføres av oss. Leietaker har likevel ansvar for:
• Kildesorter og kast riktig avfall i riktig dunk.
• Kjølerom/-skap og fryser tømmes – medbrakt innhold tas med hjem.
• Alt tomgods (flasker, metall/glass) tas med hjem og leveres til gjenvinning.
• Er det knust servise, glass eller annet inventar, gi beskjed umiddelbart – dette kan bli fakturert.
• Alle brukte lysestaker rengjøres for stearinrester. Vaser rengjøres.

Siste sjekk
• Vinduer og dører lukkes og låses.
• Lys og elektrisk utstyr slås av.
• Dobbeltsjekk at dere har fått med dere alt hjem.
• Nøkkel leveres etter avtale. Ved nøkkellevering gjennomgår vi lokalet sammen.
$terms$;
  v_payment := $pay$
Merk betaling med: Arrangementsdato og navn
$pay$;
  v_declaration := $dec$
Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.
$dec$;
  v_hash := encode(
    digest(convert_to(v_terms || E'\n' || v_payment || E'\n' || v_declaration, 'UTF8'), 'sha256'),
    'hex'
  );

  for r in
    select t.organization_id, t.id as template_id, coalesce(max(tv.version_number), 0) as last_n,
      (select tv2.content_hash
       from public.contract_template_versions tv2
       where tv2.template_id = t.id
       order by tv2.version_number desc
       limit 1) as last_hash
    from public.contract_templates t
    left join public.contract_template_versions tv on tv.template_id = t.id
    where t.is_default
    group by t.organization_id, t.id
  loop
    if r.last_hash is distinct from v_hash then
      insert into public.contract_template_versions (
        organization_id,
        template_id,
        version_number,
        legal_terms,
        payment_terms,
        acceptance_declaration,
        content_hash
      ) values (
        r.organization_id,
        r.template_id,
        r.last_n + 1,
        v_terms,
        v_payment,
        v_declaration,
        v_hash
      );
    end if;
  end loop;
end;
$$;
