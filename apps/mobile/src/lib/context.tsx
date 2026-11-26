import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { devotionalSeeds, type Devotional, type Language } from '@bhope/shared';
import { bible, getPreference, initializeStorage, setPreference } from './storage';
import { api, apiUrl } from './api';
import { isTheme, type ThemeId } from './themes';
export interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
interface AppState {
  user: AccountUser | null;
  refreshUser: () => Promise<void>;
  language: Language;
  setLanguage: (language: Language) => void;
  bibleLanguage: Language;
  setBibleLanguage: (language: Language) => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  ready: boolean;
  error: string;
  devotionals: Devotional[];
  rememberDevotionals: (items: Devotional[]) => void;
  retry: () => void;
}
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const refreshUser = useCallback(async () => {
    if (!apiUrl) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<AccountUser>('/auth/me'));
    } catch {
      setUser(null);
    }
  }, []);
  useEffect(() => {
    if (!apiUrl) return;
    let active = true;
    void api<AccountUser>('/auth/me')
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);
  const [language, updateLanguage] = useState<Language>('en');
  const [bibleLanguage, updateBibleLanguage] = useState<Language>('en');
  const [theme, updateTheme] = useState<ThemeId>('evergreen');
  const [fontSize, updateSize] = useState(20);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [devotionals, setDevotionals] = useState<Devotional[]>(devotionalSeeds);
  const rememberDevotionals = useCallback((items: Devotional[]) => {
    if (!items.length) return;
    setDevotionals((previous) => {
      const incoming = new Map(items.map((item) => [item.id, item]));
      return [...incoming.values(), ...previous.filter((item) => !incoming.has(item.id))].slice(
        0,
        500,
      );
    });
  }, []);
  useEffect(() => {
    if (ready)
      void setPreference('devotionals-cache', JSON.stringify(devotionals)).catch(() => undefined);
  }, [ready, devotionals]);
  useEffect(() => {
    let active = true;
    (async () => {
      setError('');
      await initializeStorage();
      const preferred = await getPreference('language');
      const available = bible.versions.some((version) => version.id === preferred);
      const preferredBible = await getPreference('bible-language');
      const initialBibleLanguage = bible.versions.some((version) => version.id === preferredBible)
        ? (preferredBible as Language)
        : available
          ? (preferred as Language)
          : bible.versions[0].id;
      if (!preferredBible) await setPreference('bible-language', initialBibleLanguage);
      const savedTheme = await getPreference('theme');
      const size = Number(await getPreference('font-size'));
      const cache = await getPreference('devotionals-cache');
      if (active) {
        updateLanguage(available ? (preferred as Language) : 'en');
        updateBibleLanguage(initialBibleLanguage);
        if (isTheme(savedTheme)) updateTheme(savedTheme);
        if (size >= 16 && size <= 28) updateSize(size);
        if (cache) {
          try {
            const saved = JSON.parse(cache);
            if (Array.isArray(saved) && saved.length) setDevotionals(saved);
          } catch {
            /* use bundled reflections */
          }
        }
        setReady(true);
      }
      if (apiUrl)
        try {
          const items = await api<Devotional[]>('/devotionals');
          if (items.length) {
            if (active) rememberDevotionals(items);
          }
        } catch {
          /* keep cached reading available offline */
        }
    })().catch((failure) => {
      if (active)
        setError(
          failure instanceof Error ? failure.message : 'Your offline library could not be opened.',
        );
    });
    return () => {
      active = false;
    };
  }, [attempt, rememberDevotionals]);
  const changeLanguage = (value: Language) => {
    updateLanguage(value);
    void setPreference('language', value).catch(() =>
      setError('Your language preference could not be saved.'),
    );
  };
  const changeBibleLanguage = (value: Language) => {
    updateBibleLanguage(value);
    void setPreference('bible-language', value).catch(() =>
      setError('Your Bible language could not be saved.'),
    );
  };
  const changeTheme = (value: ThemeId) => {
    updateTheme(value);
    void setPreference('theme', value).catch(() => setError('Your theme could not be saved.'));
  };
  const changeSize = (value: number) => {
    const size = Math.max(16, Math.min(28, value));
    updateSize(size);
    void setPreference('font-size', String(size)).catch(() =>
      setError('Your reading preference could not be saved.'),
    );
  };
  return (
    <Context.Provider
      value={{
        user,
        refreshUser,
        language,
        setLanguage: changeLanguage,
        bibleLanguage,
        setBibleLanguage: changeBibleLanguage,
        theme,
        setTheme: changeTheme,
        fontSize,
        setFontSize: changeSize,
        ready,
        error,
        devotionals,
        rememberDevotionals,
        retry: () => {
          setReady(false);
          setAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is required.');
  return value;
}
