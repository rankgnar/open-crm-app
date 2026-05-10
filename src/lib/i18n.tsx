import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'sv' | 'en' | 'pl'

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'sv', label: 'Svenska',  flag: '🇸🇪' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'pl', label: 'Polski',   flag: '🇵🇱' },
]

interface Dict {
  common: {
    loading: string
    cancel: string
    save: string
    delete: string
    logout: string
    light: string
    dark: string
    language: string
    theme: string
  }
  app: {
    errorNotFound: string
    errorAmbiguous: string
    errorInactive: string
    errorUnknown: string
    contactAdmin: string
  }
  nav: {
    hours: string
    leave: string
    material: string
    chat: string
    more: string
  }
  mer: {
    tabHistorik: string
    tabDokument: string
    tabLonespec: string
    tabInventering: string
    emptyDokument: string
    emptyLonespec: string
  }
  inventering: {
    empty: string
    antal: string
    skick: string
    placering: string
    namn: string
    save: string
    saving: string
    create: string
    newItem: string
  }
  chat: {
    empty: string
    placeholder: string
    send: string
  }
  material: {
    request: string
    list: string
    listPlaceholder: string
    submit: string
    submitting: string
    submitted: string
    errEmptyList: string
  }
  login: {
    tagline: string
    email: string
    password: string
    showPassword: string
    hidePassword: string
    signIn: string
    signingIn: string
    forgotPassword: string
    forgotTitle: string
    forgotDescription: string
    forgotSubmit: string
    forgotSubmitting: string
    forgotSent: string
    forgotBack: string
  }
  setPassword: {
    title: string
    description: string
    newPassword: string
    confirmPassword: string
    submit: string
    submitting: string
    errMin: string
    errMismatch: string
    errInvalidLink: string
    errLinkExpired: string
    success: string
    goToApp: string
    backToLogin: string
  }
  resetPassword: {
    title: string
    description: string
    newPassword: string
    confirmPassword: string
    submit: string
    submitting: string
    errMin: string
    errMismatch: string
    errInvalidLink: string
    errLinkExpired: string
    success: string
    goToApp: string
    backToLogin: string
  }
  hours: {
    register: string
    checkIn: string
    checkOut: string
    hoursUnit: string
    project: string
    selectProject: string
    description: string
    descriptionPlaceholder: string
    photos: string
    photosHint: string
    addPhotos: string
    photoCount: string
    transport: string
    transportPublic: string
    transportCar: string
    break: string
    submit: string
    submitting: string
    submitted: string
    alreadySubmitted: string
    noProjects: string
    errEndAfterStart: string
    errSelectProject: string
    errSelectTransport: string
    errDescription: string
    errUpload: string
  }
  leave: {
    request: string
    type: string
    from: string
    to: string
    dayUnit: string
    daysUnit: string
    comment: string
    commentPlaceholder: string
    submit: string
    submitting: string
    submitted: string
    errDatesRequired: string
    errEndAfterStart: string
    types: {
      semester: string
      ledig: string
      sjuk: string
      VAB: string
    }
  }
  history: {
    title: string
    filterHours: string
    filterLeave: string
    statHours: string
    statHoursLabel: string
    statLeave: string
    statLeaveLabel: string
    emptyHours: string
    emptyLeave: string
  }
  status: {
    pending: string
    approved: string
    denied: string
  }
}

const sv: Dict = {
  common: {
    loading: 'Laddar...',
    cancel: 'Avbryt',
    save: 'Spara',
    delete: 'Ta bort',
    logout: 'Logga ut',
    light: 'Ljust',
    dark: 'Mörkt',
    language: 'Språk',
    theme: 'Tema',
  },
  app: {
    errorNotFound: 'Ingen aktiv personalprofil hittades för {email}.',
    errorAmbiguous: 'Flera personalprofiler matchar din e-post.',
    errorInactive: 'Ditt personalkonto är inaktiverat.',
    errorUnknown: 'Något gick fel vid inloggning. Försök igen.',
    contactAdmin: 'Kontakta administratören för att koppla ditt konto.',
  },
  nav: { hours: 'Timmar', leave: 'Ledighet', material: 'Material', chat: 'Chat', more: 'Mer' },
  mer: {
    tabHistorik: 'Historik',
    tabDokument: 'Dokument',
    tabLonespec: 'Lönespec',
    tabInventering: 'Inventering',
    emptyDokument: 'Inga dokument ännu',
    emptyLonespec: 'Inga lönespecar ännu',
  },
  inventering: {
    empty: 'Inga inventarieposter',
    antal: 'Antal',
    skick: 'Skick',
    placering: 'Placering',
    namn: 'Namn',
    save: 'Spara',
    saving: 'Sparar...',
    create: 'Lägg till',
    newItem: 'Ny inventariepost',
  },
  chat: {
    empty: 'Inga meddelanden ännu. Skriv något till administratören.',
    placeholder: 'Skriv ett meddelande...',
    send: 'Skicka',
  },
  material: {
    request: 'Begär material',
    list: 'Materiallista',
    listPlaceholder: 'Skriv ett material per rad...',
    submit: 'Skicka begäran',
    submitting: 'Skickar...',
    submitted: 'Materialbegäran skickad!',
    errEmptyList: 'Skriv minst en post',
  },
  login: {
    tagline: 'Logga in för att registrera timmar',
    email: 'E-post',
    password: 'Lösenord',
    showPassword: 'Visa lösenord',
    hidePassword: 'Dölj lösenord',
    signIn: 'Logga in',
    signingIn: 'Loggar in...',
    forgotPassword: 'Glömt lösenord?',
    forgotTitle: 'Återställ lösenord',
    forgotDescription: 'Ange din e-postadress så skickar vi en länk för att välja ett nytt lösenord.',
    forgotSubmit: 'Skicka återställningslänk',
    forgotSubmitting: 'Skickar...',
    forgotSent: 'Om kontot finns har en återställningslänk skickats till {email}.',
    forgotBack: 'Tillbaka till inloggning',
  },
  setPassword: {
    title: 'Skapa lösenord',
    description: 'Välj ett lösenord för att slutföra din inbjudan.',
    newPassword: 'Nytt lösenord',
    confirmPassword: 'Bekräfta lösenord',
    submit: 'Spara och logga in',
    submitting: 'Sparar...',
    errMin: 'Lösenordet måste vara minst 8 tecken.',
    errMismatch: 'Lösenorden matchar inte.',
    errInvalidLink: 'Ogiltig eller redan använd länk. Be administratören skicka en ny inbjudan.',
    errLinkExpired: 'Länken har gått ut. Be administratören skicka en ny inbjudan.',
    success: 'Lösenord sparat. Du är nu inloggad.',
    goToApp: 'Fortsätt till appen',
    backToLogin: 'Tillbaka till inloggning',
  },
  resetPassword: {
    title: 'Välj nytt lösenord',
    description: 'Ange ett nytt lösenord för ditt konto.',
    newPassword: 'Nytt lösenord',
    confirmPassword: 'Bekräfta lösenord',
    submit: 'Spara nytt lösenord',
    submitting: 'Sparar...',
    errMin: 'Lösenordet måste vara minst 8 tecken.',
    errMismatch: 'Lösenorden matchar inte.',
    errInvalidLink: 'Ogiltig eller redan använd länk. Begär en ny återställning.',
    errLinkExpired: 'Länken har gått ut. Begär en ny återställning.',
    success: 'Lösenord uppdaterat. Du är nu inloggad.',
    goToApp: 'Fortsätt till appen',
    backToLogin: 'Tillbaka till inloggning',
  },
  hours: {
    register: 'Registrera timmar',
    checkIn: 'Incheckning',
    checkOut: 'Utcheckning',
    hoursUnit: 'timmar',
    project: 'Projekt',
    selectProject: 'Välj projekt...',
    description: 'Beskrivning',
    descriptionPlaceholder: 'Vad har du arbetat med idag?',
    photos: 'Foton',
    photosHint: 'rekommenderat',
    addPhotos: 'Lägg till foton',
    photoCount: '{n} foto(n) bifogade',
    transport: 'Transportsätt',
    transportPublic: 'Kollektivtrafik',
    transportCar: 'Firmabil',
    break: 'Paus',
    submit: 'Skicka in timmar',
    submitting: 'Skickar...',
    submitted: 'Tidrapport skickad!',
    alreadySubmitted: 'Tidrapport redan inskickad för denna dag',
    noProjects: 'Du har inga tilldelade projekt. Kontakta administratören.',
    errEndAfterStart: 'Utcheckning måste vara efter incheckning',
    errSelectProject: 'Välj ett projekt',
    errSelectTransport: 'Välj transportsätt',
    errDescription: 'Beskrivning krävs',
    errUpload: 'Kunde inte ladda upp foto: {name}',
  },
  leave: {
    request: 'Ansök om ledighet',
    type: 'Typ av ledighet',
    from: 'Från',
    to: 'Till',
    dayUnit: 'dag',
    daysUnit: 'dagar',
    comment: 'Kommentar',
    commentPlaceholder: 'Valfri kommentar till administratören...',
    submit: 'Skicka ansökan',
    submitting: 'Skickar...',
    submitted: 'Ansökan skickad!',
    errDatesRequired: 'Start- och slutdatum krävs',
    errEndAfterStart: 'Slutdatum måste vara efter startdatum',
    types: {
      semester: 'Semester',
      ledig: 'Ledig',
      sjuk: 'Sjuk',
      VAB: 'VAB',
    },
  },
  history: {
    title: 'Historik',
    filterHours: 'Timmar',
    filterLeave: 'Ledighet',
    statHours: '{n} h',
    statHoursLabel: 'godkänt denna månad',
    statLeave: '{n} dagar',
    statLeaveLabel: 'semester godkänt {year}',
    emptyHours: 'Inga timmar registrerade',
    emptyLeave: 'Inga ansökningar',
  },
  status: {
    pending: 'Väntar på godkännande',
    approved: 'Godkänd',
    denied: 'Nekad',
  },
}

const en: Dict = {
  common: {
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    logout: 'Sign out',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    theme: 'Theme',
  },
  app: {
    errorNotFound: 'No active employee profile found for {email}.',
    errorAmbiguous: 'Multiple employee profiles match your email.',
    errorInactive: 'Your employee account is deactivated.',
    errorUnknown: 'Something went wrong during sign-in. Please try again.',
    contactAdmin: 'Contact your administrator to link your account.',
  },
  nav: { hours: 'Hours', leave: 'Time off', material: 'Materials', chat: 'Chat', more: 'More' },
  mer: {
    tabHistorik: 'History',
    tabDokument: 'Documents',
    tabLonespec: 'Pay slips',
    tabInventering: 'Inventory',
    emptyDokument: 'No documents yet',
    emptyLonespec: 'No pay slips yet',
  },
  inventering: {
    empty: 'No inventory items',
    antal: 'Quantity',
    skick: 'Condition',
    placering: 'Location',
    namn: 'Name',
    save: 'Save',
    saving: 'Saving...',
    create: 'Add item',
    newItem: 'New inventory item',
  },
  chat: {
    empty: 'No messages yet. Write something to the administrator.',
    placeholder: 'Write a message...',
    send: 'Send',
  },
  material: {
    request: 'Request materials',
    list: 'Material list',
    listPlaceholder: 'Write one item per line...',
    submit: 'Submit request',
    submitting: 'Submitting...',
    submitted: 'Material request sent!',
    errEmptyList: 'Write at least one item',
  },
  login: {
    tagline: 'Sign in to log your hours',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    forgotPassword: 'Forgot password?',
    forgotTitle: 'Reset password',
    forgotDescription: "Enter your email and we'll send you a link to choose a new password.",
    forgotSubmit: 'Send reset link',
    forgotSubmitting: 'Sending...',
    forgotSent: 'If the account exists, a reset link has been sent to {email}.',
    forgotBack: 'Back to sign in',
  },
  setPassword: {
    title: 'Create password',
    description: 'Choose a password to finish your invitation.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    submit: 'Save and sign in',
    submitting: 'Saving...',
    errMin: 'Password must be at least 8 characters.',
    errMismatch: 'Passwords do not match.',
    errInvalidLink: 'Invalid or already-used link. Ask your administrator for a new invitation.',
    errLinkExpired: 'The link has expired. Ask your administrator for a new invitation.',
    success: 'Password saved. You are now signed in.',
    goToApp: 'Continue to app',
    backToLogin: 'Back to sign in',
  },
  resetPassword: {
    title: 'Choose a new password',
    description: 'Enter a new password for your account.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    submit: 'Save new password',
    submitting: 'Saving...',
    errMin: 'Password must be at least 8 characters.',
    errMismatch: 'Passwords do not match.',
    errInvalidLink: 'Invalid or already-used link. Request a new reset.',
    errLinkExpired: 'The link has expired. Request a new reset.',
    success: 'Password updated. You are now signed in.',
    goToApp: 'Continue to app',
    backToLogin: 'Back to sign in',
  },
  hours: {
    register: 'Log hours',
    checkIn: 'Check in',
    checkOut: 'Check out',
    hoursUnit: 'hours',
    project: 'Project',
    selectProject: 'Select project...',
    description: 'Description',
    descriptionPlaceholder: 'What did you work on today?',
    photos: 'Photos',
    photosHint: 'recommended',
    addPhotos: 'Add photos',
    photoCount: '{n} photo(s) attached',
    transport: 'Transport',
    transportPublic: 'Public transport',
    transportCar: 'Company car',
    break: 'Break',
    submit: 'Submit hours',
    submitting: 'Submitting...',
    submitted: 'Hours submitted!',
    alreadySubmitted: 'Hours already submitted for this day',
    noProjects: 'You have no assigned projects. Contact your administrator.',
    errEndAfterStart: 'Check-out must be after check-in',
    errSelectProject: 'Please select a project',
    errSelectTransport: 'Please select a transport mode',
    errDescription: 'Description is required',
    errUpload: 'Could not upload photo: {name}',
  },
  leave: {
    request: 'Request time off',
    type: 'Type of leave',
    from: 'From',
    to: 'To',
    dayUnit: 'day',
    daysUnit: 'days',
    comment: 'Comment',
    commentPlaceholder: 'Optional note for your administrator...',
    submit: 'Submit request',
    submitting: 'Submitting...',
    submitted: 'Request submitted!',
    errDatesRequired: 'Start and end dates are required',
    errEndAfterStart: 'End date must be after start date',
    types: {
      semester: 'Vacation',
      ledig: 'Day off',
      sjuk: 'Sick leave',
      VAB: 'Care for child',
    },
  },
  history: {
    title: 'History',
    filterHours: 'Hours',
    filterLeave: 'Time off',
    statHours: '{n} h',
    statHoursLabel: 'approved this month',
    statLeave: '{n} days',
    statLeaveLabel: 'vacation approved {year}',
    emptyHours: 'No hours logged',
    emptyLeave: 'No requests',
  },
  status: {
    pending: 'Awaiting approval',
    approved: 'Approved',
    denied: 'Denied',
  },
}

const pl: Dict = {
  common: {
    loading: 'Ładowanie...',
    cancel: 'Anuluj',
    save: 'Zapisz',
    delete: 'Usuń',
    logout: 'Wyloguj',
    light: 'Jasny',
    dark: 'Ciemny',
    language: 'Język',
    theme: 'Motyw',
  },
  app: {
    errorNotFound: 'Nie znaleziono aktywnego profilu pracownika dla {email}.',
    errorAmbiguous: 'Wiele profili pracowników pasuje do Twojego adresu e-mail.',
    errorInactive: 'Twoje konto pracownika jest dezaktywowane.',
    errorUnknown: 'Coś poszło nie tak podczas logowania. Spróbuj ponownie.',
    contactAdmin: 'Skontaktuj się z administratorem, aby powiązać konto.',
  },
  nav: { hours: 'Godziny', leave: 'Urlop', material: 'Materiały', chat: 'Czat', more: 'Więcej' },
  mer: {
    tabHistorik: 'Historia',
    tabDokument: 'Dokumenty',
    tabLonespec: 'Wypłaty',
    tabInventering: 'Inwentarz',
    emptyDokument: 'Brak dokumentów',
    emptyLonespec: 'Brak wypłat',
  },
  inventering: {
    empty: 'Brak pozycji inwentarza',
    antal: 'Ilość',
    skick: 'Stan',
    placering: 'Lokalizacja',
    namn: 'Nazwa',
    save: 'Zapisz',
    saving: 'Zapisywanie...',
    create: 'Dodaj',
    newItem: 'Nowa pozycja',
  },
  chat: {
    empty: 'Brak wiadomości. Napisz coś do administratora.',
    placeholder: 'Wpisz wiadomość...',
    send: 'Wyślij',
  },
  material: {
    request: 'Zamów materiały',
    list: 'Lista materiałów',
    listPlaceholder: 'Wpisz jedną pozycję na linię...',
    submit: 'Wyślij zamówienie',
    submitting: 'Wysyłanie...',
    submitted: 'Zamówienie wysłane!',
    errEmptyList: 'Wpisz przynajmniej jedną pozycję',
  },
  login: {
    tagline: 'Zaloguj się, aby zarejestrować godziny',
    email: 'E-mail',
    password: 'Hasło',
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
    signIn: 'Zaloguj się',
    signingIn: 'Logowanie...',
    forgotPassword: 'Nie pamiętasz hasła?',
    forgotTitle: 'Zresetuj hasło',
    forgotDescription: 'Podaj swój e-mail, a wyślemy link do ustawienia nowego hasła.',
    forgotSubmit: 'Wyślij link do resetu',
    forgotSubmitting: 'Wysyłanie...',
    forgotSent: 'Jeśli konto istnieje, link resetujący został wysłany na {email}.',
    forgotBack: 'Powrót do logowania',
  },
  setPassword: {
    title: 'Ustaw hasło',
    description: 'Wybierz hasło, aby dokończyć zaproszenie.',
    newPassword: 'Nowe hasło',
    confirmPassword: 'Potwierdź hasło',
    submit: 'Zapisz i zaloguj',
    submitting: 'Zapisywanie...',
    errMin: 'Hasło musi mieć co najmniej 8 znaków.',
    errMismatch: 'Hasła nie pasują do siebie.',
    errInvalidLink: 'Nieprawidłowy lub już użyty link. Poproś administratora o nowe zaproszenie.',
    errLinkExpired: 'Link wygasł. Poproś administratora o nowe zaproszenie.',
    success: 'Hasło zapisane. Jesteś teraz zalogowany.',
    goToApp: 'Przejdź do aplikacji',
    backToLogin: 'Powrót do logowania',
  },
  resetPassword: {
    title: 'Wybierz nowe hasło',
    description: 'Wpisz nowe hasło dla swojego konta.',
    newPassword: 'Nowe hasło',
    confirmPassword: 'Potwierdź hasło',
    submit: 'Zapisz nowe hasło',
    submitting: 'Zapisywanie...',
    errMin: 'Hasło musi mieć co najmniej 8 znaków.',
    errMismatch: 'Hasła nie pasują do siebie.',
    errInvalidLink: 'Nieprawidłowy lub już użyty link. Poproś o nowy reset.',
    errLinkExpired: 'Link wygasł. Poproś o nowy reset.',
    success: 'Hasło zaktualizowane. Jesteś teraz zalogowany.',
    goToApp: 'Przejdź do aplikacji',
    backToLogin: 'Powrót do logowania',
  },
  hours: {
    register: 'Zarejestruj godziny',
    checkIn: 'Wejście',
    checkOut: 'Wyjście',
    hoursUnit: 'godzin',
    project: 'Projekt',
    selectProject: 'Wybierz projekt...',
    description: 'Opis',
    descriptionPlaceholder: 'Nad czym dzisiaj pracowałeś?',
    photos: 'Zdjęcia',
    photosHint: 'zalecane',
    addPhotos: 'Dodaj zdjęcia',
    photoCount: 'Załączone zdjęcia: {n}',
    transport: 'Transport',
    transportPublic: 'Komunikacja publiczna',
    transportCar: 'Samochód służbowy',
    break: 'Przerwa',
    submit: 'Wyślij godziny',
    submitting: 'Wysyłanie...',
    submitted: 'Godziny wysłane!',
    alreadySubmitted: 'Godziny dla tego dnia są już wysłane',
    noProjects: 'Nie masz przypisanych projektów. Skontaktuj się z administratorem.',
    errEndAfterStart: 'Wyjście musi być po wejściu',
    errSelectProject: 'Wybierz projekt',
    errSelectTransport: 'Wybierz środek transportu',
    errDescription: 'Opis jest wymagany',
    errUpload: 'Nie można przesłać zdjęcia: {name}',
  },
  leave: {
    request: 'Wniosek o urlop',
    type: 'Typ urlopu',
    from: 'Od',
    to: 'Do',
    dayUnit: 'dzień',
    daysUnit: 'dni',
    comment: 'Komentarz',
    commentPlaceholder: 'Opcjonalna notatka dla administratora...',
    submit: 'Wyślij wniosek',
    submitting: 'Wysyłanie...',
    submitted: 'Wniosek wysłany!',
    errDatesRequired: 'Daty początkowa i końcowa są wymagane',
    errEndAfterStart: 'Data końcowa musi być po dacie początkowej',
    types: {
      semester: 'Urlop',
      ledig: 'Wolne',
      sjuk: 'Chorobowe',
      VAB: 'Opieka nad dzieckiem',
    },
  },
  history: {
    title: 'Historia',
    filterHours: 'Godziny',
    filterLeave: 'Urlop',
    statHours: '{n} h',
    statHoursLabel: 'zatwierdzone w tym miesiącu',
    statLeave: '{n} dni',
    statLeaveLabel: 'urlopu zatwierdzone {year}',
    emptyHours: 'Brak zarejestrowanych godzin',
    emptyLeave: 'Brak wniosków',
  },
  status: {
    pending: 'Oczekuje na zatwierdzenie',
    approved: 'Zatwierdzone',
    denied: 'Odrzucone',
  },
}

const DICTS: Record<Lang, Dict> = { sv, en, pl }

const LOCALE_TAGS: Record<Lang, string> = {
  sv: 'sv-SE',
  en: 'en-GB',
  pl: 'pl-PL',
}

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (path: string, vars?: Record<string, string | number>) => string
  locale: string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'open-crm-app.lang'

function readInitial(): Lang {
  if (typeof window === 'undefined') return 'sv'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'sv' || stored === 'en' || stored === 'pl') return stored
  const nav = window.navigator.language.toLowerCase()
  if (nav.startsWith('en')) return 'en'
  if (nav.startsWith('pl')) return 'pl'
  return 'sv'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitial)

  useEffect(() => {
    document.documentElement.lang = lang
    window.localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTS[lang]
    return {
      lang,
      setLang: setLangState,
      locale: LOCALE_TAGS[lang],
      t(path, vars) {
        const value = path.split('.').reduce<unknown>((acc, key) => {
          if (acc && typeof acc === 'object' && key in acc) {
            return (acc as Record<string, unknown>)[key]
          }
          return undefined
        }, dict)
        let str = typeof value === 'string' ? value : path
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            str = str.replace(`{${k}}`, String(v))
          }
        }
        return str
      },
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
