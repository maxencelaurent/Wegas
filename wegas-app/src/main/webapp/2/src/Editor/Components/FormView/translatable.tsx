import * as React from 'react';
import { Schema } from 'jsoninput';
import { languagesCTX } from '../../../Components/Contexts/LanguagesProvider';
import { entityIs } from '../../../data/entities';

interface TranslatableProps {
  value?: ITranslatableContent;
  onChange: (value: ITranslatableContent) => void;
  view: Schema['view'] & { label?: string };
}

interface EndProps {
  value?: string | number;
  onChange: (value: string) => void;
  view: { label?: JSX.Element; [prop: string]: unknown };
}
/**
 * HOC: Transform a hashmap (lang:value) into value based on current language
 * @param Comp
 */
export default function translatable<P extends EndProps>(
  Comp: React.ComponentType<P>,
) {
  function Translated(
    props: TranslatableProps & Omit<P, 'value' | 'onChange'>,
  ) {
    const { lang, availableLang } = React.useContext(languagesCTX);

    // Updade label
    const curCode = (
      availableLang.find(l => l.code === lang) || {
        code: '',
      }
    ).code;
    const view = React.useMemo(
      () => ({
        ...props.view,
        label: (
          <span>
            {props.view.label}{' '}
            {props.view.label !== undefined && <span>[{curCode}]</span>}
          </span>
        ),
      }),
      [props.view, curCode],
    );
    const pvalue: ITranslatableContent =
      typeof props.value === 'object' &&
      entityIs(props.value, 'TranslatableContent')
        ? props.value
        : {
            '@class': 'TranslatableContent',
            translations: {
              [lang]: {
                '@class': 'Translation',
                lang: lang,
                status: '',
                translation:
                  typeof props.value === 'string'
                    ? props.value
                    : JSON.stringify(props.value),
              },
            },
            version: 0,
          };

    const currTranslation = pvalue.translations[lang];

    return (
      <Comp
        {...(props as any)} // https://github.com/Microsoft/TypeScript/issues/28748
        value={currTranslation != null ? currTranslation.translation : ''}
        view={view}
        onChange={value => {
          const v: ITranslatableContent = {
            ...pvalue,
            translations: {
              ...pvalue.translations,
              [lang]: {
                ...{ status: '' },
                ...pvalue.translations[lang],
                translation: value,
                lang,
              },
            },
          };
          props.onChange(v);
        }}
      />
    );
  }
  return Translated;
}
