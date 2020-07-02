import { getInstance as rawGetInstance } from '../../methods/VariableDescriptorMethods';
import { TranslatableContent } from '../../i18n';
import { ITextDescriptor, IPlayer, ITranslatableContent } from 'wegas-ts-api/typings/WegasEntities';

export function getValue(td: ITextDescriptor) {
  return (self: IPlayer) => {
    const ti = rawGetInstance(td, self);
    if (ti) {
      return TranslatableContent.toString(
        ti.trValue === undefined ? null : ti.trValue,
      );
    }
  };
}

export function setValue(_td: ITextDescriptor) {
  return (_self: IPlayer, _value: ITranslatableContent) => {
    throw Error('This is readonly');
  };
}

export function setValueIfChanged(_td: ITextDescriptor) {
  return (_self: IPlayer, _value: ITranslatableContent) => {
    throw Error('This is readonly');
  };
}

