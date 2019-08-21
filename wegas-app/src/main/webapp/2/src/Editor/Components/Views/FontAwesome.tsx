import { library, IconProp } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

library.add(fas);
/**
 * see https://github.com/FortAwesome/Font-Awesome/issues/14774
 * @param icon icon to render
 * @param def icon to use if first icon is not defined
 */
export function withDefault(
  icon: IconProp | undefined | null,
  def: IconProp,
): IconProp {
  if (icon != null) return icon;
  return def;
}
export const FontAwesome = FontAwesomeIcon;