import { cx } from 'emotion';
import * as React from 'react';
import { FlowChart, Processes } from '../Components/FlowChart';
import { flex, flexColumn } from '../css/classes';

const testProcesses: Processes = {
  '1': {
    position: { x: 50, y: 50 },
    attachedTo: ['2'],
  },
  '2': {
    position: { x: 250, y: 250 },
    attachedTo: [],
  },
};

export default function FlowChartTester() {
  const [state, setState] = React.useState(testProcesses);

  return (
    <div className={cx(flex, flexColumn)}>
      <FlowChart
        title="Test flow chart"
        processes={state}
        onChange={processes => {
          setState(processes);
        }}
      />
      <div>{JSON.stringify(state)}</div>
    </div>
  );
}
