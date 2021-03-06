import * as React from 'react';
import {
  library,
  IconPrefix,
  IconDefinition,
  IconName,
} from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon, Props } from '@fortawesome/react-fontawesome';
import { far } from '@fortawesome/free-regular-svg-icons';
import { omit } from 'lodash-es';

// These icon definitions MUST be added to library in order for React-Fontawsome to work properly
library.add(fas, far);

export interface IconString {
  value: string;
  color?: React.CSSProperties['color'];
  fontSize?: React.CSSProperties['fontSize'];
  fontWeight?: React.CSSProperties['fontWeight'];
}

export type Icon = IconName | Props | IconString;
export type Icons = Icon | Icon[];

export const prefixes = [
  'fas',
  /*'fab',*/ 'far' /*'fal', 'fad'*/,
] as IconPrefix[];

export const icons = {
  // undefined: undefined,
  ...Object.values(fas).reduce(
    (o: {}, v: IconDefinition) =>
      typeof v === 'object' && 'iconName' in v && v.iconName !== undefined
        ? { ...o, [v.iconName]: v }
        : o,
    {},
  ),
};

export function isProps(icon: Icons): icon is Props {
  return !Array.isArray(icon) && typeof icon === 'object' && 'icon' in icon;
}

export function isIconString(icon: Icons): icon is IconString {
  return !Array.isArray(icon) && typeof icon === 'object' && 'value' in icon;
}

interface IconDisplayProps {
  icon: Icon;
  style?: React.CSSProperties;
}

function IconDisplay({ icon, style }: IconDisplayProps) {
  return isProps(icon) ? (
    <FontAwesome fixedWidth {...icon} style={style} />
  ) : isIconString(icon) ? (
    <div
      className="fa-layers svg-inline--fa fa-w-16 fa-fw"
      style={{
        display: 'table-cell',
        verticalAlign: 'middle',
      }}
    >
      <div style={{ ...omit(icon, 'value'), ...style }}>{icon.value}</div>
    </div>
  ) : (
    <FontAwesome fixedWidth icon={icon} style={style} />
  );
}

interface IconCompProps {
  icon?: Icons;
  style?: React.CSSProperties;
}

export function IconComp({ icon, style }: IconCompProps) {
  return icon == null ? (
    <pre>No icon</pre>
  ) : Array.isArray(icon) ? (
    <span className="fa-layers fa-fw">
      {icon.map((ic: Icon, i) => (
        <IconDisplay
          key={JSON.stringify(ic) + String(i)}
          icon={ic}
          style={style}
        />
      ))}
    </span>
  ) : (
    <IconDisplay icon={icon} style={style} />
  );
}

/**
 * see https://github.com/FortAwesome/Font-Awesome/issues/14774
 * @param icon icon to render
 * @param def icon to use if first icon is not defined
 */
export function withDefault(icon: Icons | undefined | null, def: Icons): Icons {
  if (icon != null) return icon;
  return def;
}
export const FontAwesome = FontAwesomeIcon;
