export const serverErrorsNb = {
  auth: {
    invalidRequest: "Ugyldig forespørsel.",
    accountNotCreated: "Kontoen ble ikke opprettet. Prøv igjen.",
    accountCreatedSignInFailed:
      "Kontoen ble opprettet, men innlogging feilet. Prøv å logge inn manuelt.",
    registrationUnavailable: "Registrering er ikke tilgjengelig akkurat nå.",
    confirmLinkInvalid:
      "Bekreftelseslenken er ugyldig eller utløpt. Prøv å registrere deg eller logge inn på nytt.",
    mustBeLoggedIn: "Du må være innlogget.",
    emailMismatch:
      "E-postadressen stemmer ikke. Skriv inn e-posten din nøyaktig.",
    accountCannotDeleteYet: "Kontoen kan ikke slettes ennå.",
    onlyPlatformAdmin:
      "Du er den eneste plattformadministratoren. Utnevn en annen administrator før du sletter kontoen.",
    soleOwnerUser:
      "Du er eneste bruker og hovedeier i «{organizationName}». Inviter et nytt teammedlem eller kontakt support for å avslutte organisasjonen før du sletter kontoen.",
    lastOwner:
      "Du er siste hovedeier i «{organizationName}». Eierskap må overføres før du sletter kontoen. Kontakt support for hjelp.",
  },
  admin: {
    rolloutRange: "Utrulling må være mellom 0 og 100",
    reasonMinLength: "Begrunnelse må være minst {min} tegn.",
    reasonMinLengthShort: "Begrunnelse må være minst 5 tegn.",
    orgNotFound: "Organisasjonen finnes ikke.",
    featureFlagNotFound: "Funksjonsflagg ikke funnet",
    keyRequired: "Nøkkel er påkrevd",
    subjectRequired: "Emne er påkrevd",
    bodyRequired: "Innhold er påkrevd",
    nameRequired: "Navn er påkrevd",
    invalidCampaignStatus: "Ugyldig kampanjestatus",
    campaignNotFound: "Kampanje ikke funnet",
    campaignNeedsTemplate: "Kampanjen må ha en mal før den kan aktiveres",
    campaignMustBeActive: "Kampanjen må være aktiv før utsending",
    campaignMissingTemplate: "Kampanjen mangler mal",
    campaignMustBeActiveForSend: "Kampanjen må være aktiv for utsending",
    orgDeleteRemainingData:
      "Kunne ikke slette organisasjonen på grunn av gjenværende data. Kontakt utvikler.",
    cannotRemoveLastOwner: "Kan ikke fjerne siste eier. Overfør eierskap først.",
    cannotChangeLastOwnerRole:
      "Kan ikke endre rolle for siste eier. Overfør eierskap først.",
    newOwnerMustBeMember:
      "Ny eier må allerede være medlem av organisasjonen.",
    subjectMinLength: "Emne må være minst 3 tegn.",
    noteMinLength: "Notat må være minst 3 tegn.",
    messageMinLength: "Melding må være minst 3 tegn.",
    noOpenInvoice: "Ingen åpen faktura funnet.",
    supabaseServiceRoleMissing:
      "SUPABASE_SERVICE_ROLE_KEY mangler. Sett den i .env.local og start `npm run dev` på nytt.",
    expiredTrials: "{count} utløpte prøver",
  },
  billing: {
    testEnv: "Testmiljø",
    sandboxRequiresTestKey:
      "BILLING_MODE=sandbox krever STRIPE_SECRET_KEY med sk_test_ (testnøkkel).",
    liveRequiresLiveKey:
      "BILLING_MODE=live krever STRIPE_SECRET_KEY med sk_live_ (produksjonsnøkkel).",
    stripePriceMissing: "Stripe-pris mangler i miljøvariabler.",
    noStripeCustomer: "Ingen Stripe-kunde funnet. Start abonnement først.",
    expiredTrialFailed: "Utløpt prøveperiode feilet.",
    noStripeSubscription: "Ingen Stripe-abonnement funnet ennå.",
    noStripeSubscriptionShort: "Ingen Stripe-abonnement.",
    noStripeCustomerShort: "Ingen Stripe-kunde.",
    mustBeOwner: "Kun eier eller administrator kan fullføre oppsettet.",
    orgNameTaken: "Navnet er allerede tatt. Prøv et annet organisasjonsnavn.",
    completePayment: "Fullfør betaling",
    goToBilling: "Gå til fakturering",
    billingNotEnabled: "Fakturering er ikke aktivert.",
    invalidPlan: "Ugyldig abonnementsplan.",
    alreadyActiveSubscription:
      "Organisasjonen har allerede et aktivt abonnement. Bruk «Administrer abonnement».",
    checkoutSessionFailed: "Kunne ikke opprette betalingssesjon.",
    ownerOnly: "Kun organisasjonseier kan administrere abonnement.",
    ownerCanStart: "Kun eier kan starte abonnement.",
    production: "Produksjon",
    sandboxPublishableKey:
      "BILLING_MODE=sandbox krever NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY med pk_test_.",
    livePublishableKey:
      "BILLING_MODE=live krever NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY med pk_live_.",
  },
  customers: {
    hasBookings:
      "Kunden har {count} {bookingWord}. Slett eller flytt dem først.",
    bookingSingular: "reservasjon",
    bookingPlural: "reservasjoner",
    hasAccommodation:
      "Kunden har {count} overnattingsreservasjon{pluralSuffix}. Slett dem først under Overnatting.",
    mergeRequiresAdmin: "Kun administrator kan slå sammen duplikater.",
  },
  notifications: {
    newInquiry: "Ny forespørsel",
    newInquiryBody: "En ny forespørsel er registrert i systemet.",
    viewInquiry: "Se forespørsel",
    orgAccessGranted: "Du har fått tilgang til {orgName}.",
    orgAccessRestricted:
      "Tilgangen til {orgName} er begrenset på grunn av abonnement.{reasonText}",
    supportReply: "Svar på supportsak",
    supportReplyBody: "Nytt svar på «{subject}»: {preview}",
    defaultOrgName: "organisasjonen",
    trialReminderSubject: "Påminnelse om prøveperiode",
    mustBeOwner: "Kun eier eller administrator kan fullføre oppsettet.",
    orgNameTaken: "Navnet er allerede tatt. Prøv et annet organisasjonsnavn.",
    solePlatformAdmin:
      "Du er den eneste plattformadministratoren. Utnevn en annen administrator før du sletter kontoen.",
    soleOwnerOnlyMember:
      "Du er eneste bruker og hovedeier i «{organizationName}». Inviter et nytt teammedlem eller kontakt support for å avslutte organisasjonen før du sletter kontoen.",
    soleOwnerTransferRequired:
      "Du er siste hovedeier i «{organizationName}». Eierskap må overføres før du sletter kontoen. Kontakt support for hjelp.",
    supportReplyPreview: "Nytt svar på «{subject}»: {preview}",
    supportReplyTitle: "Svar på supportsak",
    newBooking: "Ny reservasjon",
    newBookingBody: "En ny reservasjon ({label}) er registrert.",
    viewBooking: "Se reservasjon",
    newAccommodation: "Ny overnatting",
    newAccommodationBody: "En ny overnattingsreservasjon er registrert.",
    teamMemberAdded: "Du er lagt til i et team",
    viewTeam: "Se team",
    accessRestricted: "Tilgang begrenset",
    accessRestrictedReason: " Grunn: {reason}",
    openSupport: "Åpne support",
    inquiryLabel: "Forespørsel",
  },
} as const;

export const serverErrorsEn = {
  auth: {
    invalidRequest: "Invalid request.",
    accountNotCreated: "Account was not created. Please try again.",
    accountCreatedSignInFailed:
      "Account was created, but sign-in failed. Try signing in manually.",
    registrationUnavailable: "Registration is not available right now.",
    confirmLinkInvalid:
      "The confirmation link is invalid or expired. Try registering again or sign in.",
    mustBeLoggedIn: "You must be signed in.",
    emailMismatch:
      "The email address does not match. Enter your email exactly.",
    accountCannotDeleteYet: "Account cannot be deleted yet.",
    onlyPlatformAdmin:
      "You are the only platform administrator. Appoint another administrator before deleting your account.",
    soleOwnerUser:
      "You are the only user and owner in «{organizationName}». Invite a new team member or contact support to close the organization before deleting your account.",
    lastOwner:
      "You are the last owner in «{organizationName}». Ownership must be transferred before you delete your account. Contact support for help.",
  },
  admin: {
    rolloutRange: "Rollout must be between 0 and 100",
    reasonMinLength: "Reason must be at least {min} characters.",
    reasonMinLengthShort: "Reason must be at least 5 characters.",
    orgNotFound: "Organization not found.",
    featureFlagNotFound: "Feature flag not found",
    keyRequired: "Key is required",
    subjectRequired: "Subject is required",
    bodyRequired: "Content is required",
    nameRequired: "Name is required",
    invalidCampaignStatus: "Invalid campaign status",
    campaignNotFound: "Campaign not found",
    campaignNeedsTemplate: "Campaign must have a template before it can be activated",
    campaignMustBeActive: "Campaign must be active before sending",
    campaignMissingTemplate: "Campaign is missing a template",
    campaignMustBeActiveForSend: "Campaign must be active for sending",
    orgDeleteRemainingData:
      "Could not delete the organization due to remaining data. Contact developer.",
    cannotRemoveLastOwner: "Cannot remove the last owner. Transfer ownership first.",
    cannotChangeLastOwnerRole:
      "Cannot change role for the last owner. Transfer ownership first.",
    newOwnerMustBeMember:
      "New owner must already be a member of the organization.",
    subjectMinLength: "Subject must be at least 3 characters.",
    noteMinLength: "Note must be at least 3 characters.",
    messageMinLength: "Message must be at least 3 characters.",
    noOpenInvoice: "No open invoice found.",
    supabaseServiceRoleMissing:
      "SUPABASE_SERVICE_ROLE_KEY is missing. Set it in .env.local and restart `npm run dev`.",
    expiredTrials: "{count} expired trials",
  },
  billing: {
    testEnv: "Test environment",
    sandboxRequiresTestKey:
      "BILLING_MODE=sandbox requires STRIPE_SECRET_KEY with sk_test_ (test key).",
    liveRequiresLiveKey:
      "BILLING_MODE=live requires STRIPE_SECRET_KEY with sk_live_ (production key).",
    stripePriceMissing: "Stripe price is missing in environment variables.",
    noStripeCustomer: "No Stripe customer found. Start a subscription first.",
    expiredTrialFailed: "Expired trial enforcement failed.",
    noStripeSubscription: "No Stripe subscription found yet.",
    noStripeSubscriptionShort: "No Stripe subscription.",
    noStripeCustomerShort: "No Stripe customer.",
    mustBeOwner: "Only owner or administrator can complete setup.",
    orgNameTaken: "Name is already taken. Try another organization name.",
    completePayment: "Complete payment",
    goToBilling: "Go to billing",
    billingNotEnabled: "Billing is not enabled.",
    invalidPlan: "Invalid subscription plan.",
    alreadyActiveSubscription:
      "Organization already has an active subscription. Use «Manage subscription».",
    checkoutSessionFailed: "Could not create checkout session.",
    ownerOnly: "Only the organization owner can manage the subscription.",
    ownerCanStart: "Only the owner can start a subscription.",
    production: "Production",
    sandboxPublishableKey:
      "BILLING_MODE=sandbox requires NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY with pk_test_.",
    livePublishableKey:
      "BILLING_MODE=live requires NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY with pk_live_.",
  },
  customers: {
    hasBookings:
      "Customer has {count} {bookingWord}. Delete or move them first.",
    bookingSingular: "booking",
    bookingPlural: "bookings",
    hasAccommodation:
      "Customer has {count} accommodation reservation{pluralSuffix}. Delete them first under Accommodation.",
    mergeRequiresAdmin: "Only administrators can merge duplicates.",
  },
  notifications: {
    newInquiry: "New inquiry",
    newInquiryBody: "A new inquiry has been registered in the system.",
    viewInquiry: "View inquiry",
    orgAccessGranted: "You have been granted access to {orgName}.",
    orgAccessRestricted:
      "Access to {orgName} is restricted due to subscription.{reasonText}",
    supportReply: "Support ticket reply",
    supportReplyBody: "New reply on «{subject}»: {preview}",
    defaultOrgName: "the organization",
    trialReminderSubject: "Trial period reminder",
    inquiryLabel: "Inquiry",
    mustBeOwner: "Only owner or administrator can complete setup.",
    orgNameTaken: "Name is already taken. Try another organization name.",
    solePlatformAdmin:
      "You are the only platform administrator. Appoint another administrator before deleting your account.",
    soleOwnerOnlyMember:
      "You are the only user and owner in «{organizationName}». Invite a new team member or contact support to close the organization before deleting your account.",
    soleOwnerTransferRequired:
      "You are the last owner in «{organizationName}». Ownership must be transferred before you delete your account. Contact support for help.",
    supportReplyPreview: "New reply on «{subject}»: {preview}",
    supportReplyTitle: "Support ticket reply",
    newBooking: "New booking",
    newBookingBody: "A new booking ({label}) has been registered.",
    viewBooking: "View booking",
    newAccommodation: "New accommodation",
    newAccommodationBody: "A new accommodation reservation has been registered.",
    teamMemberAdded: "You have been added to a team",
    viewTeam: "View team",
    accessRestricted: "Access restricted",
    accessRestrictedReason: " Reason: {reason}",
    openSupport: "Open support",
  },
} as const;
