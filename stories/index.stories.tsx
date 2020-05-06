import React from 'react';
import { storiesOf } from '@storybook/react';

import './basics/basics.index';
import './utilities/utilities.index';
import './dependent-state/dependent-state.index';
import './reducer/reducer.index';
import './time-travel/time-travel.index';
import './meta-actions/meta-actions.index';
//
import { NoPayloadLight } from './light/no-payload-light';
import { NoPayload2Light } from './light/no-payload-2-light';

storiesOf('useFlexibleUndoLight', module)
  //@ts-ignore
  .addParameters({ options: { theme: {} } })
  .add('dependent state: WRONG', () => <NoPayloadLight />, {
    // readme: {
    //   content: MakeUndoablesUtilsIntro,
    //   sidebar: MakeUndoablesUtilsReadme,
    // },
  })
  .add('dependent state: RIGHT', () => <NoPayload2Light />, {
    // readme: {
    //   content: MakeUndoablesUtilsIntro,
    //   sidebar: MakeUndoablesUtilsReadme,
    // },
  });
