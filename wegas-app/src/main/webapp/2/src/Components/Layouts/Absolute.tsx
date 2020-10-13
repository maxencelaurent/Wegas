import * as React from 'react';
import {
  WegasComponentProps,
  WegasComponentItemProps,
} from '../PageComponents/tools/EditableComponent';
import { HashListChoices } from '../../Editor/Components/FormView/HashList';
import { schemaProps } from '../PageComponents/tools/schemaProps';
import { classNameOrEmpty } from '../../Helper/className';
import { layoutStyle } from '../../css/classes';

export function AbsoluteLayout({ className, children }: WegasComponentProps) {
  return (
    <div className={layoutStyle + classNameOrEmpty(className)}>{children}</div>
  );
}

export interface AbsoluteItemLayoutProps {
  position?: {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
  };
  size?: {
    width?: string;
    height?: string;
  };
}

export const defaultAbsoluteLayoutProps: AbsoluteItemLayoutProps = {
  position: undefined,
  size: undefined,
};
export const defaultAbsoluteLayoutPropsKeys = Object.keys(
  defaultAbsoluteLayoutProps,
) as (keyof AbsoluteItemLayoutProps)[];

interface AbsoluteItemProps
  extends React.PropsWithChildren<WegasComponentItemProps> {
  layout?: AbsoluteItemLayoutProps;
}

export const AbsoluteItem = React.forwardRef<HTMLDivElement, AbsoluteItemProps>(
  (
    {
      layout,
      tooltip,
      style,
      className,
      onClick,
      onMouseOver,
      onMouseLeave,
      onDragEnter,
      onDragLeave,
      onDragEnd,
      children,
    },
    ref,
  ) => {
    const { position = {}, size = {} } = layout || {};
    return (
      <div
        ref={ref}
        style={{ position: 'absolute', ...position, ...size, ...style }}
        title={tooltip}
        onClick={onClick}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        className={className}
      >
        {children}
      </div>
    );
  },
);

export const absolutelayoutChoices: HashListChoices = [
  {
    label: 'Position',
    value: { prop: 'position' },
    items: [
      {
        label: 'Left',
        value: { prop: 'left', schema: schemaProps.number({ label: 'Left' }) },
      },
      {
        label: 'Right',
        value: {
          prop: 'right',
          schema: schemaProps.number({ label: 'Right' }),
        },
      },
      {
        label: 'Top',
        value: { prop: 'top', schema: schemaProps.number({ label: 'Top' }) },
      },
      {
        label: 'Bottom',
        value: {
          prop: 'bottom',
          schema: schemaProps.number({ label: 'Bottom' }),
        },
      },
      {
        label: 'Foreground index',
        value: {
          prop: 'zIndex',
          schema: schemaProps.number({ label: 'Foreground index' }),
        },
      },
    ],
  },
  {
    label: 'Size',
    value: { prop: 'size' },
    items: [
      {
        label: 'Width',
        value: {
          prop: 'width',
          schema: schemaProps.number({ label: 'Width' }),
        },
      },
      {
        label: 'Height',
        value: {
          prop: 'height',
          schema: schemaProps.number({ label: 'Height' }),
        },
      },
    ],
  },
];
