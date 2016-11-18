import React, { PropTypes } from 'react';
import { types } from 'recast';

function singleStatement(Comp) {
    function SingleStatement(props) {
        const { code, onChange } = props;
        const stmt = code[0] || types.builders.emptyStatement();
        return (
            <Comp
                {...props}
                node={stmt}
                onChange={v => onChange([types.builders.expressionStatement(v)])}
            />
        );
    }
    SingleStatement.propTypes = {
        code: PropTypes.array,
        onChange: PropTypes.func
    };
    return SingleStatement;
}
export default singleStatement;
