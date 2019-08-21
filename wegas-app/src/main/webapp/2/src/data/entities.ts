const InheritanceTable = require('../../types/generated/Inheritance.json') as typeof import('../../types/generated/Inheritance.json');

type Mergeable = keyof typeof InheritanceTable;

function inherit(cls: string, type: Mergeable): boolean {
  if (cls in InheritanceTable) {
    const ext = InheritanceTable[cls as Mergeable];
    if (ext.includes(type)) {
      return true;
    }
    const extCls = ext[0];
    if (typeof extCls === 'string') {
      return inherit(extCls, type);
    }
  }
  return false;
}

/**
 * Test if an entity extends a given type
 *
 * @param variable Entity to check
 * @param type Inheritance type
 */
export const entityExtends = <
  Type extends IAbstractEntity,
  SuperType extends IAbstractEntity
>(
  variable: Type,
  type: Mergeable & SuperType['@class'],
): variable is Type & SuperType => inherit(variable['@class'], type);

/**
 * Check if variable has children
 * @param variable Variable to test
 */
export function varIsList<Type>(
  variable: Type,
): variable is Type & IParentDescriptor {
  return (
    typeof variable === 'object' &&
    variable !== null &&
    inherit(
      (variable as Record<string, unknown>)['@class'] as string,
      'DescriptorListI' as Mergeable, // There is an assumption: "DescriptorListI" isn't renamed
    )
  );
}
/**
 * Check entity type.
 * @param variable Variable to test
 * @param cls Discriminant, class
 */
export function entityIs<T extends IAbstractEntity>(
  variable: unknown,
  cls: T['@class'],
): variable is T {
  if ('object' === typeof variable && variable !== null) {
    return (variable as Record<string, unknown>)['@class'] === cls;
  }
  return false;
}
/**
 * Test if a given entity is persisted, ie it has an id
 * @param entity entity to test for
 */
export function entityIsPersisted<T extends IAbstractEntity>(
  entity: T,
): entity is T & { id: number } {
  return typeof entity.id === 'number';
}