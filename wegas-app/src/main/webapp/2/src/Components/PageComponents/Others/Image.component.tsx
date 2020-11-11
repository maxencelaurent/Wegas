import * as React from 'react';
import {
  pageComponentFactory,
  registerComponent,
} from '../tools/componentFactory';
import { WegasComponentProps } from '../tools/EditableComponent';
import { schemaProps } from '../tools/schemaProps';
import { classAndStyleShema } from '../tools/options';
import { IScript } from 'wegas-ts-api';
import { useScript } from '../../Hooks/useScript';
import { css } from 'emotion';

const initialImageStyle = css({
  width: '100%',
});

interface SvgLoaderProps extends WegasComponentProps {
  script?: IScript;
}

function Image({ script, style, className, context }: SvgLoaderProps) {
  const path = useScript<string>(script, context);
  return (
    <img
      src={path}
      style={style}
      className={className ? className : initialImageStyle}
    />
  );
}

registerComponent(
  pageComponentFactory({
    component: Image,
    componentType: 'Output',
    name: 'Image',
    icon: 'image',
    schema: {
      script: schemaProps.path({
        label: 'Source',
        pick: 'FILE',
        filter: {
          fileType: 'image',
          filterType: 'show',
        },
        scriptable: true,
      }),
      ...classAndStyleShema,
    },
  }),
);
