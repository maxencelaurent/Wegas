import React, { PropTypes } from 'react';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

function SelectView(props) {
    const errorMessage = props.errorMessage.length ?
        props.errorMessage :
        undefined;
    const onChange = function onChange(event, index, value) {
        props.onChange(value);
    };
    const choices = props.view.choices || [];
    const menuItems = choices.map((o, i) => {
        if (typeof o !== 'object') {
            return (
                <MenuItem
                    key={i}
                    value={o}
                    primaryText={JSON.stringify(o)}
                />);
        }
        return (<MenuItem
            key={i}
            value={o.value}
            primaryText={o.label}
        />);
    });
    return (
        <div className={props.view.className}>
            <SelectField
                className={props.view.className}
                value={props.value}
                floatingLabelText={props.view.label || props.editKey}
                errorText={errorMessage}
                onChange={onChange}
                disabled={props.disabled}
                fullWidth
            >
                {menuItems}
            </SelectField>
        </div>
    );
}

SelectView.propTypes = {
    errorMessage: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func.isRequired,
    value: PropTypes.any,
    view: PropTypes.shape({
        label: PropTypes.string,
        className: PropTypes.string,
        choices: PropTypes.array
    }),
    editKey: PropTypes.string,
    disabled: PropTypes.bool,
    multiLine: PropTypes.bool
};

export default SelectView;