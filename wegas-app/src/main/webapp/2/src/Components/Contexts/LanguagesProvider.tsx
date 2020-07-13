import * as React from 'react';
import { Menu, SelectedMenuItem } from '../Menu';
import { useGameModel } from '../Hooks/useGameModel';

interface LanguagesProviderProps {
  lang?: string;
  children?: React.ReactNode;
  availableLang?: IGameModelLanguage[];
}
interface LanguagesContext extends LanguagesProviderProps {
  lang: string;
  selectLang: (lang: string) => void;
  availableLang: IGameModelLanguage[];
}

export const languagesCTX = React.createContext<LanguagesContext>({
  lang: '',
  selectLang: () => {},
  availableLang: [],
});

function LanguagesContext({
  availableLang,
  lang,
  children,
}: Readonly<LanguagesProviderProps>) {
  const gameModelLanguages = useGameModel().languages;
  const getAvailableLanguages = availableLang
    ? availableLang
    : gameModelLanguages;
  const getCurrentLanguage = lang || getAvailableLanguages[0].code;

  const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage);
  React.useEffect(() => {
    setCurrentLang(currentLanguage => {
      if (
        !getAvailableLanguages
          .map(language => language.code)
          .includes(currentLanguage)
      ) {
        return getCurrentLanguage;
      }
      return currentLanguage;
    });
  }, [getAvailableLanguages, getCurrentLanguage]);

  function selectLang(lang: string) {
    if (gameModelLanguages.find(l => l.code === lang)) {
      setCurrentLang(lang);
    }
  }
  return (
    <languagesCTX.Provider
      value={{
        availableLang: availableLang ? availableLang : gameModelLanguages,
        lang: currentLang,
        selectLang,
      }}
    >
      {children}
    </languagesCTX.Provider>
  );
}

/**
 * Provider for LangContext Handles stores language change
 */
export const LanguagesProvider = React.memo(LanguagesContext);

interface LanguageSelectorProps {
  language?: string;
  onSelect: (
    item: SelectedMenuItem<IGameModelLanguage>,
    keyEvent: ModifierKeysEvent,
  ) => void;
  filterActiveLanguages?: boolean;
}
export function LanguageSelector({
  language,
  onSelect,
  filterActiveLanguages,
}: LanguageSelectorProps) {
  const { lang, availableLang } = React.useContext(languagesCTX);
  const [currentLanguage, setCurrentLang] = React.useState(
    language ? language : lang,
  );
  const languages = filterActiveLanguages
    ? availableLang.filter(language => language.active)
    : availableLang;
  return (
    <Menu
      label={currentLanguage}
      items={languages.map(language => ({
        value: language,
        label: `${language.code} : ${language.lang}`,
      }))}
      onSelect={(item, keys) => {
        setCurrentLang(item.value.code);
        onSelect(item, keys);
      }}
    />
  );
}

/**
 * Language selector allows to select language inside the language context given by the LangProvider
 */
export function LangToggler() {
  const { lang, selectLang } = React.useContext(languagesCTX);
  return (
    <LanguageSelector
      language={lang}
      onSelect={({ value }) => selectLang(value.code)}
    />
  );
}
