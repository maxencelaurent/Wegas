import * as React from 'react';
import { css } from 'emotion';
import { featuresCTX } from '../../../Components/Contexts/FeaturesProvider';

export interface LabeledView {
  label?: string;
  description?: string;
  index?: number;
}
interface LabeledProps extends LabeledView {
  children: (inputProps: {
    inputId: string;
    labelNode: JSX.Element;
  }) => React.ReactNode;
}
const titleStyle = css({
  '[title]': {
    display: 'inline-block',
    borderBottom: '1px dotted',
    marginBottom: '2px',
    cursor: 'help',
  },
});
let id = 0;

/** Handle view's label and description  */
export function Labeled({ label, children, description, index }: LabeledProps) {
  const internalId = React.useRef(`__labelInput__${id++}`);
  const { currentFeatures } = React.useContext(featuresCTX);

  return children({
    inputId: internalId.current,
    labelNode: (
      <label
        className={titleStyle}
        htmlFor={internalId.current}
        title={description}
      >
        {`${label ? label : ''} ${
          currentFeatures.includes('ADVANCED') && index != null
            ? `(${index})`
            : ''
        }`}
      </label>
    ),
  });
}
