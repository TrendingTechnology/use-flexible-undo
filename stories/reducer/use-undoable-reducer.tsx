import React, { FC } from 'react';
import {
  useFlexibleUndo,
  makeUndoableReducer,
  PayloadFromTo,
  useUndoableReducer,
  makeUndoableFTObjHandler,
  UpdaterMaker,
  Updater,
  makeUndoableStateDepHandler,
  invertHandlers,
  merge,
} from '../../.';
import { ActionList } from '../components/action-list';
import { uiContainerClass, rootClass } from '../styles';
import { NumberInput } from '../components/number-input';

type Nullber = number | null;

interface State {
  count: number;
  amount: Nullber;
}

interface PayloadByType {
  add: void;
  subtract: void;
  updateAmount: PayloadFromTo<Nullber>;
}

const makeCountHandler = (um: UpdaterMaker<number>) => (): Updater<
  State
> => prev =>
  prev.amount ? { ...prev, count: um(prev.amount)(prev.count) } : prev;

const undoableAddHandler = makeUndoableStateDepHandler(makeCountHandler)(
  amount => prev => prev + amount,
  amount => prev => prev - amount
);

const { reducer, actionCreators } = makeUndoableReducer<State, PayloadByType>({
  add: undoableAddHandler,
  subtract: invertHandlers(undoableAddHandler),
  updateAmount: makeUndoableFTObjHandler(amount => merge({ amount })),
});

export const UseUndoableReducer: FC = () => {
  const {
    state: { count, amount },
    boundActionCreators,
  } = useUndoableReducer(
    reducer,
    {
      count: 0,
      amount: 1,
    },
    actionCreators
  );

  const {
    makeUndoables,
    canUndo,
    undo,
    canRedo,
    redo,
    stack,
    timeTravel,
  } = useFlexibleUndo();

  const { add, subtract, updateAmount } = makeUndoables<PayloadByType>(
    boundActionCreators
  );

  return (
    <div className={rootClass}>
      <div>count = {count}</div>
      <div className={uiContainerClass}>
        <label>
          amount:&nbsp;
          <NumberInput
            value={amount}
            onChange={value =>
              updateAmount({
                from: amount,
                to: value,
              })
            }
          />
        </label>
        <button disabled={!amount} onClick={() => add()}>
          add
        </button>
        <button disabled={!amount} onClick={() => subtract()}>
          subtract
        </button>
        <button disabled={!canUndo} onClick={() => undo()}>
          undo
        </button>
        <button disabled={!canRedo} onClick={() => redo()}>
          redo
        </button>
      </div>
      <ActionList stack={stack} timeTravel={timeTravel} />
    </div>
  );
};
