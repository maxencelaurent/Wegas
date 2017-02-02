import React, { PropTypes } from 'react';
import Select from '../select';
import { getY } from '../../index';

function optionNameToString(result, name) {
    const separator = (name) ? name.separator || ',' : ',';
    if (!name || !name.values || name.values.length <= 0) {
        return ['undefined'];
    }
    return name.values.map(v => result.get(v)).join(separator);
}
function EntityArrayFieldSelect(props) {
    const Y = getY();
    const { field, returnAttr, scope, entity, name, ...restView } = props.view;
    const computedEntity = entity ?
        Y.Wegas.Facade.Variable.cache.find('name', entity) :
        Y.Plugin.EditEntityAction.currentEntity;
    let results;
    if (scope !== 'instance') {
        results = computedEntity.get(field);
    } else {
        results = computedEntity.getInstance().get(field);
    }
    const choices = results.map(r => ({
        value: r.get(returnAttr || 'name'),
        label: r.getEditorLabel() || optionNameToString(r, name)
    }));
    return (
        <Select {...props} view={{ ...restView, choices }} />
    );
}

EntityArrayFieldSelect.propTypes = {
    view: PropTypes.shape({
        field: PropTypes.string.isRequired,
        returnAttr: PropTypes.string.isRequired,
        scope: PropTypes.oneOf(['instance']),
        entity: PropTypes.string,
        name: PropTypes.shape({
            values: PropTypes.arrayOf(PropTypes.string),
            separator: PropTypes.string
        })
    }).isRequired
};
export default EntityArrayFieldSelect;