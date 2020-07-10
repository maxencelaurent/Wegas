import { getScriptableInstance } from '../../methods/VariableDescriptorMethods';
import { SListDescriptor, SListInstance, SPlayer } from 'wegas-ts-api/src/generated/WegasScriptableEntities';

export class SListDescriptorImpl extends SListDescriptor {

  public getInstance(player: Readonly<SPlayer>): Readonly<SListInstance> {
    return getScriptableInstance<SListInstance>(this, player);
  }
}