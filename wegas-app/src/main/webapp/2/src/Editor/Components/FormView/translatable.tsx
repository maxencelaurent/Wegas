import * as React from 'react';
import { Schema } from 'jsoninput';
import { LangConsumer } from '../../../Components/LangContext';

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
    return (
      <LangConsumer>
        {({ lang, availableLang }) => {
          // Updade label
          const curCode = (
            availableLang.find(l => l.refName === lang) || {
              code: '',
            }
          ).code;
          const view = {
            ...props.view,
            label: (
              <span>
                {(props.view || {}).label} <span>[{curCode}]</span>
              </span>
            ),
          };
          const pvalue: ITranslatableContent =
            props.value == null
              ? { '@class': 'TranslatableContent', translations: {} }
              : props.value;
          return (
            <Comp
              {...props as any} // https://github.com/Microsoft/TypeScript/issues/28748
              value={pvalue.translations[lang]}
              view={view}
              onChange={value => {
                const v: ITranslatableContent = {
                  ...pvalue,
                  translations: {
                    ...pvalue.translations,
                    [lang]: value,
                  },
                };
                props.onChange(v);
              }}
            />
          );
        }}
      </LangConsumer>
    );
  }
  return Translated;
}
