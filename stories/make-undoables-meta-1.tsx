import React, { FC, useState, ReactNode } from 'react';
import {
  PayloadFromTo,
  useFlexibleUndo,
  makeHandler,
  makeUndoableHandler,
  makeUndoableFromToHandler,
} from '../.';
import { rootClass, uiContainerClass } from './styles';
import { ActionList } from './components/action-list';
import { NumberInput } from './components/number-input';

type Nullber = number | null;

interface PayloadByType {
  add: number;
  subtract: number;
  updateAmount: PayloadFromTo<Nullber>;
}

type PayloadDescribers = {
  [K in keyof PayloadByType]: (payload: PayloadByType[K]) => ReactNode;
};

const payloadDescribers: PayloadDescribers = {
  add: amount => `Increase count by ${amount}`,
  subtract: amount => `Decrease count by ${amount}`,
  updateAmount: ({ from, to }) => `Update amount from ${from} to ${to}`,
};

export const MakeUndoablesMeta1: FC = () => {
  const [count, setCount] = useState(0);
  const [amount, setAmount] = useState<Nullber>(1);

  const {
    makeUndoables,
    canUndo,
    undo,
    canRedo,
    redo,
    stack,
    timeTravel,
  } = useFlexibleUndo<PayloadByType>();

  const countHandler = makeHandler(setCount);
  const addHandler = countHandler(amount => prev => prev + amount);
  const subHandler = countHandler(amount => prev => prev - amount);

  const { add, subtract, updateAmount } = makeUndoables<PayloadByType>({
    add: {
      redo: addHandler,
      undo: subHandler,
    },
    subtract: {
      ...makeUndoableHandler(subHandler, addHandler),
    },
    updateAmount: {
      ...makeUndoableFromToHandler(setAmount),
    },
  });

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
        <button disabled={!amount} onClick={() => amount && add(amount)}>
          add
        </button>
        <button disabled={!amount} onClick={() => amount && subtract(amount)}>
          subtract
        </button>
        <button disabled={!canUndo} onClick={() => undo()}>
          undo
        </button>
        <button disabled={!canRedo} onClick={() => redo()}>
          redo
        </button>
      </div>
      <ActionList
        stack={stack}
        timeTravel={timeTravel}
        convert={action =>
          // TypeScript does not properly narrow the payload type
          payloadDescribers[action.type](action.payload as any)
        }
      />
    </div>
  );
};